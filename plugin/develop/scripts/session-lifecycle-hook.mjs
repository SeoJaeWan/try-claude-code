#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  createSession,
  deleteSession,
  cleanStaleSessions,
  addWorktree,
  removeWorktree,
  updateWorktreePlan
} from "./lib/sessions.mjs";
import { toPosixPath } from "./lib/fs.mjs";
import { runCommand } from "./lib/process.mjs";
import {
  PLAN_DESC_RE,
  PLAN_PATH_RE,
  WORKTREE_ADD_RE,
  WORKTREE_PATH_RE,
  WORKTREE_REMOVE_RE,
} from "./lib/contract.mjs";
import { recordHookEvent } from "./lib/telemetry.mjs";
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

function probeCodex() {
  try {
    const r = runCommand("codex", ["--version"], { timeout: 3000 });
    if (r.status === 0) {
      return { ok: true, version: (r.stdout || r.stderr || "").trim() };
    }
    const detail = r.error?.code ?? (r.status != null ? `exit=${r.status}` : "unknown");
    return { ok: false, reason: detail };
  } catch (err) {
    return { ok: false, reason: err?.code ?? err?.message ?? "unknown" };
  }
}

function codexInstallHint() {
  return "npm install -g @openai/codex";
}

function reportCodexProbe(probe) {
  if (probe.ok) {
    process.stderr.write(`[try-claude-code] Codex CLI detected: ${probe.version}\n`);
    return;
  }
  process.stderr.write(
    [
      "[try-claude-code] Codex CLI not detected — stop-review gate will be skipped this session.",
      `  reason: ${probe.reason}`,
      `  install: ${codexInstallHint()}`,
      "  (The session will continue normally; stop-time reviews simply won't run.)",
      ""
    ].join("\n")
  );
}

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

  // Probe Codex once at session start so the user learns about it immediately
  // rather than discovering it on the first stop-gate failure. Informational
  // only — never blocks the session.
  reportCodexProbe(probeCodex());
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

// Regexes live in lib/contract.mjs so runner SKILL.md and these hooks share
// a single source of truth.

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
  const mentionsWorktree = /worktree/i.test(command);

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
    recordHookEvent({ kind: "worktree_add", ok: true, sessionId });
    return;
  }

  // Check for git worktree remove
  const removeMatch = command.match(WORKTREE_REMOVE_RE);
  if (removeMatch) {
    const gitCDir = removeMatch[1] || null;
    const wtArg = removeMatch[2];
    const resolvedPath = resolveWorktreePath(cwd, gitCDir, wtArg);
    removeWorktree(sessionId, resolvedPath);
    recordHookEvent({ kind: "worktree_remove", ok: true, sessionId });
    return;
  }

  // Only emit miss telemetry when the command *looked* like a worktree op.
  // This keeps the metrics file signal-rich; normal Bash runs are not logged.
  if (mentionsWorktree) {
    recordHookEvent({ kind: "worktree_cmd", ok: false, sessionId });
  }
}

// ---------------------------------------------------------------------------
// PostToolUse (Agent) — detect plan-runner plan dispatch
// ---------------------------------------------------------------------------

// PLAN_DESC_RE, PLAN_PATH_RE and WORKTREE_PATH_RE are imported from lib/contract.mjs.

function handlePostAgentUse(input) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV];
  if (!sessionId) {
    return;
  }

  const description = input.tool_input?.description ?? "";
  const prompt = input.tool_input?.prompt ?? "";
  const planMatch = description.match(PLAN_DESC_RE);

  if (!planMatch) {
    return;
  }

  const planSlug = planMatch[1];
  const wtMatch = prompt.match(WORKTREE_PATH_RE);
  if (!wtMatch) {
    recordHookEvent({ kind: "plan_dispatch", ok: false, sessionId, planSlug, missing: "worktree_path" });
    return;
  }

  const wtPath = toPosixPath(wtMatch[1]);
  const planMatchPath = prompt.match(PLAN_PATH_RE);
  const planFile = planMatchPath ? toPosixPath(planMatchPath[1]) : null;

  updateWorktreePlan(sessionId, wtPath, planSlug, planFile);
  recordHookEvent({
    kind: "plan_dispatch",
    ok: true,
    sessionId,
    planSlug,
    hasPlanFile: Boolean(planFile),
  });
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
    case "post-agent-use":
      handlePostAgentUse(input);
      break;
    default:
      process.stderr.write(`session-lifecycle-hook: unknown mode "${mode}"\n`);
      process.exit(1);
  }
}

main();
