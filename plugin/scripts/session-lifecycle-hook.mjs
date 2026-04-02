#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  createSession,
  deleteSession,
  cleanStaleSessions,
  loadSession,
  addWorktree,
  removeWorktree
} from "./lib/sessions.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const STALE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function readHookInput() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function appendEnvVar(name, value) {
  if (!process.env.CLAUDE_ENV_FILE || value == null || value === "") {
    return;
  }
  fs.appendFileSync(process.env.CLAUDE_ENV_FILE, `export ${name}=${shellEscape(value)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// SessionStart
// ---------------------------------------------------------------------------

function handleSessionStart(input) {
  const sessionId = input.session_id;
  if (!sessionId) {
    return;
  }
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  createSession(sessionId, cwd);

  // Propagate session ID and plugin data dir to subsequent hooks via CLAUDE_ENV_FILE.
  appendEnvVar(SESSION_ID_ENV, sessionId);
  appendEnvVar(PLUGIN_DATA_ENV, process.env[PLUGIN_DATA_ENV]);
}

// ---------------------------------------------------------------------------
// SessionEnd
// ---------------------------------------------------------------------------

function handleSessionEnd(input) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV];
  if (sessionId) {
    deleteSession(sessionId);
  }
  cleanStaleSessions(STALE_SESSION_MAX_AGE_MS);
}

// ---------------------------------------------------------------------------
// PostToolUse (Bash) — detect git worktree add/remove
// ---------------------------------------------------------------------------

const WORKTREE_ADD_RE = /git\s+(?:-C\s+(\S+)\s+)?worktree\s+add\s+(?:-b\s+(\S+)\s+)?(\S+)/;
const WORKTREE_REMOVE_RE = /git\s+(?:-C\s+(\S+)\s+)?worktree\s+remove\s+(?:--force\s+)?(\S+)/;

function resolveWorktreePath(baseCwd, gitCDir, worktreeArg) {
  // Strip surrounding quotes if present.
  const cleaned = worktreeArg.replace(/^["']|["']$/g, "");
  if (path.isAbsolute(cleaned)) {
    return cleaned;
  }
  const base = gitCDir ? path.resolve(baseCwd, gitCDir.replace(/^["']|["']$/g, "")) : baseCwd;
  return path.resolve(base, cleaned);
}

function handlePostToolUse(input) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV];
  if (!sessionId) {
    return;
  }

  const command = input.tool_input?.command ?? "";
  if (!command) {
    return;
  }

  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Check for git worktree add
  const addMatch = command.match(WORKTREE_ADD_RE);
  if (addMatch) {
    const gitCDir = addMatch[1] || null;
    const branch = addMatch[2] || null;
    const wtArg = addMatch[3];
    const resolvedPath = resolveWorktreePath(cwd, gitCDir, wtArg);

    // Only register if the worktree directory actually exists (PostToolUse = after execution).
    if (fs.existsSync(resolvedPath)) {
      addWorktree(sessionId, resolvedPath, branch);
    }
    return;
  }

  // Check for git worktree remove
  const removeMatch = command.match(WORKTREE_REMOVE_RE);
  if (removeMatch) {
    const gitCDir = removeMatch[1] || null;
    const wtArg = removeMatch[2];
    const resolvedPath = resolveWorktreePath(cwd, gitCDir, wtArg);
    removeWorktree(sessionId, resolvedPath);
  }
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

function main() {
  const mode = process.argv[2] ?? "";
  const input = readHookInput();

  switch (mode) {
    case "session-start":
      handleSessionStart(input);
      break;
    case "session-end":
      handleSessionEnd(input);
      break;
    case "post-tool-use":
      handlePostToolUse(input);
      break;
    default:
      process.stderr.write(`session-lifecycle-hook: unknown mode "${mode}"\n`);
      process.exit(1);
  }
}

main();
