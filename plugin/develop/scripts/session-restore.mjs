#!/usr/bin/env node

/**
 * session-restore.mjs
 *
 * Discovers existing git worktrees in the current project and registers them
 * into the active Claude session so the stop-review gate can pick them up.
 *
 * Usage:
 *   node session-restore.mjs [--cwd <path>]
 *
 * Reads session ID from $CODEX_COMPANION_SESSION_ID.
 * Outputs a JSON summary to stdout.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { addWorktree } from "./lib/sessions.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { cwd: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd" && args[i + 1]) {
      result.cwd = args[++i];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// git worktree list --porcelain parser
// ---------------------------------------------------------------------------

/**
 * Returns an array of { path, head, branch } objects.
 * The first entry is always the main worktree.
 */
function listWorktrees(repoRoot) {
  const result = spawnSync("git", ["-C", repoRoot, "worktree", "list", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return [];
  }

  const worktrees = [];
  let current = null;

  for (const rawLine of result.stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("worktree ")) {
      if (current) worktrees.push(current);
      current = { path: line.slice("worktree ".length), head: null, branch: null };
    } else if (line.startsWith("HEAD ") && current) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ") && current) {
      // refs/heads/feature-auth → feature-auth
      current.branch = line.slice("branch refs/heads/".length) || line.slice("branch ".length);
    } else if (line === "" && current) {
      worktrees.push(current);
      current = null;
    }
  }
  if (current) worktrees.push(current);

  return worktrees;
}

// ---------------------------------------------------------------------------
// git log -1 helper
// ---------------------------------------------------------------------------

function getLastCommit(wtPath) {
  const result = spawnSync("git", ["-C", wtPath, "log", "--oneline", "-1"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { cwd: cwdArg } = parseArgs();
  const cwd = cwdArg || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const sessionId = process.env[SESSION_ID_ENV];

  if (!sessionId) {
    process.stderr.write(
      `[session-restore] ${SESSION_ID_ENV} is not set — cannot register worktrees.\n`
    );
    process.stdout.write(
      JSON.stringify({ registered: [], error: `${SESSION_ID_ENV} not set` }) + "\n"
    );
    return;
  }

  const worktrees = listWorktrees(cwd);

  if (worktrees.length === 0) {
    process.stdout.write(JSON.stringify({ registered: [] }) + "\n");
    return;
  }

  // Normalize the main worktree path for comparison.
  const mainPath = worktrees[0]?.path
    ? path.normalize(worktrees[0].path).replace(/\\/g, "/")
    : null;
  const normCwd = path.normalize(cwd).replace(/\\/g, "/");

  const registered = [];

  for (const wt of worktrees) {
    const normWtPath = path.normalize(wt.path).replace(/\\/g, "/");

    // Skip the main worktree.
    if (normWtPath === mainPath || normWtPath === normCwd) {
      continue;
    }

    // Skip if the directory no longer exists on disk.
    if (!fs.existsSync(wt.path)) {
      continue;
    }

    // Use a relative path when possible (keeps session data portable).
    const wtRelOrAbs = path.isAbsolute(wt.path)
      ? path.relative(cwd, wt.path).replace(/\\/g, "/") || wt.path
      : wt.path;

    addWorktree(sessionId, wtRelOrAbs, wt.branch);

    const lastCommit = getLastCommit(wt.path);
    registered.push({
      path: wtRelOrAbs,
      branch: wt.branch,
      lastCommit,
    });
  }

  process.stdout.write(JSON.stringify({ registered }) + "\n");
}

main();
