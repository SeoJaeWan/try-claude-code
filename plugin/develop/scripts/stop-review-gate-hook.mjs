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
//   plans/**/.runner-state.json  ← plan-scoped SSOT. Globbed from {repo}/plans
//     stop_review.armed          ← `arm-for-dispatch` sets this
//     stop_review.last_reviewed_commit
//     stop_review.block_history
//     status                     ← we move this on ALLOW / BLOCK
//
//   sessions/{sid}.json          ← optional session-scoped cache. Holds the
//     stopReviewThreadId            Codex thread id so warm-thread review
//                                   stays fast across turns. Plan pointers
//                                   used to live here too but the Stop hook
//                                   no longer reads them — disk SSOT is the
//                                   only authoritative source.
//                                   The session file is only inspected when
//                                   armed plans exist on disk —
//                                   runner-unrelated turns short-circuit
//                                   before touching it.
//
// All Codex operational logic (thread reuse, broker recovery, error
// diagnosis, confidence parsing, ENOENT→SKIPPED) lives in lib/codex.mjs#review.
// The hook only chooses between the returned outcomes.

import fs from "node:fs";
import os from "node:os";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { review } from "./lib/codex.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import {
  getStopReviewThreadId,
  loadSessionStrict,
  setStopReviewThreadId,
} from "./lib/sessions.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import { readHookInput } from "./lib/hook-input.mjs";
import { STOP_REVIEW_OUTCOME } from "./lib/stop-review-outcome.mjs";
import { STATUS, tryLoadState } from "./lib/runner-state.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RUNNER_STATE_CLI = path.resolve(SCRIPT_DIR, "runner-state-cli.mjs");

// Invoke runner-state-cli to apply a stop-review verdict. Returns
// { ok, stdout, stderr } so the caller can concatenate CLI output (planner
// directive + escalation note) onto the BLOCK reason. On non-zero exit we
// emit a systemMessage and leave the plan-state untouched — the gate stays
// armed and the next Stop hook firing re-runs review against the same diff.
function runRecordCli(args) {
  const result = spawnSync("node", [RUNNER_STATE_CLI, ...args], { encoding: "utf8" });
  return {
    ok: result.status === 0 && !result.error,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
    error: result.error,
  };
}

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

// Find every armed plan state on disk under {repo}/plans/. Disk is the ground
// truth — `sessions/{sid}.json.activePlanStates` was previously used here but
// is now a soft cache that the rest of the runner pipeline maintains for
// fast-path UX. Reading session.json as the gate caused silent stalls when
// any link in the hook chain broke (UserPromptSubmit not firing, plugin
// updates between turns, manual bootstrap with a placeholder session id, ...).
// Globbing plans/**/.runner-state.json takes well under 10ms even on repos
// with hundreds of plans, and survives all the failure modes that broke
// session.json. See docs/runner/enforcement.md "What the runner explicitly
// does not do" for the design.
function findArmedPlansOnDisk(cwd, sessionId) {
  const repoRoot = resolveRepoRoot(cwd);
  if (!repoRoot) return [];
  const plansDir = path.join(repoRoot, "plans");
  if (!fs.existsSync(plansDir)) return [];

  const armed = [];
  for (const file of walkRunnerStateFiles(plansDir)) {
    const state = tryLoadState(file);
    if (!state) continue;
    if (state.status === STATUS.MERGED) continue;
    if (!state.stop_review?.armed) continue;
    // Multi-session isolation: when state.session_id is set, only the owning
    // session's Stop hook reviews it. Plans authored before session_id was
    // recorded (or via the manual-bootstrap path that uses a placeholder)
    // fall through here unconditionally so the gate can still close them.
    if (state.session_id && sessionId && state.session_id !== sessionId) continue;
    armed.push({ statePath: file, state });
  }
  return armed;
}

function resolveRepoRoot(cwd) {
  const result = spawnSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

// Walk plans/ recursively yielding every `.runner-state.json` file. Plain
// recursion avoids pulling in a glob dependency for one call site.
function* walkRunnerStateFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkRunnerStateFiles(full);
    } else if (entry.isFile() && entry.name === ".runner-state.json") {
      yield full;
    }
  }
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

  // Short-circuit when there is nothing to gate. Disk SSOT
  // (plans/**/.runner-state.json) is the authoritative trigger; if no plan
  // is armed, the Stop hook has no business touching the session cache or
  // spawning Codex. This keeps runner-unrelated turns silent even when the
  // session.json file happens to be corrupt or missing.
  const armed = findArmedPlansOnDisk(cwd, sessionId);
  if (armed.length === 0) return;

  // session.json corruption is still a hard stop, but only when we actually
  // need to consult it — a corrupt file likely indicates a half-written save
  // and we should not silently overwrite it (the user needs to inspect or
  // delete). Missing is fine: getStopReviewThreadId returns null and Codex
  // starts cold.
  if (sessionId) {
    const probe = loadSessionStrict(sessionId);
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
        const last = history[history.length - 1];
        const excerpt = last?.reason_excerpt ?? "(사유 기록 없음)";
        return [
          `[stop-gate] BLOCK 상태 유지 — ${slug}@${branch}@${head}`,
          `  마지막 BLOCK 사유: ${excerpt}`,
        ].join("\n");
      });
      lines.push(
        "",
        "재디스패치가 새 commit을 만들지 못한 상태입니다. plan 에이전트를",
        "다시 부르거나, 사용자가 직접 개입해야 합니다. state는",
        "STOP_REVIEW_BLOCKED 그대로 유지됩니다.",
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
  const recordFailures = [];

  for (const item of reviewItems) {
    const result = await review({
      prompt: buildStopReviewPrompt(item),
      threadId: sessionId ? getStopReviewThreadId(sessionId) : null,
      cwd: workspaceRoot,
    });

    if (sessionId && result.threadId) {
      setStopReviewThreadId(sessionId, result.threadId);
    }

    // Apply the verdict by spawning runner-state-cli. All plan-state mutation
    // lives in the CLI now — the hook never calls saveState directly.
    let cliRun = { ok: true, stdout: "" };
    if (
      result.outcome === STOP_REVIEW_OUTCOME.ALLOW ||
      result.outcome === STOP_REVIEW_OUTCOME.SKIPPED
    ) {
      cliRun = runRecordCli([
        "record-stop-review-allow",
        item.statePath,
        item.headSha,
      ]);
    } else if (result.outcome === STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED) {
      cliRun = runRecordCli([
        "record-stop-review-downgrade",
        item.statePath,
        item.headSha,
      ]);
      if (cliRun.ok && cliRun.stdout.trim()) {
        downgradeWarnings.push(cliRun.stdout.trim());
      }
    } else if (result.outcome === STOP_REVIEW_OUTCOME.BLOCK) {
      const reasonFile = path.join(
        os.tmpdir(),
        `stop-review-reason-${Date.now()}-${process.pid}.txt`,
      );
      try {
        fs.writeFileSync(reasonFile, result.reason ?? "", "utf8");
        cliRun = runRecordCli([
          "record-stop-review-block",
          item.statePath,
          item.headSha,
          reasonFile,
        ]);
      } finally {
        try { fs.unlinkSync(reasonFile); } catch { /* best-effort cleanup */ }
      }
    } else if (result.outcome === STOP_REVIEW_OUTCOME.TIMEOUT) {
      // No state mutation for TIMEOUT — the gate stays armed and we retry.
      timedOutItems.push({ item, reason: result.reason });
    }

    if (!cliRun.ok) {
      const exitTag = cliRun.error
        ? `spawn failed (${cliRun.error.code ?? cliRun.error.message})`
        : `exit ${cliRun.status}`;
      recordFailures.push({
        item,
        outcome: result.outcome,
        exitTag,
        stderr: cliRun.stderr,
      });
      // Skip the rest of the per-item handling — state is intact and the
      // next Stop firing will retry the same review.
      continue;
    }

    emitReviewLog({
      outcome: result.outcome,
      branch: item.branch,
      headSha: item.headSha,
      reason: result.reason,
    });

    if (result.outcome === STOP_REVIEW_OUTCOME.BLOCK && !blockedReviewItem) {
      blockedReviewItem = item;
      // CLI stdout carries the planner directive + escalation note.
      blockedReason = (result.reason || "") + (cliRun.stdout || "");
    }
  }

  if (recordFailures.length > 0) {
    const lines = recordFailures.map(({ item, outcome, exitTag, stderr }) => {
      const head = `[stop-gate] record-CLI 실행 실패 — ${item.branch ?? "?"}@${String(item.headSha ?? "").slice(0, 7)}`;
      return `${head}\n  outcome=${outcome}, ${exitTag}\n  ${(stderr || "").trim() || "(no stderr)"}`;
    });
    lines.push(
      "",
      "state는 변경되지 않았으며 다음 turn에 같은 review가 재시도됩니다.",
      "위 stderr 출력을 확인하고 runner-state-cli가 정상 실행되는지 점검해주세요.",
    );
    emitDecision({ systemMessage: lines.join("\n") });
    return;
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
