#!/usr/bin/env node

// Session lifecycle hook — SessionStart and SessionEnd.
//
// What stays here:
//   - SessionStart: create the session JSON (tracking the active
//     plan-state pointer for diagnostics).
//   - SessionEnd: remove the session JSON.
//
// The Codex CLI probe and SessionEnd stale-session sweep that used to live
// here have been removed: the automatic stop-review gate is gone (dev-review
// is the sole gate), and stale session JSONs from killed Claude processes
// are tiny and irrelevant.

import process from "node:process";

import { createSession, deleteSession } from "./lib/sessions.mjs";
import { readHookInput } from "./lib/hook-input.mjs";

function handleSessionStart({ sessionId, cwd }) {
  if (!sessionId) return;
  createSession(sessionId, cwd);
}

function handleSessionEnd({ sessionId }) {
  if (sessionId) deleteSession(sessionId);
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
