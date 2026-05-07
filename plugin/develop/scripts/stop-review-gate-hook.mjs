#!/usr/bin/env node

// Stop hook — runner stop-review gate.
//
// Fires whenever a Claude Code turn ends. The runner pipeline arms the gate
// from inside a plan-state JSON file the moment a plan agent dispatches; this
// hook consumes those armed states one at a time, runs Codex over the new
// commits, and writes the verdict back into the same plan-state.
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
// We never reach into the agent's prompt or description. The runner skill
// sets `stop_review.armed = true` itself, so this hook only needs to know
// "which plan-states are armed right now" — exactly the question the
// session pointers answer.

import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runAppServerTurn } from "./lib/codex.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import {
  getStopReviewThreadId,
  listActivePlanStates,
  loadSessionStrict,
  removeActivePlanState,
  setStopReviewThreadId,
} from "./lib/sessions.mjs";
import { listJobs } from "./lib/state.mjs";
import { sortJobsNewestFirst } from "./lib/job-control.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import {
  collectBlockReview,
  collectInformationalReview,
} from "./lib/review-collector.mjs";
import { recordHookEvent } from "./lib/telemetry.mjs";
import { STOP_REVIEW_OUTCOME } from "./lib/stop-review-outcome.mjs";
import {
  STATUS,
  clearPlanBlockStreak,
  loadState,
  recordPlanBlock,
  saveState,
  setLastReviewedCommit,
  setStopReviewArmed,
  transitionStatus,
  tryLoadState,
} from "./lib/runner-state.mjs";

const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const SAME_BLOCK_ESCALATION_THRESHOLD = 3;
const CONFIDENCE_THRESHOLD = 7;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// Well-known SHA for an empty tree — used when HEAD has no parent (first commit).
const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf899d15006ef9a21";

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error("ETIMEDOUT");
        err.code = "ETIMEDOUT";
        reject(err);
      }, ms);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

function readHookInput() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
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
//
// Look up every plan-state currently registered with the session and load the
// armed ones. Stale pointers (file removed manually, or status flipped to a
// terminal state in another session) are pruned in place so the next run
// starts clean.

function loadArmedPlanStates(sessionId) {
  if (!sessionId) return [];
  const ptrs = listActivePlanStates(sessionId);
  const armed = [];
  for (const ptr of ptrs) {
    const abs = path.isAbsolute(ptr) ? ptr : path.resolve(process.cwd(), ptr);
    const state = tryLoadState(abs);
    if (!state) {
      // Pointer points to nothing — quietly clean up and move on.
      removeActivePlanState(sessionId, ptr);
      continue;
    }
    if (state.status === STATUS.MERGED) {
      // Plan finished elsewhere; drop the pointer.
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
// Diff collection (per armed plan)
// ---------------------------------------------------------------------------

function collectDiffForPlan({ statePath, state }) {
  const wtPath = state.worktree_path;
  if (!wtPath || !fs.existsSync(wtPath)) {
    return null;
  }

  const headResult = spawnSync("git", ["-C", wtPath, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (headResult.status !== 0) return null;
  const headSha = headResult.stdout.trim();

  // Skip if HEAD has not advanced since the last review on this plan.
  const lastReviewed = state.stop_review.last_reviewed_commit;
  if (lastReviewed && lastReviewed === headSha) {
    return null;
  }

  let diffBase;
  if (lastReviewed && isValidCommit(wtPath, lastReviewed)) {
    diffBase = lastReviewed;
  } else {
    const parentCheck = spawnSync(
      "git",
      ["-C", wtPath, "rev-parse", "--verify", "HEAD~1"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    diffBase = parentCheck.status === 0 ? "HEAD~1" : EMPTY_TREE_SHA;
  }

  const diffResult = spawnSync("git", ["-C", wtPath, "diff", `${diffBase}..HEAD`], {
    encoding: "utf8",
  });
  if (!diffResult.stdout || !diffResult.stdout.trim()) {
    return null;
  }

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
// Confidence partitioning + parsing (carried over from the previous hook)
// ---------------------------------------------------------------------------

function partitionFindingsByConfidence(text) {
  const lines = text.split(/\r?\n/);
  const confRe = /\[conf\s+(\d+)\]/i;
  const highFindings = [];
  const lowFindings = [];
  let taggedCount = 0;
  for (const line of lines) {
    const match = line.match(confRe);
    if (!match) continue;
    taggedCount += 1;
    const confidence = Number(match[1]);
    if (confidence >= CONFIDENCE_THRESHOLD) {
      highFindings.push(line);
    } else {
      lowFindings.push(line);
    }
  }
  return { highFindings, lowFindings, taggedCount };
}

function diagnoseCodexFailure(result) {
  const errorMessage = String(result?.error?.message ?? result?.error ?? "").trim();
  const stderrText = String(result?.stderr ?? "").trim();
  const combined = `${errorMessage}\n${stderrText}`;
  if (!errorMessage && !stderrText) return null;
  if (/requires? a newer version of (?:the )?(?:Codex|app|CLI)|please upgrade.*Codex|newer version of Codex/i.test(combined)) {
    const detail = errorMessage || stderrText.split(/\r?\n/).find((l) => l.includes("requires")) || stderrText.split(/\r?\n/, 1)[0];
    return [
      "Codex CLI 버전이 OpenAI 서버가 요구하는 모델 버전보다 낮습니다.",
      "다음 명령으로 업그레이드 후 다시 시도하세요:",
      "",
      "    npm i -g @openai/codex@latest",
      "",
      `원본 에러: ${detail}`,
    ].join("\n");
  }
  if (errorMessage) {
    return `Codex 측 에러로 리뷰가 완료되지 않았습니다: ${errorMessage}`;
  }
  return null;
}

function parseStopReviewOutput(rawOutput) {
  const text = String(rawOutput ?? "").trim();
  if (!text) {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task returned no final output. Run /codex:review --wait manually or bypass the gate.",
      details: null,
    };
  }
  const firstLine = text.split(/\r?\n/, 1)[0].trim();
  if (firstLine.startsWith("ALLOW:")) {
    return { ok: true, reason: null, details: null };
  }
  if (firstLine.startsWith("BLOCK:")) {
    const { highFindings, lowFindings, taggedCount } = partitionFindingsByConfidence(text);
    if (taggedCount === 0) {
      return { ok: false, reason: text, details: text };
    }
    if (highFindings.length === 0) {
      return { ok: true, reason: null, details: null, suppressedNote: text };
    }
    const header = firstLine;
    const filteredReason = [header, "", ...highFindings]
      .concat(
        lowFindings.length > 0 ? ["", `(Low-confidence findings suppressed: ${lowFindings.length})`] : [],
      )
      .join("\n");
    return {
      ok: false,
      reason: filteredReason,
      details: text,
      suppressedNote: lowFindings.length > 0 ? text : null,
    };
  }
  return {
    ok: false,
    reason: "The stop-time Codex review task returned an unexpected answer. Run /codex:review --wait manually or bypass the gate.",
    details: null,
  };
}

// ---------------------------------------------------------------------------
// Codex turn
// ---------------------------------------------------------------------------

async function runStopReview(workspaceRoot, sessionId, reviewItem) {
  const prompt = buildStopReviewPrompt(reviewItem);
  const existingThreadId = sessionId ? getStopReviewThreadId(sessionId) : null;
  const turnCwd = workspaceRoot || process.cwd();
  const turnOptions = { prompt, sandbox: "read-only", persistThread: true };

  const totalStart = Date.now();
  let finalPath = "unknown";

  try {
    let result;
    if (existingThreadId) {
      const resumeStart = Date.now();
      try {
        result = await withTimeout(
          runAppServerTurn(turnCwd, { ...turnOptions, resumeThreadId: existingThreadId }),
          STOP_REVIEW_TIMEOUT_MS,
        );
        recordHookEvent({ kind: "stop_review_codex", step: "resume", ok: true, elapsedMs: Date.now() - resumeStart, threadId: existingThreadId, sessionId });
        finalPath = "resume";
      } catch (err) {
        const errCode = err?.code ?? null;
        const errMessage = err?.message ?? String(err);
        recordHookEvent({ kind: "stop_review_codex", step: "resume", ok: false, elapsedMs: Date.now() - resumeStart, threadId: existingThreadId, errorCode: errCode, errorMessage: errMessage, sessionId });
        if (errCode === "ETIMEDOUT") throw err;
        logNote(`[stop-gate] Codex resume failed (${errCode ?? "unknown"}): ${errMessage}. Falling back to fresh thread.`);
        const freshStart = Date.now();
        result = await withTimeout(runAppServerTurn(turnCwd, turnOptions), STOP_REVIEW_TIMEOUT_MS);
        recordHookEvent({ kind: "stop_review_codex", step: "fresh_fallback", ok: true, elapsedMs: Date.now() - freshStart, sessionId });
        finalPath = "fresh_fallback";
      }
    } else {
      const coldStart = Date.now();
      result = await withTimeout(runAppServerTurn(turnCwd, turnOptions), STOP_REVIEW_TIMEOUT_MS);
      recordHookEvent({ kind: "stop_review_codex", step: "fresh", ok: true, elapsedMs: Date.now() - coldStart, sessionId });
      finalPath = "fresh";
    }

    if (sessionId && result.threadId) {
      setStopReviewThreadId(sessionId, result.threadId);
    }

    recordHookEvent({ kind: "stop_review_codex", step: "total", ok: true, elapsedMs: Date.now() - totalStart, path: finalPath, sessionId });

    const finalText = String(result.finalMessage ?? "").trim();
    if (!finalText) {
      const diagnosed = diagnoseCodexFailure(result);
      if (diagnosed) return { ok: false, reason: diagnosed, details: null };
    }
    return parseStopReviewOutput(result.finalMessage);
  } catch (error) {
    recordHookEvent({ kind: "stop_review_codex", step: "total", ok: false, elapsedMs: Date.now() - totalStart, path: finalPath, errorCode: error?.code ?? null, errorMessage: error?.message ?? String(error), sessionId });
    if (error.code === "ETIMEDOUT") {
      return { ok: false, reason: "The stop-time Codex review task timed out after 15 minutes. Run /codex:review --wait manually or bypass the gate." };
    }
    const errText = error instanceof Error ? error.message : String(error);
    const isMissingCodex =
      error?.code === "ENOENT" ||
      /\bcodex\b.*not (?:recognized|found)|command not found.*codex|ENOENT/i.test(errText);
    if (isMissingCodex) {
      logNote("[stop-gate] Codex CLI unavailable — skipping stop-time review.");
      return { ok: true, skipped: true, reason: null };
    }
    return {
      ok: false,
      reason: errText
        ? `The stop-time Codex review task failed: ${errText}`
        : "The stop-time Codex review task failed. Run /codex:review --wait manually or bypass the gate.",
    };
  }
}

// ---------------------------------------------------------------------------
// Verdict handling — write back to plan-state
// ---------------------------------------------------------------------------

function classifyOutcome(review) {
  if (review.skipped) return STOP_REVIEW_OUTCOME.SKIPPED;
  if (!review.ok) return STOP_REVIEW_OUTCOME.BLOCK;
  if (review.suppressedNote) return STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED;
  return STOP_REVIEW_OUTCOME.ALLOW;
}

function persistReviewArtifacts(outcome, review, reviewItem, workspaceRoot) {
  if (
    outcome !== STOP_REVIEW_OUTCOME.BLOCK &&
    outcome !== STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED
  ) {
    return;
  }
  try {
    if (outcome === STOP_REVIEW_OUTCOME.BLOCK) {
      collectBlockReview(workspaceRoot, {
        branch: reviewItem.branch,
        headSha: reviewItem.headSha,
        reason: review.reason,
        details: review.details,
        diff: reviewItem.diff,
      });
    }
    if (review.suppressedNote) {
      collectInformationalReview(workspaceRoot, {
        branch: reviewItem.branch,
        headSha: reviewItem.headSha,
        note: review.suppressedNote,
        diff: reviewItem.diff,
      });
    }
  } catch {
    // best-effort — never block the gate decision on persistence failure.
  }
}

// Build the "[plan-runner: replay <state-path>]" directive that the runner
// skill consumes on the next turn. The skill reads the state file at that
// path and re-dispatches the plan agent against the current BLOCK reason.
function buildPlannerBlockDirective(reviewItem) {
  const planTag = `replay ${reviewItem.statePath}`;
  return [
    "",
    "---",
    `[plan-runner: ${planTag}] 아래 순서로 검증 후 행동:`,
    "1. 현재 plan 범위 밖 이슈 또는 테스트파일 관련 이슈 → 폐기",
    "2. 남은 이슈가 실제로 코드에 존재하는지 직접 확인 → 사실과 다르면 폐기",
    `3. 유효 이슈가 남으면 → 위 state 파일을 읽어 owner_agent와 worktree_path를 확인하고 같은 plan 에이전트를 재디스패치, 커밋 후 턴 종료`,
    "4. 모두 폐기되면 → 재디스패치 없이 그냥 턴 종료 (다음 stop-gate에서 ALLOW)",
  ].join("\n");
}

function emitReviewLog({ outcome, branch, headSha, reason, runningTaskNote }) {
  if (outcome === STOP_REVIEW_OUTCOME.SKIPPED) {
    if (runningTaskNote) process.stderr.write(`${runningTaskNote}\n`);
    return;
  }
  const tag = {
    [STOP_REVIEW_OUTCOME.ALLOW]: "[stop-gate] ALLOW",
    [STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED]: "[stop-gate] ALLOW (저신뢰 BLOCK 다운그레이드 — .codex/reviews/ 참고)",
    [STOP_REVIEW_OUTCOME.BLOCK]: "[stop-gate] BLOCK",
  }[outcome] ?? "[stop-gate]";
  const shortSha = headSha ? String(headSha).slice(0, 7) : "?";
  const lines = [`${tag} — ${branch ?? "?"}@${shortSha}`];
  if (outcome === STOP_REVIEW_OUTCOME.BLOCK && reason) {
    lines.push("", reason);
  }
  if (runningTaskNote) {
    lines.push("", runningTaskNote);
  }
  process.stderr.write(lines.join("\n") + "\n");
}

// Apply the verdict to the plan-state and return any extra text (escalation
// notes, planner directive) that needs to ride along with the BLOCK reason.
function applyVerdictToPlanState(reviewItem, outcome, review) {
  const { state, statePath } = reviewItem;
  let plannerDirective = "";
  let escalationNote = "";

  if (
    outcome === STOP_REVIEW_OUTCOME.ALLOW ||
    outcome === STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED ||
    outcome === STOP_REVIEW_OUTCOME.SKIPPED
  ) {
    setStopReviewArmed(state, false);
    // last_result is a user-visible log label, not the outcome enum — keep
    // the historical "ALLOW" / "skipped" casing the plan-state JSON has
    // always recorded.
    setLastReviewedCommit(
      state,
      reviewItem.headSha,
      outcome === STOP_REVIEW_OUTCOME.SKIPPED ? "skipped" : "ALLOW",
    );
    clearPlanBlockStreak(state);
    // Move forward only from the canonical post-stop-review states. Other
    // statuses keep their position so we do not accidentally rewind a plan
    // that already advanced (e.g. mid-rework).
    if (
      state.status === STATUS.AWAITING_STOP_REVIEW ||
      state.status === STATUS.STOP_REVIEW_BLOCKED
    ) {
      transitionStatus(state, STATUS.AWAITING_DEV_REVIEW);
    }
  } else if (outcome === STOP_REVIEW_OUTCOME.BLOCK) {
    // BLOCK leaves the gate armed so the next plan-agent dispatch's commits
    // get reviewed again. The runner skill is responsible for that dispatch
    // — we just record the block_history entry and emit the directive.
    setLastReviewedCommit(state, reviewItem.headSha, "BLOCK");
    const { count } = recordPlanBlock(state, review.reason);
    if (state.status === STATUS.AWAITING_STOP_REVIEW) {
      transitionStatus(state, STATUS.STOP_REVIEW_BLOCKED);
    }
    plannerDirective = buildPlannerBlockDirective(reviewItem);
    if (count >= SAME_BLOCK_ESCALATION_THRESHOLD) {
      escalationNote = [
        "",
        "---",
        `[escalation] 같은 이슈로 ${count}회 연속 BLOCK되었습니다. 자동 재디스패치만으로는 해결되지 않을 가능성이 큽니다.`,
        "다음 중 하나를 선택하세요:",
        "  1) 사용자(사람)가 직접 원인을 진단 — 코드/테스트/plan을 재검토",
        "  2) 해당 phase의 기대 동작(plan 또는 phase 파일)을 수정",
        "  3) 현재 worktree를 폐기하고 처음부터 다시 시작",
      ].join("\n");
    }
  }

  saveState(statePath, state);
  return { plannerDirective, escalationNote };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;

  // Resolve the session JSON. Three outcomes:
  //   - missing: no /runner has registered a plan yet — skip silently. Letting
  //     the turn end as ALLOW is the right call because there is nothing armed.
  //   - corrupt: the file exists but failed to parse. Treat this as a loud gate
  //     failure: emit an explicit BLOCK so an operational failure (disk error,
  //     manual edit gone wrong) cannot silently bypass stop-review. ALLOW-by-
  //     omission is the worst possible mode here.
  //   - ok: continue.
  if (sessionId) {
    const probe = loadSessionStrict(sessionId);
    if (probe.status === "missing") {
      return;
    }
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
    // probe.session is parsed but we only need the sessionId from here on —
    // listActivePlanStates / loadArmedPlanStates re-read the file as needed.
  }

  const armed = loadArmedPlanStates(sessionId);
  if (armed.length === 0) {
    return;
  }

  // Build review items only for plans whose worktree actually has new commits.
  const reviewItems = [];
  for (const item of armed) {
    const r = collectDiffForPlan(item);
    if (r) reviewItems.push(r);
  }
  if (reviewItems.length === 0) {
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot(cwd);

  // Job-running note (informational only).
  const jobs = sortJobsNewestFirst(
    listJobs(workspaceRoot).filter((job) => !sessionId || job.sessionId === sessionId),
  );
  const runningJob = jobs.find((job) => job.status === "queued" || job.status === "running");
  const runningTaskNote = runningJob
    ? `Codex task ${runningJob.id} is still running. Check /codex:status and use /codex:cancel ${runningJob.id} if you want to stop it before ending the session.`
    : null;

  // Run reviews sequentially so Codex thread reuse stays sound and stderr
  // output is interleaved cleanly. In practice there is almost always exactly
  // one armed plan per turn.
  let blockedReviewItem = null;
  let blockedReason = null;
  let blockedExtras = "";

  for (const item of reviewItems) {
    const review = await runStopReview(workspaceRoot, sessionId, item);
    const outcome = classifyOutcome(review);

    persistReviewArtifacts(outcome, review, item, workspaceRoot);
    const { plannerDirective, escalationNote } = applyVerdictToPlanState(item, outcome, review);

    emitReviewLog({
      outcome,
      branch: item.branch,
      headSha: item.headSha,
      reason: review.reason,
      runningTaskNote,
    });

    if (outcome === STOP_REVIEW_OUTCOME.BLOCK && !blockedReviewItem) {
      blockedReviewItem = item;
      blockedReason = (review.reason || "") + plannerDirective + escalationNote;
    }
  }

  // Emit terminal signal: BLOCK halts the next turn with a reason; ALLOW /
  // downgraded ALLOW emits a systemMessage so the user sees the verdict
  // (Claude Code swallows stderr from a Stop hook that exits 0 silently).
  if (blockedReviewItem) {
    emitDecision({
      decision: "block",
      reason: runningTaskNote ? `${runningTaskNote} ${blockedReason}` : blockedReason,
    });
    return;
  }

  // No BLOCK — surface a systemMessage describing the latest reviewed plan.
  const last = reviewItems[reviewItems.length - 1];
  const shortSha = last.headSha ? String(last.headSha).slice(0, 7) : "?";
  const tag = "[stop-gate] ALLOW";
  const systemMessage = runningTaskNote
    ? `${tag} — ${last.branch ?? "?"}@${shortSha}\n\n${runningTaskNote}`
    : `${tag} — ${last.branch ?? "?"}@${shortSha}`;
  emitDecision({ systemMessage });
}

main();
