#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runAppServerTurn } from "./lib/codex.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import {
  loadSession,
  updateWorktreeReviewedCommit,
  getStopReviewThreadId,
  setStopReviewThreadId,
  recordBlock,
  clearRecentBlockStreak,
} from "./lib/sessions.mjs";
import { listJobs } from "./lib/state.mjs";
import { sortJobsNewestFirst } from "./lib/job-control.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import { comparePaths } from "./lib/fs.mjs";
import {
  collectBlockReview,
  collectInformationalReview,
} from "./lib/review-collector.mjs";
import { recordHookEvent } from "./lib/telemetry.mjs";

const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const SAME_BLOCK_ESCALATION_THRESHOLD = 3;
const CONFIDENCE_THRESHOLD = 7;

function fingerprintBlockReason(reason) {
  // Normalize whitespace so cosmetic differences (trailing newlines, extra
  // spaces injected by the planner directive) do not split the streak.
  const normalized = String(reason ?? "")
    .replace(/\r?\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

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

function readHookInput() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function emitDecision(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function logNote(message) {
  if (!message) {
    return;
  }
  process.stderr.write(`${message}\n`);
}

function filterJobsForCurrentSession(jobs, input = {}) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  if (!sessionId) {
    return jobs;
  }
  return jobs.filter((job) => job.sessionId === sessionId);
}

function buildStopReviewPrompt(input = {}, worktreeDiffs = [], workspaceRoot = "", session = null) {
  const template = loadPromptTemplate(path.resolve(SCRIPT_DIR, ".."), "stop-review-gate");

  let worktreeDiffsBlock = "";
  if (worktreeDiffs.length > 0) {
    const sections = worktreeDiffs.map(
      (wt) => `Worktree: ${wt.path} (branch: ${wt.branch})\n${wt.diff}`,
    );
    worktreeDiffsBlock = [
      "Worktree diffs (last commit in each active worktree):",
      ...sections,
    ].join("\n\n");
  }

  let planContextBlock = "";
  if (session) {
    const wtRaw = worktreeDiffs[0]?.path ?? "";
    const wt = session.worktrees.find((w) => comparePaths(w.path, wtRaw));
    const planSlug = wt?.currentPlan ?? null;
    const planFile = wt?.planFile ?? null;
    logNote(`[stop-gate] plan-context chain: wt=${wtRaw}, sessionMatch=${wt ? "found" : "miss"}, currentPlan=${planSlug ?? "null"}, planFile=${planFile ?? "null"}`);
    if (planFile) {
      try {
        const planContent = fs.readFileSync(planFile, "utf8");
        planContextBlock = `Current plan (${planSlug ?? "unknown"}) detail:\n${planContent}`;
        logNote(`[stop-gate] plan-context chain: loaded plan ${planSlug ?? "?"} (${planContent.length} chars)`);
      } catch (err) {
        logNote(`[stop-gate] plan-context chain: plan file read failed — ${err.message}`);
      }
    }
  } else {
    logNote(`[stop-gate] plan-context chain: skipped — session is null`);
  }

  let commitMessagesBlock = "";
  if (worktreeDiffs.length > 0) {
    const msgs = worktreeDiffs
      .filter((wt) => wt.commitMessages)
      .map((wt) => `Branch: ${wt.branch}\n${wt.commitMessages}`);
    if (msgs.length > 0) {
      commitMessagesBlock = `Commit messages in review range:\n${msgs.join("\n\n")}`;
    }
  }

  return interpolateTemplate(template, {
    CLAUDE_RESPONSE_BLOCK: "",
    WORKTREE_DIFFS_BLOCK: worktreeDiffsBlock,
    PLAN_CONTEXT_BLOCK: planContextBlock,
    COMMIT_MESSAGES_BLOCK: commitMessagesBlock,
    WARNINGS_BLOCK: "",
  });
}

/**
 * Split a BLOCK payload into high-confidence (>= threshold) and low-confidence
 * finding lines. Lines without a `[conf N]` tag are treated as legacy findings
 * and grouped into `untagged`. Non-finding lines (headers, blank lines, the
 * BLOCK reason line) are preserved so the reason text retains its structure.
 */
function partitionFindingsByConfidence(text) {
  const lines = text.split(/\r?\n/);
  const confRe = /\[conf\s+(\d+)\]/i;
  const highFindings = [];
  const lowFindings = [];
  let taggedCount = 0;

  for (const line of lines) {
    const match = line.match(confRe);
    if (!match) {
      continue;
    }
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

/**
 * Inspect a `runAppServerTurn` result for an explicit failure signal
 * (Codex `error` notification or upgrade-required stderr). Returns a
 * formatted user-facing reason string, or null if no signal was found.
 *
 * The most common case this catches: OpenAI server returns 400
 * "requires a newer version of Codex" when the local CLI is too old
 * for the model the server is routing to. Without this, the hook would
 * surface the misleading "returned no final output" message instead.
 */
function diagnoseCodexFailure(result) {
  const errorMessage = String(result?.error?.message ?? result?.error ?? "").trim();
  const stderrText = String(result?.stderr ?? "").trim();
  const combined = `${errorMessage}\n${stderrText}`;

  if (!errorMessage && !stderrText) {
    return null;
  }

  // Upgrade-required: server says the local CLI is too old for the
  // current default model. Surface a clear remediation instead of the
  // generic empty-output warning.
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

  // Generic Codex-side failure: at least surface the actual message
  // rather than the misleading "returned no final output" warning.
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

    // No conf tags anywhere → legacy behavior: full text drives the BLOCK.
    if (taggedCount === 0) {
      return {
        ok: false,
        reason: text,
        details: text,
      };
    }

    // Tags present, but no finding crossed the threshold → downgrade to ALLOW.
    // Keep the whole output as an informational note so the suppressed findings
    // are still visible in .codex/reviews/.
    if (highFindings.length === 0) {
      return {
        ok: true,
        reason: null,
        details: null,
        suppressedNote: text,
      };
    }

    // At least one high-confidence finding → BLOCK, but narrow the reason to
    // the high-confidence lines so re-dispatch prompts stay focused.
    const header = firstLine;
    const filteredReason = [header, "", ...highFindings]
      .concat(
        lowFindings.length > 0
          ? ["", `(Low-confidence findings suppressed: ${lowFindings.length})`]
          : [],
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
    reason:
      "The stop-time Codex review task returned an unexpected answer. Run /codex:review --wait manually or bypass the gate.",
    details: null,
  };
}

/**
 * When a BLOCK occurs in a plan-runner worktree context, build a directive
 * that tells the main session to re-dispatch the plan agent instead of
 * fixing the code directly.
 *
 * Returns the directive string, or "" if not in a plan-runner context.
 */
function buildPlannerBlockDirective(worktreeDiffs, session = null) {
  if (!session) {
    return "";
  }

  const wtRaw = worktreeDiffs[0]?.path ?? "";
  const wt = session.worktrees.find((w) => comparePaths(w.path, wtRaw));
  if (!wt?.currentPlan) {
    return "";
  }

  const planTag = `Plan: ${wt.currentPlan}`;
  const wtPath = worktreeDiffs[0]?.path ?? "the worktree";

  const lines = [
    "",
    "---",
    `[plan-runner: ${planTag}] 아래 순서로 검증 후 행동:`,
    "1. 현재 plan 범위 밖 이슈 또는 테스트파일 관련 이슈 → 폐기",
    "2. 남은 이슈가 실제로 코드에 존재하는지 직접 확인 → 사실과 다르면 폐기",
    `3. 유효 이슈가 남으면 → ${planTag} 에이전트를 워크트리(${wtPath})에서 재디스패치, 커밋 후 턴 종료`,
    "4. 모두 폐기되면 → 재디스패치 없이 그냥 턴 종료 (다음 stop-gate에서 ALLOW)",
  ];
  return lines.join("\n");
}

// Well-known SHA for an empty tree — used when HEAD has no parent (first commit).
const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf899d15006ef9a21";

function isValidCommit(wtPath, sha) {
  const result = spawnSync("git", ["-C", wtPath, "cat-file", "-t", sha], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 && result.stdout.trim() === "commit";
}

function getWorktreeDiffs(session, cwd) {
  if (!session || !session.worktrees || session.worktrees.length === 0) {
    return [];
  }

  const diffs = [];
  for (const wt of session.worktrees) {
    const wtPath = path.isAbsolute(wt.path) ? wt.path : path.join(cwd, wt.path);
    if (!fs.existsSync(wtPath)) {
      continue;
    }

    // Get current HEAD SHA.
    const headResult = spawnSync("git", ["-C", wtPath, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (headResult.status !== 0) {
      continue;
    }
    const headSha = headResult.stdout.trim();

    // Skip if HEAD has not changed since the last review.
    if (wt.lastReviewedCommit && wt.lastReviewedCommit === headSha) {
      continue;
    }

    // Diff from last reviewed commit, falling back to HEAD~1 or empty tree.
    // Validate that lastReviewedCommit still exists in this worktree (it may be
    // stale if the worktree was removed and recreated at the same path).
    let diffBase;
    if (wt.lastReviewedCommit && isValidCommit(wtPath, wt.lastReviewedCommit)) {
      diffBase = wt.lastReviewedCommit;
    } else {
      const parentCheck = spawnSync(
        "git",
        ["-C", wtPath, "rev-parse", "--verify", "HEAD~1"],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      diffBase = parentCheck.status === 0 ? "HEAD~1" : EMPTY_TREE_SHA;
    }

    const diffResult = spawnSync(
      "git",
      ["-C", wtPath, "diff", `${diffBase}..HEAD`],
      {
        encoding: "utf8",
      },
    );

    if (diffResult.stdout && diffResult.stdout.trim()) {
      const branchResult = spawnSync(
        "git",
        ["-C", wtPath, "rev-parse", "--abbrev-ref", "HEAD"],
        {
          encoding: "utf8",
        },
      );
      const logResult = spawnSync(
        "git",
        ["-C", wtPath, "log", "--oneline", `${diffBase}..HEAD`],
        {
          encoding: "utf8",
        },
      );
      diffs.push({
        path: wt.path,
        branch: (branchResult.stdout || "").trim() || wt.branch || "unknown",
        diff: diffResult.stdout.trim(),
        headSha,
        commitMessages: (logResult.stdout || "").trim(),
      });
    }
  }
  return diffs;
}

function markWorktreesReviewed(sessionId, worktreeDiffs) {
  for (const wt of worktreeDiffs) {
    updateWorktreeReviewedCommit(sessionId, wt.path, wt.headSha);
  }
}

async function runStopReview(cwd, input = {}, worktreeDiffs = [], workspaceRoot = "", session = null) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  const prompt = buildStopReviewPrompt(input, worktreeDiffs, workspaceRoot, session);
  const existingThreadId = sessionId ? getStopReviewThreadId(sessionId) : null;
  const turnCwd = workspaceRoot || cwd;
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
        const resumeElapsed = Date.now() - resumeStart;
        recordHookEvent({
          kind: "stop_review_codex",
          step: "resume",
          ok: true,
          elapsedMs: resumeElapsed,
          threadId: existingThreadId,
          sessionId,
        });
        logNote(`[stop-gate] Codex resume succeeded in ${resumeElapsed}ms (thread ${existingThreadId}).`);
        finalPath = "resume";
      } catch (err) {
        const resumeElapsed = Date.now() - resumeStart;
        const errCode = err?.code ?? null;
        const errMessage = err?.message ?? String(err);
        recordHookEvent({
          kind: "stop_review_codex",
          step: "resume",
          ok: false,
          elapsedMs: resumeElapsed,
          threadId: existingThreadId,
          errorCode: errCode,
          errorMessage: errMessage,
          sessionId,
        });
        if (errCode === "ETIMEDOUT") {
          logNote(`[stop-gate] Codex resume timed out after ${resumeElapsed}ms (thread ${existingThreadId}).`);
          throw err;
        }
        logNote(
          `[stop-gate] Codex resume failed after ${resumeElapsed}ms (thread ${existingThreadId}, ` +
          `code=${errCode ?? "unknown"}): ${errMessage}. Falling back to fresh thread.`
        );

        const freshStart = Date.now();
        try {
          result = await withTimeout(
            runAppServerTurn(turnCwd, turnOptions),
            STOP_REVIEW_TIMEOUT_MS,
          );
          const freshElapsed = Date.now() - freshStart;
          recordHookEvent({
            kind: "stop_review_codex",
            step: "fresh_fallback",
            ok: true,
            elapsedMs: freshElapsed,
            sessionId,
          });
          logNote(`[stop-gate] Codex fresh fallback succeeded in ${freshElapsed}ms.`);
          finalPath = "fresh_fallback";
        } catch (freshErr) {
          const freshElapsed = Date.now() - freshStart;
          recordHookEvent({
            kind: "stop_review_codex",
            step: "fresh_fallback",
            ok: false,
            elapsedMs: freshElapsed,
            errorCode: freshErr?.code ?? null,
            errorMessage: freshErr?.message ?? String(freshErr),
            sessionId,
          });
          throw freshErr;
        }
      }
    } else {
      const coldStart = Date.now();
      try {
        result = await withTimeout(
          runAppServerTurn(turnCwd, turnOptions),
          STOP_REVIEW_TIMEOUT_MS,
        );
        const coldElapsed = Date.now() - coldStart;
        recordHookEvent({
          kind: "stop_review_codex",
          step: "fresh",
          ok: true,
          elapsedMs: coldElapsed,
          sessionId,
        });
        logNote(`[stop-gate] Codex first-turn completed in ${coldElapsed}ms (no prior thread).`);
        finalPath = "fresh";
      } catch (err) {
        const coldElapsed = Date.now() - coldStart;
        recordHookEvent({
          kind: "stop_review_codex",
          step: "fresh",
          ok: false,
          elapsedMs: coldElapsed,
          errorCode: err?.code ?? null,
          errorMessage: err?.message ?? String(err),
          sessionId,
        });
        throw err;
      }
    }

    // Persist the thread ID so subsequent stops resume the same thread.
    if (sessionId && result.threadId) {
      setStopReviewThreadId(sessionId, result.threadId);
    }

    recordHookEvent({
      kind: "stop_review_codex",
      step: "total",
      ok: true,
      elapsedMs: Date.now() - totalStart,
      path: finalPath,
      sessionId,
    });

    // If Codex finished the protocol turn but emitted no agent message
    // (e.g. OpenAI rejected the request because the local CLI is too old
    // for the routed model), surface the actual diagnostic instead of the
    // generic "no final output" warning.
    const finalText = String(result.finalMessage ?? "").trim();
    if (!finalText) {
      const diagnosed = diagnoseCodexFailure(result);
      if (diagnosed) {
        return { ok: false, reason: diagnosed, details: null };
      }
    }

    return parseStopReviewOutput(result.finalMessage);
  } catch (error) {
    recordHookEvent({
      kind: "stop_review_codex",
      step: "total",
      ok: false,
      elapsedMs: Date.now() - totalStart,
      path: finalPath,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? String(error),
      sessionId,
    });

    if (error.code === "ETIMEDOUT") {
      return {
        ok: false,
        reason:
          "The stop-time Codex review task timed out after 15 minutes. Run /codex:review --wait manually or bypass the gate.",
      };
    }
    // Graceful degrade: if Codex is not installed/launchable, skip the review
    // instead of blocking. SessionStart already warned the user, so don't repeat.
    const errText = error instanceof Error ? error.message : String(error);
    const isMissingCodex =
      error?.code === "ENOENT" ||
      /\bcodex\b.*not (?:recognized|found)|command not found.*codex|ENOENT/i.test(errText);
    if (isMissingCodex) {
      logNote("[stop-gate] Codex CLI unavailable — skipping stop-time review.");
      return { ok: true, skipped: true, reason: null };
    }
    const detail = errText;
    return {
      ok: false,
      reason: detail
        ? `The stop-time Codex review task failed: ${detail}`
        : "The stop-time Codex review task failed. Run /codex:review --wait manually or bypass the gate.",
    };
  }
}

function classifyOutcome(review) {
  if (review.skipped) return "skipped";
  if (!review.ok) return "block";
  if (review.suppressedNote) return "allow_downgraded";
  return "allow";
}

function persistReviewArtifacts(outcome, review, worktreeDiffs, workspaceRoot) {
  if (outcome !== "block" && outcome !== "allow_downgraded") {
    return;
  }
  try {
    for (const wt of worktreeDiffs) {
      if (outcome === "block") {
        collectBlockReview(workspaceRoot, {
          branch: wt.branch,
          headSha: wt.headSha,
          reason: review.reason,
          details: review.details,
          diff: wt.diff,
        });
      }
      if (review.suppressedNote) {
        collectInformationalReview(workspaceRoot, {
          branch: wt.branch,
          headSha: wt.headSha,
          note: review.suppressedNote,
          diff: wt.diff,
        });
      }
    }
  } catch {
    // best-effort — never block the gate decision on persistence failure.
  }
}

// Single CLI output channel for stop-gate review results. ALLOW / BLOCK /
// downgraded ALLOW all flow through here so verbosity, formatting, and
// visibility can be tuned in one place. Decision flow (block emit) stays
// separate in main().
function emitReviewLog({ outcome, branch, headSha, reason, runningTaskNote }) {
  // Skipped runs stay silent (SessionStart already warned). Still surface the
  // running-task hint if any so it does not get swallowed.
  if (outcome === "skipped") {
    if (runningTaskNote) {
      process.stderr.write(`${runningTaskNote}\n`);
    }
    return;
  }

  const tag = {
    allow: "[stop-gate] ALLOW",
    allow_downgraded: "[stop-gate] ALLOW (저신뢰 BLOCK 다운그레이드 — .codex/reviews/ 참고)",
    block: "[stop-gate] BLOCK",
  }[outcome] ?? "[stop-gate]";

  const shortSha = headSha ? String(headSha).slice(0, 7) : "?";
  const lines = [`${tag} — ${branch ?? "?"}@${shortSha}`];

  if (outcome === "block" && reason) {
    lines.push("", reason);
  }
  if (runningTaskNote) {
    lines.push("", runningTaskNote);
  }

  process.stderr.write(lines.join("\n") + "\n");
}

async function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Load session once and pass to all consumers.
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  const session = sessionId ? loadSession(sessionId) : null;
  const worktreeDiffs = getWorktreeDiffs(session, cwd);

  // No active worktree diffs — nothing to review, exit immediately.
  if (worktreeDiffs.length === 0) {
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot(cwd);

  const review = await runStopReview(cwd, input, worktreeDiffs, workspaceRoot, session);

  // Check for running jobs (informational note only).
  const jobs = sortJobsNewestFirst(
    filterJobsForCurrentSession(listJobs(workspaceRoot), input),
  );
  const runningJob = jobs.find(
    (job) => job.status === "queued" || job.status === "running",
  );
  const runningTaskNote = runningJob
    ? `Codex task ${runningJob.id} is still running. Check /codex:status and use /codex:cancel ${runningJob.id} if you want to stop it before ending the session.`
    : null;

  // Record the reviewed commit SHAs regardless of outcome so subsequent stops on the
  // same commit are skipped (e.g. follow-up questions after a BLOCK).
  if (sessionId) {
    markWorktreesReviewed(sessionId, worktreeDiffs);
  }

  const outcome = classifyOutcome(review);
  const primaryWt = worktreeDiffs[0] ?? {};

  // 1) Persist artifacts (BLOCK reasons + suppressed notes).
  persistReviewArtifacts(outcome, review, worktreeDiffs, workspaceRoot);

  // 2) Session state: streak counter + planner/escalation directive (BLOCK only).
  let plannerDirective = "";
  let escalationNote = "";
  if (outcome === "block") {
    plannerDirective = buildPlannerBlockDirective(worktreeDiffs, session);
    if (sessionId) {
      const fingerprint = fingerprintBlockReason(review.reason);
      const { count } = recordBlock(sessionId, fingerprint);
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
  } else if (sessionId) {
    clearRecentBlockStreak(sessionId);
  }

  // 3) Unified CLI log — single source of truth for terminal output.
  emitReviewLog({
    outcome,
    branch: primaryWt.branch,
    headSha: primaryWt.headSha,
    reason: review.reason,
    runningTaskNote,
  });

  // 4) Control flow.
  // BLOCK → emit a decision payload that halts the turn with the reason.
  // ALLOW / ALLOW_DOWNGRADED → emit `systemMessage` so the user actually sees
  //   the result. Stderr alone is not enough: Claude Code swallows stderr from
  //   a Stop hook that exits 0 without a decision, so without systemMessage
  //   the ALLOW case is silent in the UI.
  if (outcome === "block") {
    const fullReason = review.reason + plannerDirective + escalationNote;
    emitDecision({
      decision: "block",
      reason: runningTaskNote ? `${runningTaskNote} ${fullReason}` : fullReason,
    });
  } else if (outcome === "allow" || outcome === "allow_downgraded") {
    const shortSha = primaryWt.headSha ? String(primaryWt.headSha).slice(0, 7) : "?";
    const tag =
      outcome === "allow_downgraded"
        ? "[stop-gate] ALLOW (저신뢰 BLOCK 다운그레이드 — .codex/reviews/ 참고)"
        : "[stop-gate] ALLOW";
    const systemMessage = runningTaskNote
      ? `${tag} — ${primaryWt.branch ?? "?"}@${shortSha}\n\n${runningTaskNote}`
      : `${tag} — ${primaryWt.branch ?? "?"}@${shortSha}`;
    emitDecision({ systemMessage });
  }
}

main();
