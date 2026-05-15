// Session-scoped state for the runner pipeline.
//
// One file per Claude Code session, written by SessionStart and consumed by
// the Stop hook. The session file holds two kinds of information:
//
//   1. Codex thread reuse — `stopReviewThreadId`. Reusing a single Codex
//      thread across stop-review passes avoids cold-start latency, so the
//      thread id outlives any individual plan and stays here.
//
//   2. Active plan-state pointers — `activePlanStates`. The Stop hook needs
//      to know which plan-state files this session is currently driving.
//      Keeping a small list of paths (not the plan state itself) lets the
//      Stop hook open the relevant `.runner-state.json` files without
//      globbing the entire `plans/` tree.
//
// Per-plan state (worktree path, status, BLOCK history) lives in the
// runner-state SSOT (`plans/{plan_key}/.runner-state.json`), not here.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { normalizePath, writeJsonAtomic } from "./fs.mjs";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const FALLBACK_SESSIONS_DIR = path.join(os.tmpdir(), "codex-companion", "sessions");

function nowIso() {
  return new Date().toISOString();
}

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
    createdAt: nowIso(),
    cwd: normalizePath(cwd),
    activePlanStates: [],
    stopReviewThreadId: null,
  };
  // Atomic write: a process kill or OS crash mid-write would otherwise leave
  // a half-written JSON that loadSession swallows as `null`, silently losing
  // the session's plan-state pointers and Codex thread id.
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
    createdAt: parsed.createdAt ?? nowIso(),
    cwd: parsed.cwd ?? "",
    activePlanStates: Array.isArray(parsed.activePlanStates)
      ? parsed.activePlanStates.filter((p) => typeof p === "string" && p.length > 0)
      : [],
    stopReviewThreadId: parsed.stopReviewThreadId ?? null,
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
// Active plan-state pointers
// ---------------------------------------------------------------------------
//
// The runner pipeline registers each plan it starts here so the Stop hook
// can find the relevant plan-state files without globbing. Pointers are
// normalized POSIX paths so comparisons are stable across the Bash and PWSH
// callers that hand them in.

function normalizePtr(p) {
  return normalizePath(p);
}

export function addActivePlanState(sessionId, statePath) {
  const session = loadSession(sessionId);
  if (!session) {
    // session.json is now an optional cache — the Stop hook reads armed
    // plans directly from disk — but a failed registration here used to
    // silently break activePlanStates pointer tracking. Log so a manual
    // bootstrap with a placeholder session_id (or any other mismatch) is
    // visible instead of producing a confusing diagnosis later.
    process.stderr.write(
      `[sessions] addActivePlanState: session "${sessionId}" not found; ` +
      `pointer ${statePath} not registered. The plan-state file on disk is ` +
      `still authoritative — Stop hook will discover it via plans/ glob.\n`,
    );
    return;
  }
  const ptr = normalizePtr(statePath);
  if (!ptr) return;
  if (!session.activePlanStates.includes(ptr)) {
    session.activePlanStates.push(ptr);
    saveSession(session);
  }
}

export function removeActivePlanState(sessionId, statePath) {
  const session = loadSession(sessionId);
  if (!session) return;
  const ptr = normalizePtr(statePath);
  if (!ptr) return;
  const before = session.activePlanStates.length;
  session.activePlanStates = session.activePlanStates.filter((p) => p !== ptr);
  if (session.activePlanStates.length !== before) {
    saveSession(session);
  }
}

export function listActivePlanStates(sessionId) {
  const session = loadSession(sessionId);
  return session ? [...session.activePlanStates] : [];
}

// ---------------------------------------------------------------------------
// Codex thread reuse
// ---------------------------------------------------------------------------
//
// The Stop hook stores the Codex thread id here after the first review pass
// in a session. Subsequent passes resume the same thread to skip cold start.
// Plan-scoped, per-plan thread isolation was considered and explicitly
// declined: the latency win of reuse outweighs the noise of a shared thread.

export function getStopReviewThreadId(sessionId) {
  const session = loadSession(sessionId);
  return session?.stopReviewThreadId ?? null;
}

export function setStopReviewThreadId(sessionId, threadId) {
  const session = loadSession(sessionId);
  if (!session) return;
  session.stopReviewThreadId = threadId;
  saveSession(session);
}
