// Session-scoped state for the runner pipeline.
//
// One file per Claude Code session, written by SessionStart. The session
// file now holds a single informational field:
//
//   `activePlan` — a string slot that records the .runner-state.json this
//   session is currently driving. UserPromptSubmit overwrites it and emits
//   a stderr warning when the value changes. The Stop hook does not read
//   it (it globs `plans/**/.runner-state.json` directly).
//
// `stopReviewThreadId` lived here when an automatic Codex review gate ran
// at every turn end. That gate has been removed (dev-review is the sole
// review surface now), so the field is gone with it.
//
// Per-plan state (worktree path, dev_review.phase, base_branch) lives in
// `plans/{plan_key}/.runner-state.json`, not here.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { normalizePath, writeJsonAtomic } from "./fs.mjs";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const FALLBACK_SESSIONS_DIR = path.join(os.tmpdir(), "codex-companion", "sessions");

export function resolveSessionsDir() {
  const pluginDataDir = process.env[PLUGIN_DATA_ENV];
  return pluginDataDir ? path.join(pluginDataDir, "sessions") : FALLBACK_SESSIONS_DIR;
}

export function resolveSessionFile(sessionId) {
  return path.join(resolveSessionsDir(), `${sessionId}.json`);
}

function ensureSessionsDir() {
  fs.mkdirSync(resolveSessionsDir(), { recursive: true });
}

export function createSession(sessionId, cwd) {
  ensureSessionsDir();
  const session = {
    sessionId,
    cwd: normalizePath(cwd),
    activePlan: null,
  };
  // Atomic write: a process kill or OS crash mid-write would otherwise leave
  // a half-written JSON that loadSession swallows as `null`, silently losing
  // the session's plan pointer.
  writeJsonAtomic(resolveSessionFile(sessionId), session);
  return session;
}

// Project the on-disk JSON onto the canonical session shape. Unknown keys
// fall away naturally (we never spread `parsed`), so this also serves as the
// upgrade path: any future shape change just teaches this projector and the
// next saveSession overwrites the file in the new shape.
function parseSessionShape(parsed, sessionId) {
  return {
    sessionId: parsed.sessionId ?? sessionId,
    cwd: parsed.cwd ?? "",
    activePlan:
      typeof parsed.activePlan === "string" && parsed.activePlan.length > 0
        ? parsed.activePlan
        : null,
  };
}

export function loadSession(sessionId) {
  const file = resolveSessionFile(sessionId);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return parseSessionShape(JSON.parse(fs.readFileSync(file, "utf8")), sessionId);
  } catch (err) {
    // A corrupt session file is rare now that saveSession writes atomically,
    // but if it happens (manual edit, disk error) we surface it instead of
    // silently dropping the session.
    process.stderr.write(
      `[sessions] failed to parse ${file}: ${err.message}\n`,
    );
    return null;
  }
}

// Variant of loadSession that distinguishes "missing" (no file yet — normal
// before /runner has registered anything) from "corrupt" (file exists but
// failed to parse — operational failure that must NOT be treated as ALLOW).
//
// Stop hook uses this to decide between silent skip and explicit gate close;
// other callers can keep using loadSession because they are best-effort
// mutators where either failure mode reduces to "no session, give up".
export function loadSessionStrict(sessionId) {
  const file = resolveSessionFile(sessionId);
  if (!fs.existsSync(file)) {
    return { status: "missing", file, session: null, error: null };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return { status: "ok", file, session: parseSessionShape(parsed, sessionId), error: null };
  } catch (err) {
    return { status: "corrupt", file, session: null, error: err };
  }
}

function saveSession(session) {
  ensureSessionsDir();
  // Atomic write — see createSession for the rationale.
  writeJsonAtomic(resolveSessionFile(session.sessionId), session);
}

export function deleteSession(sessionId) {
  const file = resolveSessionFile(sessionId);
  try {
    fs.unlinkSync(file);
  } catch {
    // Ignore ENOENT — session may already be cleaned up.
  }
}


// ---------------------------------------------------------------------------
// Active plan-state pointer (single slot)
// ---------------------------------------------------------------------------
//
// The runner pipeline records the plan it is currently driving here. Only one
// slot per session — overwriting an existing value emits a stderr warning so
// surprising replacements are visible during debugging. The Stop hook does
// not read this slot; it discovers armed plans by globbing the plans/ tree.

export function setActivePlan(sessionId, statePath) {
  const session = loadSession(sessionId);
  if (!session) {
    // session.json is optional cache — the Stop hook reads armed plans
    // directly from disk — but a failed registration here used to silently
    // break activePlan tracking. Log so a manual bootstrap with a placeholder
    // session_id (or any other mismatch) is visible instead of producing a
    // confusing diagnosis later.
    process.stderr.write(
      `[sessions] setActivePlan: session "${sessionId}" not found; ` +
      `slot not updated. plan-state on disk is still authoritative — Stop ` +
      `hook will discover it via plans/ glob.\n`,
    );
    return;
  }
  const ptr = normalizePath(statePath);
  if (!ptr) return;
  if (session.activePlan && session.activePlan !== ptr) {
    process.stderr.write(
      `[sessions] setActivePlan: overwriting "${session.activePlan}" with "${ptr}".\n`,
    );
  }
  if (session.activePlan === ptr) return;
  session.activePlan = ptr;
  saveSession(session);
}

export function getActivePlan(sessionId) {
  const session = loadSession(sessionId);
  return session?.activePlan ?? null;
}

export function clearActivePlan(sessionId) {
  const session = loadSession(sessionId);
  if (!session || !session.activePlan) return;
  session.activePlan = null;
  saveSession(session);
}

