#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runAppServerTurn } from "./lib/codex.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import { loadSession, updateWorktreeReviewedCommit, getStopReviewThreadId, setStopReviewThreadId } from "./lib/sessions.mjs";
import { listJobs } from "./lib/state.mjs";
import { sortJobsNewestFirst } from "./lib/job-control.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import { collectBlockReview, findPlanDirByBranch } from "./lib/review-collector.mjs";

const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Find a phase detail file matching the given phase number inside the phases/ directory.
 * Files are expected to follow the pattern: {nn}-{slug}.md (e.g., 03-api-setup.md).
 * Returns the full path to the file, or null if not found.
 */
function findPhaseFile(phasesDir, phaseNumber) {
  if (!fs.existsSync(phasesDir)) {
    return null;
  }
  const padded = String(phaseNumber).padStart(2, "0");
  try {
    const entries = fs.readdirSync(phasesDir);
    const match = entries.find((e) => e.startsWith(`${padded}-`) && e.endsWith(".md"));
    return match ? path.join(phasesDir, match) : null;
  } catch {
    return null;
  }
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
  const branch = worktreeDiffs[0]?.branch;
  if (branch && workspaceRoot) {
    const planDir = findPlanDirByBranch(workspaceRoot, branch);
    if (planDir && session) {
      const wtNorm = (worktreeDiffs[0]?.path ?? "").replace(/\\/g, "/");
      const wt = session.worktrees.find(
        (w) => w.path.replace(/\\/g, "/") === wtNorm,
      );
      if (wt?.currentPhase != null) {
        // Read the phase detail file instead of the full plan.
        const phasesDir = path.join(planDir, "phases");
        const phaseFile = findPhaseFile(phasesDir, wt.currentPhase);
        if (phaseFile) {
          try {
            const phaseContent = fs.readFileSync(phaseFile, "utf8");
            planContextBlock = `Current phase (Phase ${wt.currentPhase}) detail:\n${phaseContent}`;
          } catch {
            // Phase file unreadable — proceed without phase context.
          }
        }
      }
    }
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
  });
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
    const reason = firstLine.slice("BLOCK:".length).trim() || text;
    return {
      ok: false,
      reason: `Codex stop-time review found issues that still need fixes before ending the session: ${reason}`,
      details: text,
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
 * that tells the main session to re-dispatch the phase agent instead of
 * fixing the code directly.
 *
 * Returns the directive string, or "" if not in a plan-runner context.
 */
function buildPlannerBlockDirective(worktreeDiffs, workspaceRoot, session = null) {
  const branch = worktreeDiffs[0]?.branch;
  if (!branch || !workspaceRoot) {
    return "";
  }

  const planDir = findPlanDirByBranch(workspaceRoot, branch);
  if (!planDir) {
    return "";
  }

  // Read the current phase from the session (set by PostToolUse Agent hook).
  let phaseTag = "the current phase";
  if (session) {
    const wtNorm = worktreeDiffs[0]?.path ?? "";
    const wt = session.worktrees.find(
      (w) => w.path.replace(/\\/g, "/") === wtNorm.replace(/\\/g, "/"),
    );
    if (wt?.currentPhase != null) {
      phaseTag = `Phase ${wt.currentPhase}`;
    }
  }

  const wtPath = worktreeDiffs[0]?.path ?? "the worktree";

  const lines = [
    "",
    "---",
    "[plan-runner workflow directive]",
    `Do NOT fix this yourself in the main session. Re-dispatch the same phase agent (${phaseTag}) to fix the issues.`,
    `The agent must work in the worktree at: ${wtPath}`,
    "After the agent commits the fix, end your turn so the stop-gate can re-review.",
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

  try {
    let result;
    if (existingThreadId) {
      try {
        result = await withTimeout(
          runAppServerTurn(turnCwd, { ...turnOptions, resumeThreadId: existingThreadId }),
          STOP_REVIEW_TIMEOUT_MS,
        );
      } catch (err) {
        if (err.code === "ETIMEDOUT") throw err;
        logNote(`[stop-gate] Resume of thread ${existingThreadId} failed, starting fresh thread.`);
        result = await withTimeout(
          runAppServerTurn(turnCwd, turnOptions),
          STOP_REVIEW_TIMEOUT_MS,
        );
      }
    } else {
      result = await withTimeout(
        runAppServerTurn(turnCwd, turnOptions),
        STOP_REVIEW_TIMEOUT_MS,
      );
    }

    // Persist the thread ID so subsequent stops resume the same thread.
    if (sessionId && result.threadId) {
      setStopReviewThreadId(sessionId, result.threadId);
    }
    return parseStopReviewOutput(result.finalMessage);
  } catch (error) {
    if (error.code === "ETIMEDOUT") {
      return {
        ok: false,
        reason:
          "The stop-time Codex review task timed out after 15 minutes. Run /codex:review --wait manually or bypass the gate.",
      };
    }
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: detail
        ? `The stop-time Codex review task failed: ${detail}`
        : "The stop-time Codex review task failed. Run /codex:review --wait manually or bypass the gate.",
    };
  }
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

  if (!review.ok) {
    // Do NOT mark as reviewed when blocked — the next stop attempt should re-review
    // the same range after Claude fixes the issues.
    try {
      for (const wt of worktreeDiffs) {
        collectBlockReview(workspaceRoot, {
          branch: wt.branch,
          headSha: wt.headSha,
          reason: review.reason,
          diff: wt.diff,
        });
      }
    } catch {
      // Review collection is best-effort — never block the gate decision.
    }

    // If this BLOCK is in a plan-runner worktree context, append a directive
    // telling the main session to re-dispatch the phase agent for the fix.
    const plannerDirective = buildPlannerBlockDirective(worktreeDiffs, workspaceRoot, session);
    const fullReason = review.reason + plannerDirective;

    emitDecision({
      decision: "block",
      reason: runningTaskNote
        ? `${runningTaskNote} ${fullReason}`
        : fullReason,
    });
    return;
  }

  // Review passed — record the reviewed commit SHAs so subsequent stops skip them.
  if (sessionId) {
    markWorktreesReviewed(sessionId, worktreeDiffs);
  }

  logNote(runningTaskNote);
}

main();
