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

import { listAvailableModels, runAppServerTurn } from "./lib/codex.mjs";
import { restartBrokerSession } from "./lib/broker-lifecycle.mjs";
import { terminateProcessTree } from "./lib/process.mjs";
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
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import {
  collectBlockReview,
  collectInformationalReview,
} from "./lib/review-collector.mjs";
import { readHookInput } from "./lib/hook-input.mjs";
import { STOP_REVIEW_OUTCOME } from "./lib/stop-review-outcome.mjs";
import {
  STATUS,
  loadState,
  tryLoadState,
} from "./lib/runner-state.mjs";
import { applyVerdictToPlanState } from "./lib/stop-review-verdict.mjs";

// 15 minutes. hooks.json sets the external Stop-hook timeout to 960s so this
// internal withTimeout always fires first — the 60-second margin prevents
// Claude Code from killing the process mid-applyVerdictToPlanState and
// leaving the plan-state armed with no systemMessage explaining why.
const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
// CONFIDENCE_THRESHOLD lives here because it shapes how Codex output is
// parsed (BLOCK vs ALLOW_DOWNGRADED classification). The downgrade-streak
// warning threshold and the BLOCK-streak escalation threshold both moved to
// lib/stop-review-verdict.mjs along with applyVerdictToPlanState.
const CONFIDENCE_THRESHOLD = 7;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

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

  // Determine the diff base. Priorities:
  //   1. last_reviewed_commit — incremental review since the previous ALLOW,
  //      provided that SHA still resolves inside the worktree.
  //   2. worktree branch point — the commit `git worktree add -b <task>
  //      <path> <base>` snapshotted. We resolve it on-the-fly via
  //      `git merge-base <base_branch> HEAD`; the merge-base of the task
  //      branch and the base branch is exactly that branching point and does
  //      not drift when the base branch advances afterwards.
  //
  // We deliberately do NOT fall back to `HEAD~1` or the empty-tree SHA: both
  // pretend the worktree's whole history is plan work and would treat the
  // base branch's last commit (or every base commit) as something to review.
  // That was the exact bug that drove a dev_reviewing-deadlock when the Stop
  // hook fired before the plan agent had committed anything — the base
  // branch's tip commit got reviewed as plan output, earned a clean ALLOW,
  // and walked the state to dev_reviewing with zero agent commits on the
  // branch. PreToolUse then blocked the late-arriving agent from writing
  // because status was already dev_reviewing.
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
      // Cannot resolve the branch point — usually because the base branch
      // was deleted or renamed since the worktree was created. Surface as
      // no-op and let the BLOCK-stuck / armed-empty reporter at the call
      // site explain what is going on instead of falling back to a wrong
      // diff base. Leaving the gate armed means the next turn re-tries.
      logNote(
        `[stop-gate] merge-base ${state.base_branch}..HEAD failed inside ${wtPath}; ` +
        `cannot determine diff base safely — skipping review this turn.`,
      );
      return null;
    }
    diffBase = mbResult.stdout.trim();
  }

  // No new commits since the branch point. The plan agent has not produced
  // any work yet (e.g. the main session ended its turn before the background
  // agent committed). Leave the gate armed and surface nothing here — the
  // armed-empty branch in main() decides whether to nudge the user.
  if (diffBase === headSha) {
    return null;
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

// Extract a model slug from the server error message, e.g.
//   "The 'gpt-5.5' model requires a newer version of Codex..."
//                ^^^^^^^
// Returns null if no quoted token precedes the word "model".
function extractModelSlugFromError(text) {
  const match = String(text ?? "").match(/['"]([^'"]+)['"]\s+model/i);
  return match ? match[1] : null;
}

// Match the failure signature that indicates the broker's long-lived codex
// child is operating on a stale models snapshot. OpenAI returns this exact
// wording when the codex client's advertised model list does not include the
// requested model; that list is built from the in-memory models cache the
// codex process loaded at spawn time. After a codex CLI upgrade or a models
// cache refresh, the running broker child still serves the pre-upgrade list
// until restarted.
export function matchesBrokerStaleModelSignature(result) {
  const finalText = String(result?.finalMessage ?? "").trim();
  if (finalText) return false;
  const errorMessage = String(result?.error?.message ?? result?.error ?? "").trim();
  const stderrText = String(result?.stderr ?? "").trim();
  const combined = `${errorMessage}\n${stderrText}`;
  if (!/invalid_request_error/i.test(combined)) return false;
  if (!/newer version of (?:the )?(?:Codex|app|CLI)/i.test(combined)) return false;
  return true;
}

// Confirm broker-codex staleness by asking the broker which models it
// currently knows about. The rejected model being absent from `model/list`
// is direct evidence that the broker's child is stale — empirically
// reproduced against the user's environment where the broker's codex (spawned
// before a models cache refresh) returned an old list missing gpt-5.5 while
// fresh-spawn codex returned a current list including it.
//
// Returns `{ confirmed: true, knownModels }` when the broker is confirmed
// stale, `{ confirmed: false, reason }` otherwise. We treat any inability
// to verify (model/list throws, slug cannot be extracted, model IS present)
// as "not confirmed" so the existing diagnostic message handles the failure
// instead of triggering a wrong recovery.
async function confirmStaleBroker(cwd, result) {
  if (!matchesBrokerStaleModelSignature(result)) {
    return { confirmed: false, reason: "signature_mismatch" };
  }
  const errorMessage = String(result?.error?.message ?? result?.error ?? "");
  const stderrText = String(result?.stderr ?? "");
  const rejectedModel = extractModelSlugFromError(errorMessage) || extractModelSlugFromError(stderrText);
  if (!rejectedModel) {
    return { confirmed: false, reason: "no_model_slug" };
  }
  let knownModels;
  try {
    knownModels = await listAvailableModels(cwd);
  } catch (err) {
    return { confirmed: false, reason: `model_list_failed:${err?.message ?? err}` };
  }
  if (knownModels.has(rejectedModel)) {
    return { confirmed: false, reason: "model_present_in_list", rejectedModel, knownModels };
  }
  return { confirmed: true, rejectedModel, knownModels };
}

function diagnoseCodexFailure(result) {
  const errorMessage = String(result?.error?.message ?? result?.error ?? "").trim();
  const stderrText = String(result?.stderr ?? "").trim();
  const combined = `${errorMessage}\n${stderrText}`;
  if (!errorMessage && !stderrText) return null;
  if (/requires? a newer version of (?:the )?(?:Codex|app|CLI)|please upgrade.*Codex|newer version of Codex/i.test(combined)) {
    const detail = errorMessage || stderrText.split(/\r?\n/).find((l) => l.includes("requires")) || stderrText.split(/\r?\n/, 1)[0];
    const modelSlug = extractModelSlugFromError(detail);
    const modelLine = modelSlug ? `문제 모델: \`${modelSlug}\`` : null;

    // Do not assert "your CLI is outdated" — that single-cause framing trapped
    // users whose CLI already knew the model (gpt-5.5 ships in npm-latest
    // 0.130.0 and is visible in interactive `codex`, yet this same error still
    // fired in app-server mode). Present the three real possibilities and tell
    // the user how to disambiguate, instead of forcing one wrong action.
    const lines = [
      "Codex 서버가 모델 호환성 오류를 반환했습니다.",
    ];
    if (modelLine) lines.push(modelLine);
    lines.push(
      "",
      "다음 중 하나입니다:",
      "",
      "1) Codex CLI 자체가 구버전 — 터미널에서 `codex --version` 확인,",
      "   npm latest와 다르면 `npm i -g @openai/codex@latest`",
    );
    if (modelSlug) {
      lines.push(
        "",
        `2) \`~/.codex/config.toml\`의 \`model\` 슬러그(\`${modelSlug}\`)가 잘못됐거나`,
        "   현재 CLI가 인식하지 못함 — 터미널에서 그냥 `codex`를 실행했을 때",
        `   \`model: ${modelSlug}\`이 활성으로 표시되는지 확인.`,
        "   인터랙티브에서는 동작한다면 플러그인 호출 경로(app-server)와의",
        "   메타데이터/capabilities 차이일 수 있음.",
      );
    } else {
      lines.push(
        "",
        "2) `~/.codex/config.toml`의 `model` 슬러그 점검 — 터미널에서 `codex`를",
        "   실행했을 때 활성 모델로 표시되는지 확인.",
      );
    }
    lines.push(
      "",
      "3) OpenAI 측 일시 게이팅 — 1, 2가 정상이라면 잠시 후 자동 재시도.",
      "",
      `원본 에러: ${detail}`,
    );
    return lines.join("\n");
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
      try {
        result = await withTimeout(
          runAppServerTurn(turnCwd, { ...turnOptions, resumeThreadId: existingThreadId }),
          STOP_REVIEW_TIMEOUT_MS,
        );
        finalPath = "resume";
      } catch (err) {
        const errCode = err?.code ?? null;
        const errMessage = err?.message ?? String(err);
        if (errCode === "ETIMEDOUT") throw err;
        logNote(`[stop-gate] Codex resume failed (${errCode ?? "unknown"}): ${errMessage}. Falling back to fresh thread.`);
        result = await withTimeout(runAppServerTurn(turnCwd, turnOptions), STOP_REVIEW_TIMEOUT_MS);
        finalPath = "fresh_fallback";
      }
    } else {
      result = await withTimeout(runAppServerTurn(turnCwd, turnOptions), STOP_REVIEW_TIMEOUT_MS);
      finalPath = "fresh";
    }

    if (sessionId && result.threadId) {
      setStopReviewThreadId(sessionId, result.threadId);
    }

    // Broker-staleness attribution + recovery. Only runs when the result
    // looks like the specific "newer version of Codex" signature; only acts
    // when listAvailableModels confirms the rejected slug is absent from the
    // broker's current view. On confirmation we restart the broker (its next
    // spawn reads the fresh models cache) and retry once with a fresh thread.
    const stale = await confirmStaleBroker(turnCwd, result);
    if (stale.confirmed) {
      const restart = restartBrokerSession(turnCwd, {
        killProcess: (pid) => terminateProcessTree(pid),
      });
      if (restart.restarted) {
        try {
          // Fresh thread on retry: the previous threadId was tied to the now-
          // dead broker codex. persistThread stays true so the *new* thread
          // gets persisted for subsequent stop reviews.
          result = await withTimeout(runAppServerTurn(turnCwd, turnOptions), STOP_REVIEW_TIMEOUT_MS);
          finalPath = `${finalPath}+broker_restart`;
          if (sessionId && result.threadId) {
            setStopReviewThreadId(sessionId, result.threadId);
          }
        } catch (retryErr) {
          if (retryErr?.code === "ETIMEDOUT") throw retryErr;
          // Fall through with the original (stale) result; diagnoseCodexFailure
          // will surface the 3-option message.
        }
      }
    }

    const finalText = String(result.finalMessage ?? "").trim();
    if (!finalText) {
      const diagnosed = diagnoseCodexFailure(result);
      if (diagnosed) return { ok: false, reason: diagnosed, details: null };
    }
    return parseStopReviewOutput(result.finalMessage);
  } catch (error) {
    if (error.code === "ETIMEDOUT") {
      // Surface the timeout as a separate flag so classifyOutcome can route
      // it to STOP_REVIEW_OUTCOME.TIMEOUT — a slow Codex call is not a code
      // finding, so it must not collapse into BLOCK and freeze the plan in
      // STOP_REVIEW_BLOCKED with an unrelated reason.
      return {
        ok: false,
        timedOut: true,
        reason: "The stop-time Codex review task timed out after 15 minutes.",
      };
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
  // Order matters: timedOut implies !ok, so check it first.
  if (review.timedOut) return STOP_REVIEW_OUTCOME.TIMEOUT;
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

function emitReviewLog({ outcome, branch, headSha, reason, runningTaskNote }) {
  if (outcome === STOP_REVIEW_OUTCOME.SKIPPED) {
    if (runningTaskNote) process.stderr.write(`${runningTaskNote}\n`);
    return;
  }
  const tag = {
    [STOP_REVIEW_OUTCOME.ALLOW]: "[stop-gate] ALLOW",
    [STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED]: "[stop-gate] ALLOW (저신뢰 BLOCK 다운그레이드 — .codex/reviews/ 참고)",
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
  if (runningTaskNote) {
    lines.push("", runningTaskNote);
  }
  process.stderr.write(lines.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { cwd, sessionId } = readHookInput({ tag: "stop-gate" });

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
  const skipped = []; // armed plans that produced no diff this turn
  for (const item of armed) {
    const r = collectDiffForPlan(item);
    if (r) {
      reviewItems.push(r);
    } else {
      skipped.push(item);
    }
  }

  // Empty reviewItems means none of the armed plans produced a diff this
  // turn. Three sub-cases need different treatment:
  //
  //   1. DISPATCHING+BLOCKED with the same HEAD as before → the redispatch
  //      ran but produced no commits. Surface the hang so the user sees why
  //      nothing is moving.
  //   2. DISPATCHING+ARMED with HEAD still at the branch point → the plan
  //      agent never committed. Almost always means the main session ended
  //      its turn before the agent finished (e.g. it backgrounded the
  //      dispatch and replied to an unrelated reminder). Surface a hint so
  //      the user can either wait for completion or re-dispatch in the
  //      foreground.
  //   3. Anything else → genuinely "nothing to do this turn" (a non-runner
  //      reply landed while a plan happened to be armed). Stay silent.
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

    // Armed but no commits yet — likely an early turn-end after a
    // background dispatch. The previous (pre-fix) Stop hook silently
    // reviewed the base commit here and walked state to dev_reviewing;
    // surfacing it explicitly tells the user the state is intact and what
    // to do next.
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
        "백그라운드 dispatch였다면 에이전트가 아직 작업 중일 수 있으니 완료",
        "알림을 기다리세요. 포그라운드였는데도 commit이 없다면 에이전트가 조용히",
        "실패한 것이므로 다시 dispatch 하세요. state는 dispatching/armed 그대로",
        "유지됩니다.",
      );
      emitDecision({ systemMessage: lines.join("\n") });
    }
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
  const timedOutItems = [];
  // Collected across all reviewItems so the final ALLOW systemMessage can
  // tack on a single warning paragraph if any plan crossed the threshold
  // this turn. (In practice there is almost always exactly one armed plan,
  // so this stays a single string.)
  const downgradeWarnings = [];

  for (const item of reviewItems) {
    const review = await runStopReview(workspaceRoot, sessionId, item);
    const outcome = classifyOutcome(review);

    persistReviewArtifacts(outcome, review, item, workspaceRoot);
    const { plannerDirective, escalationNote, downgradeWarning } =
      applyVerdictToPlanState(item, outcome, review);

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
    if (outcome === STOP_REVIEW_OUTCOME.TIMEOUT) {
      timedOutItems.push({ item, reason: review.reason });
    }
    if (downgradeWarning) {
      downgradeWarnings.push(downgradeWarning);
    }
  }

  // Emit terminal signal: BLOCK halts the next turn with a reason; ALLOW /
  // downgraded ALLOW / TIMEOUT emit a systemMessage so the user sees the
  // verdict (Claude Code swallows stderr from a Stop hook that exits 0
  // silently).
  if (blockedReviewItem) {
    emitDecision({
      decision: "block",
      reason: runningTaskNote ? `${runningTaskNote} ${blockedReason}` : blockedReason,
    });
    return;
  }

  // TIMEOUT-only outcome: do not pretend ALLOW. The plan is still armed,
  // last_reviewed_commit is unchanged, so the next Stop hook firing reviews
  // the same diff. Tell the user that explicitly so they can choose to wait
  // or cancel via /codex:cancel.
  if (timedOutItems.length > 0) {
    const lines = timedOutItems.map(({ item, reason }) => {
      const shortSha = item.headSha ? String(item.headSha).slice(0, 7) : "?";
      const head = `[stop-gate] TIMEOUT — ${item.branch ?? "?"}@${shortSha}`;
      return reason ? `${head}\n${reason}` : head;
    });
    lines.push(
      "",
      "게이트는 armed 상태로 유지되며 다음 턴 종료 시 같은 diff를 다시 리뷰합니다.",
      "재시도를 원치 않으면 `/codex:cancel`로 진행 중인 Codex 작업을 취소하세요.",
    );
    if (runningTaskNote) lines.push("", runningTaskNote);
    emitDecision({ systemMessage: lines.join("\n") });
    return;
  }

  // No BLOCK — surface a systemMessage describing the latest reviewed plan.
  const last = reviewItems[reviewItems.length - 1];
  const shortSha = last.headSha ? String(last.headSha).slice(0, 7) : "?";
  const tag = "[stop-gate] ALLOW";
  const parts = [`${tag} — ${last.branch ?? "?"}@${shortSha}`];
  if (runningTaskNote) parts.push("", runningTaskNote);
  if (downgradeWarnings.length > 0) parts.push(downgradeWarnings.join("\n"));
  emitDecision({ systemMessage: parts.join("\n") });
}

// Run main() only when invoked as a script — keeps the file importable from
// unit tests for matchesBrokerStaleModelSignature without triggering the full
// hook lifecycle (which would block on stdin).
const invokedAsScript =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsScript) {
  main();
}
