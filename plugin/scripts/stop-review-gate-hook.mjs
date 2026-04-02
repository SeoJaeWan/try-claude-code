#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { getCodexLoginStatus } from "./lib/codex.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import { loadSession, updateWorktreeReviewedCommit } from "./lib/sessions.mjs";
import { listJobs } from "./lib/state.mjs";
import { sortJobsNewestFirst } from "./lib/job-control.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const STOP_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const STOP_REVIEW_TASK_MARKER = "Run a stop-gate review of the previous Claude turn.";

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

function buildStopReviewPrompt(input = {}, worktreeDiffs = []) {
  const lastAssistantMessage = String(input.last_assistant_message ?? "").trim();
  const template = loadPromptTemplate(ROOT_DIR, "stop-review-gate");
  const claudeResponseBlock = lastAssistantMessage
    ? ["Previous Claude response:", lastAssistantMessage].join("\n")
    : "";

  let worktreeDiffsBlock = "";
  if (worktreeDiffs.length > 0) {
    const sections = worktreeDiffs.map(
      (wt) => `Worktree: ${wt.path} (branch: ${wt.branch})\n${wt.diff}`
    );
    worktreeDiffsBlock = [
      "Worktree diffs (last commit in each active worktree):",
      ...sections
    ].join("\n\n");
  }

  return interpolateTemplate(template, {
    CLAUDE_RESPONSE_BLOCK: claudeResponseBlock,
    WORKTREE_DIFFS_BLOCK: worktreeDiffsBlock
  });
}

function buildSetupNote(cwd) {
  const authStatus = getCodexLoginStatus(cwd);
  if (authStatus.available && authStatus.loggedIn) {
    return null;
  }

  const detail = authStatus.detail ? ` ${authStatus.detail}.` : "";
  return `Codex is not set up for the review gate.${detail} Run /codex:setup and, if needed, !codex login.`;
}

function parseStopReviewOutput(rawOutput) {
  const text = String(rawOutput ?? "").trim();
  if (!text) {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task returned no final output. Run /codex:review --wait manually or bypass the gate."
    };
  }

  const firstLine = text.split(/\r?\n/, 1)[0].trim();
  if (firstLine.startsWith("ALLOW:")) {
    return { ok: true, reason: null };
  }
  if (firstLine.startsWith("BLOCK:")) {
    const reason = firstLine.slice("BLOCK:".length).trim() || text;
    return {
      ok: false,
      reason: `Codex stop-time review found issues that still need fixes before ending the session: ${reason}`
    };
  }

  return {
    ok: false,
    reason:
      "The stop-time Codex review task returned an unexpected answer. Run /codex:review --wait manually or bypass the gate."
  };
}

// Well-known SHA for an empty tree — used when HEAD has no parent (first commit).
const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf899d15006ef9a21";

function isValidCommit(wtPath, sha) {
  const result = spawnSync("git", ["-C", wtPath, "cat-file", "-t", sha], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  return result.status === 0 && result.stdout.trim() === "commit";
}

function countActiveWorktrees(cwd) {
  const result = spawnSync("git", ["worktree", "list", "--porcelain"], { cwd, encoding: "utf8" });
  if (result.status !== 0 || !result.stdout) {
    return 0;
  }
  let count = 0;
  const normalizedCwd = path.resolve(cwd);
  for (const line of result.stdout.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      const wtPath = path.resolve(line.slice("worktree ".length).trim());
      if (wtPath !== normalizedCwd) {
        count++;
      }
    }
  }
  return count;
}

function getWorktreeDiffs(sessionId, cwd) {
  if (!sessionId) {
    return [];
  }

  const session = loadSession(sessionId);
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
      stdio: ["ignore", "pipe", "ignore"]
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
      const parentCheck = spawnSync("git", ["-C", wtPath, "rev-parse", "--verify", "HEAD~1"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });
      diffBase = parentCheck.status === 0 ? "HEAD~1" : EMPTY_TREE_SHA;
    }

    const diffResult = spawnSync("git", ["-C", wtPath, "diff", "--stat", `${diffBase}..HEAD`], {
      encoding: "utf8"
    });

    if (diffResult.stdout && diffResult.stdout.trim()) {
      const branchResult = spawnSync("git", ["-C", wtPath, "rev-parse", "--abbrev-ref", "HEAD"], {
        encoding: "utf8"
      });
      diffs.push({
        path: wt.path,
        branch: (branchResult.stdout || "").trim() || wt.branch || "unknown",
        diff: diffResult.stdout.trim(),
        headSha
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

function runStopReview(cwd, input = {}, worktreeDiffs = []) {
  const scriptPath = path.join(SCRIPT_DIR, "codex-companion.mjs");
  const prompt = buildStopReviewPrompt(input, worktreeDiffs);
  const childEnv = {
    ...process.env,
    ...(input.session_id ? { [SESSION_ID_ENV]: input.session_id } : {})
  };
  const result = spawnSync(process.execPath, [scriptPath, "task", "--json", prompt], {
    cwd,
    env: childEnv,
    encoding: "utf8",
    timeout: STOP_REVIEW_TIMEOUT_MS
  });

  if (result.error?.code === "ETIMEDOUT") {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task timed out after 15 minutes. Run /codex:review --wait manually or bypass the gate."
    };
  }

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    return {
      ok: false,
      reason: detail
        ? `The stop-time Codex review task failed: ${detail}`
        : "The stop-time Codex review task failed. Run /codex:review --wait manually or bypass the gate."
    };
  }

  try {
    const payload = JSON.parse(result.stdout);
    return parseStopReviewOutput(payload?.rawOutput);
  } catch {
    return {
      ok: false,
      reason:
        "The stop-time Codex review task returned invalid JSON. Run /codex:review --wait manually or bypass the gate."
    };
  }
}

function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  const jobs = sortJobsNewestFirst(filterJobsForCurrentSession(listJobs(workspaceRoot), input));
  const runningJob = jobs.find((job) => job.status === "queued" || job.status === "running");
  const runningTaskNote = runningJob
    ? `Codex task ${runningJob.id} is still running. Check /codex:status and use /codex:cancel ${runningJob.id} if you want to stop it before ending the session.`
    : null;

  const setupNote = buildSetupNote(cwd);
  if (setupNote) {
    logNote(setupNote);
    logNote(runningTaskNote);
    return;
  }

  // Check main repo for uncommitted changes.
  const diff = spawnSync("git", ["diff", "--stat"], { cwd, encoding: "utf8" });
  const diffCached = spawnSync("git", ["diff", "--cached", "--stat"], { cwd, encoding: "utf8" });
  const hasMainDiff = !!(diff.stdout.trim() || diffCached.stdout.trim());

  // Check active worktrees registered by the current session for recent commits.
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  const worktreeDiffs = getWorktreeDiffs(sessionId, cwd);

  // Warn if there are active worktrees that this session is not tracking.
  if (worktreeDiffs.length === 0) {
    const activeCount = countActiveWorktrees(cwd);
    const session = sessionId ? loadSession(sessionId) : null;
    const registeredCount = session ? session.worktrees.length : 0;
    if (activeCount > 0 && registeredCount === 0) {
      logNote(
        `Warning: ${activeCount} active worktree(s) detected but none are registered in this session. ` +
        "Worktree commits may not be reviewed. Ensure git worktree commands run via the Bash tool so the PostToolUse hook can track them."
      );
    }
  }

  if (!hasMainDiff && worktreeDiffs.length === 0) {
    logNote(runningTaskNote);
    return;
  }

  const review = runStopReview(cwd, input, worktreeDiffs);
  if (!review.ok) {
    // Do NOT mark as reviewed when blocked — the next stop attempt should re-review
    // the same range after Claude fixes the issues.
    emitDecision({
      decision: "block",
      reason: runningTaskNote ? `${runningTaskNote} ${review.reason}` : review.reason
    });
    return;
  }

  // Review passed — record the reviewed commit SHAs so subsequent stops skip them.
  if (worktreeDiffs.length > 0 && sessionId) {
    markWorktreesReviewed(sessionId, worktreeDiffs);
  }

  logNote(runningTaskNote);
}

main();
