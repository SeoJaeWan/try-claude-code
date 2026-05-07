// Common entry point for the runner hooks (UserPromptSubmit, Stop,
// SessionStart/End). Each hook used to define its own `readHookInput`
// + post-resolve `cwd` / `sessionId` from `input ?? CLAUDE_PROJECT_DIR ??
// process.cwd()` and `input.session_id ?? SESSION_ID_ENV` independently —
// the resulting drift was exactly the kind of contract decay this lib
// is meant to prevent.
//
// `readHookInput` consolidates three things:
//
//   1. Read stdin and parse the JSON. On parse failure, returns the empty
//      shape and logs to stderr — bubbling the SyntaxError out of a hook
//      is worse than running with no input. Pass `strict: true` to throw.
//   2. Resolve `cwd` consistently (input → CLAUDE_PROJECT_DIR env →
//      process.cwd()), then canonicalize to an absolute POSIX path so
//      downstream `comparePaths` calls don't get mismatched separators.
//   3. Resolve `sessionId` consistently (input → SESSION_ID_ENV env →
//      null). Returns null rather than throwing because the SessionStart
//      path legitimately has no session yet.
//
// Hook authors should treat the returned object as the only place these
// fields live — never re-resolve `cwd` or `sessionId` from env later in
// the same hook.

import fs from "node:fs";
import process from "node:process";

import { absoluteNormalizePath } from "./fs.mjs";
import { SESSION_ID_ENV } from "./tracked-jobs.mjs";

const EMPTY_INPUT = Object.freeze({});

export function readHookInput({ tag = "hook", strict = false } = {}) {
  const raw = readStdin();
  const input = parseInput(raw, tag, strict);

  const inputCwd = typeof input.cwd === "string" && input.cwd ? input.cwd : null;
  const envCwd = process.env.CLAUDE_PROJECT_DIR || null;
  const cwd = absoluteNormalizePath(inputCwd ?? envCwd ?? process.cwd());

  const sessionId =
    (typeof input.session_id === "string" && input.session_id) ||
    process.env[SESSION_ID_ENV] ||
    null;

  return {
    raw: input,
    cwd,
    sessionId,
    prompt: typeof input.prompt === "string" ? input.prompt : "",
    hookEventName: typeof input.hook_event_name === "string" ? input.hook_event_name : null,
  };
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

function parseInput(raw, tag, strict) {
  if (!raw) return EMPTY_INPUT;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : EMPTY_INPUT;
  } catch (err) {
    if (strict) throw err;
    process.stderr.write(`[${tag}] failed to parse stdin: ${err.message}\n`);
    return EMPTY_INPUT;
  }
}
