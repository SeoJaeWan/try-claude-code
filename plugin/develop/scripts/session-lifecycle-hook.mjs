#!/usr/bin/env node

// Session lifecycle hook — SessionStart and SessionEnd only.
//
// PostToolUse(Bash) and PostToolUse(Agent) used to live here too. They sniffed
// `git worktree add/remove` and Agent description regexes to mirror runner
// state into the session JSON. That responsibility has moved into the
// runner-state SSOT (`plans/{plan_key}/.runner-state.json`), driven directly by
// the runner skill and the UserPromptSubmit hook, so the regex contract is
// no longer needed and the matching code has been deleted.
//
// What stays here:
//   - SessionStart: create the session JSON (tracking Codex thread reuse and
//     active plan-state pointers), propagate the session id and plugin data
//     dir to subsequent hooks, and probe Codex once for visibility.
//   - SessionEnd: remove the session JSON and prune stale ones.

import fs from "node:fs";
import process from "node:process";

import {
  cleanStaleSessions,
  createSession,
  deleteSession,
} from "./lib/sessions.mjs";
import { runCommand } from "./lib/process.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";
import { readHookInput } from "./lib/hook-input.mjs";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const STALE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function appendEnvVar(name, value) {
  if (!process.env.CLAUDE_ENV_FILE || value == null || value === "") return;
  fs.appendFileSync(process.env.CLAUDE_ENV_FILE, `export ${name}=${shellEscape(value)}\n`, "utf8");
}

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
      "",
    ].join("\n"),
  );
}

function handleSessionStart({ sessionId, cwd }) {
  if (!sessionId) return;
  createSession(sessionId, cwd);
  appendEnvVar(SESSION_ID_ENV, sessionId);
  appendEnvVar(PLUGIN_DATA_ENV, process.env[PLUGIN_DATA_ENV]);
  reportCodexProbe(probeCodex());
}

function handleSessionEnd({ sessionId }) {
  if (sessionId) deleteSession(sessionId);
  cleanStaleSessions(STALE_SESSION_MAX_AGE_MS);
}

function main() {
  const mode = process.argv[2] ?? "";
  const input = readHookInput({ tag: "session-lifecycle" });
  switch (mode) {
    case "session-start":
      handleSessionStart(input);
      break;
    case "session-end":
      handleSessionEnd(input);
      break;
    default:
      process.stderr.write(`session-lifecycle-hook: unknown mode "${mode}"\n`);
      process.exit(1);
  }
}

main();
