#!/usr/bin/env node

// Stop hook — runner stop-review gate.
//
// Fires whenever a Claude Code turn ends. The runner pipeline arms the gate
// from inside a plan-state JSON file the moment a plan agent dispatches; this
// hook consumes those armed states one at a time, runs Codex over the new
// commits via `codex.review()`, and writes the verdict back into the same
// plan-state.
//
// Data flow:
//   sessions/{sid}.json          ← session-scoped (Codex thread reuse +
//                                  pointers to plan-state files)
//     stopReviewThreadId
//     activePlanStates: [...]    ─┐
//                                 │
//   plans/{slug}/.runner-state.json   ← plan-scoped SSOT (read+write here)
//     stop_review.armed
//     stop_review.last_reviewed_commit
//     stop_review.block_history
//     status                     ← we move this on ALLOW / BLOCK
//
// All Codex operational logic (thread reuse, broker recovery, error
// diagnosis, confidence parsing, ENOENT→SKIPPED) lives in lib/codex.mjs#review.
// The hook only chooses between the returned outcomes.

import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { review } from "./lib/codex.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import {
  getStopReviewThreadId,
  listActivePlanStates,
  loadSessionStrict,
  removeActivePlanState,
  setStopReviewThreadId,
} from "./lib/sessions.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import { readHookInput } from "./lib/hook-input.mjs";
import { STOP_REVIEW_OUTCOME } from "./lib/stop-review-outcome.mjs";
import { STATUS, tryLoadState } from "./lib/runner-state.mjs";
import { applyVerdictToPlanState } from "./lib/stop-review-verdict.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function emitDecision(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function logNote(message) {
  if (!message) return;
  process.stderr.write(`${message}\n`);
}

function isValidCommit(wtPath, sha) {
  const result = spawnSync("git", ["-C", wtPath, "cat-file", "-t", sha], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 && result.stdout.trim() === "commit";
}

// ---------------------------------------------------------------------------
// Plan-state loading
// ---------------------------------------------------------------------------

function loadArmedPlanStates(sessionId) {
  if (!sessionId) return [];
  const ptrs = listActivePlanStates(sessionId);
  const armed = [];
  for (const ptr of ptrs) {
    const abs = path.isAbsolute(ptr) ? ptr : path.resolve(process.cwd(), ptr);
    const state = tryLoadState(abs);
    if (!state) {
      removeActivePlanState(sessionId, ptr);
      continue;
    }
    if (state.status === STATUS.MERGED) {
      removeActivePlanState(sessionId, ptr);
      continue;
    }
    if (state.stop_review?.armed) {
      armed.push({ statePath: abs, state });
    }
  }
  return armed;
}

// ---------------------------------------------------------------------------
// Diff collection
// ---------------------------------------------------------------------------

function collectDiffForPlan({ statePath, state }) {
  const wtPath = state.worktree_path;
  if (!wtPath || !fs.existsSync(wtPath)) return null;

  const headResult = spawnSync("git", ["-C", wtPath, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (headResult.status !== 0) return null;
  const headSha = headResult.stdout.trim();

  const lastReviewed = state.stop_review.last_reviewed_commit;
  if (lastReviewed && lastReviewed === headSha) return null;

  // Determine the diff base. last_reviewed_commit takes precedence when it
  // still resolves; otherwise fall back to the worktree's branch point via
  // `git merge-base base_branch HEAD`. We deliberately do NOT use HEAD~1 or
  // the empty-tree SHA — both would mislabel base-branch commits as plan work
  // and cause the gate to ALLOW on a zero-commit plan.
  let diffBase;
  if (lastReviewed && isValidCommit(wtPath, lastReviewed)) {
    diffBase = lastReviewed;
  } else {
    const mbResult = spawnSync(
      "git",
      ["-C", wtPath, "merge-base", state.base_branch, "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    if (mbResult.status !== 0 || !mbResult.stdout.trim()) {
      logNote(
        `[stop-gate] merge-base ${state.base_branch}..HEAD failed inside ${wtPath}; ` +
        `cannot determine diff base safely — skipping review this turn.`,
      );
      return null;
    }
    diffBase = mbResult.stdout.trim();
  }

  if (diffBase === headSha) return null;

  const diffResult = spawnSync("git", ["-C", wtPath, "diff", `${diffBase}..HEAD`], {
    encoding: "utf8",
  });
  if (!diffResult.stdout || !diffResult.stdout.trim()) return null;

  const branchResult = spawnSync(
    "git",
    ["-C", wtPath, "rev-parse", "--abbrev-ref", "HEAD"],
    { encoding: "utf8" },
  );
  const logResult = spawnSync(
    "git",
    ["-C", wtPath, "log", "--oneline", `${diffBase}..HEAD`],
    { encoding: "utf8" },
  );

  return {
    statePath,
    state,
    path: wtPath,
    branch: (branchResult.stdout || "").trim() || state.task_branch || "unknown",
    diff: diffResult.stdout.trim(),
    headSha,
    commitMessages: (logResult.stdout || "").trim(),
  };
}

// ---------------------------------------------------------------------------
// Codex prompt
// ---------------------------------------------------------------------------

function buildStopReviewPrompt(reviewItem) {
  const template = loadPromptTemplate(path.resolve(SCRIPT_DIR, ".."), "stop-review-gate");

  const worktreeDiffsBlock = [
    `Worktree: ${reviewItem.path} (branch: ${reviewItem.branch})`,
    reviewItem.diff,
  ].join("\n");

  let planContextBlock = "";
  const planFile = reviewItem.state.plan_path;
  if (planFile) {
    try {
      const planContent = fs.readFileSync(planFile, "utf8");
      planContextBlock = `Current plan (${reviewItem.state.plan_slug}) detail:\n${planContent}`;
      logNote(`[stop-gate] loaded plan ${reviewItem.state.plan_slug} (${planContent.length} chars)`);
    } catch (err) {
      logNote(`[stop-gate] plan file read failed (${planFile}): ${err.message}`);
    }
  }

  const commitMessagesBlock = reviewItem.commitMessages
    ? `Commit messages in review range:\nBranch: ${reviewItem.branch}\n${reviewItem.commitMessages}`
    : "";

  return interpolateTemplate(template, {
    CLAUDE_RESPONSE_BLOCK: "",
    WORKTREE_DIFFS_BLOCK: worktreeDiffsBlock,
    PLAN_CONTEXT_BLOCK: planContextBlock,
    COMMIT_MESSAGES_BLOCK: commitMessagesBlock,
    WARNINGS_BLOCK: "",
  });
}

// ---------------------------------------------------------------------------
// Verdict log + emit
// ---------------------------------------------------------------------------

function emitReviewLog({ outcome, branch, headSha, reason }) {
  if (outcome === STOP_REVIEW_OUTCOME.SKIPPED) return;
  const tag = {
    [STOP_REVIEW_OUTCOME.ALLOW]: "[stop-gate] ALLOW",
    [STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED]: "[stop-gate] ALLOW (저신뢰 BLOCK 다운그레이드)",
    [STOP_REVIEW_OUTCOME.BLOCK]: "[stop-gate] BLOCK",
    [STOP_REVIEW_OUTCOME.TIMEOUT]: "[stop-gate] TIMEOUT (다음 턴에 자동 재시도)",
  }[outcome] ?? "[stop-gate]";
  const shortSha = headSha ? String(headSha).slice(0, 7) : "?";
  const lines = [`${tag} — ${branch ?? "?"}@${shortSha}`];
  if (
    (outcome === STOP_REVIEW_OUTCOME.BLOCK || outcome === STOP_REVIEW_OUTCOME.TIMEOUT) &&
    reason
  ) {
    lines.push("", reason);
  }
  process.stderr.write(lines.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { cwd, sessionId } = readHookInput({ tag: "stop-gate" });

  if (sessionId) {
    const probe = loadSessionStrict(sessionId);
    if (probe.status === "missing") return;
    if (probe.status === "corrupt") {
      emitDecision({
        decision: "block",
        reason:
          `[stop-gate] Session file ${probe.file} failed to parse ` +
          `(${probe.error?.message ?? "unknown error"}). ` +
          "Stop-review가 실행될 수 없으므로 게이트를 닫습니다. " +
          "세션 파일을 점검하거나 삭제 후 다시 시도해주세요.",
      });
      return;
    }
  }

  const armed = loadArmedPlanStates(sessionId);
  if (armed.length === 0) return;

  const reviewItems = [];
  const skipped = [];
  for (const item of armed) {
    const r = collectDiffForPlan(item);
    if (r) reviewItems.push(r);
    else skipped.push(item);
  }

  if (reviewItems.length === 0) {
    const stuck = skipped.filter(
      ({ state }) =>
        state.status === STATUS.DISPATCHING &&
        state.stop_review?.phase === "blocked",
    );
    if (stuck.length > 0) {
      const lines = stuck.map(({ state }) => {
        const slug = state.plan_slug ?? "?";
        const branch = state.task_branch ?? "?";
        const head = state.stop_review?.last_reviewed_commit
          ? String(state.stop_review.last_reviewed_commit).slice(0, 7)
          : "?";
        const history = Array.isArray(state.stop_review?.block_history)
          ? state.stop_review.block_history
          : [];
        const lastReal = [...history]
          .reverse()
          .find((h) => h && h.fingerprint !== "__allow__");
        const excerpt = lastReal?.reason_excerpt ?? "(사유 기록 없음)";
        return [
          `[stop-gate] BLOCK 상태 유지 — ${slug}@${branch}@${head}`,
          `  마지막 BLOCK 사유: ${excerpt}`,
        ].join("\n");
      });
      lines.push(
        "",
        "재디스패치가 새 commit을 만들지 못한 상태입니다. plan 에이전트를",
        "다시 부르거나, 같은 사유가 3회 누적되었다면 사용자가 직접 개입해야",
        "합니다. state는 STOP_REVIEW_BLOCKED 그대로 유지됩니다.",
      );
      emitDecision({ systemMessage: lines.join("\n") });
      return;
    }

    const empty = skipped.filter(
      ({ state }) =>
        state.status === STATUS.DISPATCHING &&
        state.stop_review?.phase === "armed" &&
        !state.stop_review?.last_reviewed_commit,
    );
    if (empty.length > 0) {
      const lines = empty.map(({ state }) => {
        const slug = state.plan_slug ?? "?";
        const branch = state.task_branch ?? "?";
        return `[stop-gate] dispatch됐지만 새 commit 없음 — ${slug}@${branch}`;
      });
      lines.push(
        "",
        "plan-agent가 commit을 만들기 전에 메인 세션이 턴을 끝낸 것으로 보입니다.",
        "에이전트가 조용히 실패한 것이라면 다시 dispatch 하세요. state는",
        "dispatching/armed 그대로 유지됩니다.",
      );
      emitDecision({ systemMessage: lines.join("\n") });
    }
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot(cwd);

  let blockedReviewItem = null;
  let blockedReason = null;
  const timedOutItems = [];
  const downgradeWarnings = [];

  for (const item of reviewItems) {
    const result = await review({
      prompt: buildStopReviewPrompt(item),
      threadId: sessionId ? getStopReviewThreadId(sessionId) : null,
      cwd: workspaceRoot,
    });

    if (sessionId && result.threadId) {
      setStopReviewThreadId(sessionId, result.threadId);
    }

    // applyVerdictToPlanState consumes the legacy review-result shape
    // ({ ok, reason, details, suppressedNote, timedOut, skipped }) so we
    // adapt the new outcome-string result here. Phase 4 will replace this
    // with a CLI call and the lib helper will go away entirely.
    const reviewLike = {
      ok:
        result.outcome === STOP_REVIEW_OUTCOME.ALLOW ||
        result.outcome === STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED ||
        result.outcome === STOP_REVIEW_OUTCOME.SKIPPED,
      reason: result.reason,
      details: result.raw,
      suppressedNote: result.suppressedNote,
      timedOut: result.outcome === STOP_REVIEW_OUTCOME.TIMEOUT,
      skipped: result.outcome === STOP_REVIEW_OUTCOME.SKIPPED,
    };
    const { plannerDirective, escalationNote, downgradeWarning } =
      applyVerdictToPlanState(item, result.outcome, reviewLike);

    emitReviewLog({
      outcome: result.outcome,
      branch: item.branch,
      headSha: item.headSha,
      reason: result.reason,
    });

    if (result.outcome === STOP_REVIEW_OUTCOME.BLOCK && !blockedReviewItem) {
      blockedReviewItem = item;
      blockedReason = (result.reason || "") + plannerDirective + escalationNote;
    }
    if (result.outcome === STOP_REVIEW_OUTCOME.TIMEOUT) {
      timedOutItems.push({ item, reason: result.reason });
    }
    if (downgradeWarning) {
      downgradeWarnings.push(downgradeWarning);
    }
  }

  if (blockedReviewItem) {
    emitDecision({ decision: "block", reason: blockedReason });
    return;
  }

  if (timedOutItems.length > 0) {
    const lines = timedOutItems.map(({ item, reason }) => {
      const shortSha = item.headSha ? String(item.headSha).slice(0, 7) : "?";
      const head = `[stop-gate] TIMEOUT — ${item.branch ?? "?"}@${shortSha}`;
      return reason ? `${head}\n${reason}` : head;
    });
    lines.push(
      "",
      "게이트는 armed 상태로 유지되며 다음 턴 종료 시 같은 diff를 다시 리뷰합니다.",
    );
    emitDecision({ systemMessage: lines.join("\n") });
    return;
  }

  const last = reviewItems[reviewItems.length - 1];
  const shortSha = last.headSha ? String(last.headSha).slice(0, 7) : "?";
  const parts = [`[stop-gate] ALLOW — ${last.branch ?? "?"}@${shortSha}`];
  if (downgradeWarnings.length > 0) parts.push(downgradeWarnings.join("\n"));
  emitDecision({ systemMessage: parts.join("\n") });
}

const invokedAsScript =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsScript) {
  main();
}
