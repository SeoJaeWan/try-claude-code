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
// Plan-level details (worktree path, current status, BLOCK history,
// pendingStopReview flag) used to live here on a `worktrees[]` array. They
// have been moved to `lib/runner-state.mjs` (one file per plan) so the runner
// flow stays debuggable and survives session boundaries. This module no
// longer carries any per-plan field.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { normalizePath } from "./fs.mjs";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const FALLBACK_SESSIONS_DIR = path.join(os.tmpdir(), "codex-companion", "sessions");
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

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
  fs.writeFileSync(resolveSessionFile(sessionId), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  return session;
}

// loadSession is forgiving by design: legacy session files that still carry
// the old `worktrees[]` / `blockHistory` fields parse cleanly, but only the
// new fields are surfaced to callers. The next saveSession overwrites the
// file in the new shape, so legacy keys decay naturally without a migration
// step.
export function loadSession(sessionId) {
  const file = resolveSessionFile(sessionId);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      sessionId: parsed.sessionId ?? sessionId,
      createdAt: parsed.createdAt ?? nowIso(),
      cwd: parsed.cwd ?? "",
      activePlanStates: Array.isArray(parsed.activePlanStates)
        ? parsed.activePlanStates.filter((p) => typeof p === "string" && p.length > 0)
        : [],
      stopReviewThreadId: parsed.stopReviewThreadId ?? null,
    };
  } catch {
    return null;
  }
}

function saveSession(session) {
  ensureSessionsDir();
  fs.writeFileSync(
    resolveSessionFile(session.sessionId),
    `${JSON.stringify(session, null, 2)}\n`,
    "utf8",
  );
}

export function deleteSession(sessionId) {
  const file = resolveSessionFile(sessionId);
  try {
    fs.unlinkSync(file);
  } catch {
    // Ignore ENOENT — session may already be cleaned up.
  }
}

export function listSessions() {
  const dir = resolveSessionsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
}

export function cleanStaleSessions(maxAgeMs = STALE_SESSION_MS) {
  const now = Date.now();
  for (const sessionId of listSessions()) {
    const session = loadSession(sessionId);
    if (!session) {
      deleteSession(sessionId);
      continue;
    }
    const createdAt = new Date(session.createdAt).getTime();
    if (now - createdAt > maxAgeMs) {
      deleteSession(sessionId);
    }
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
  if (!session) return;
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
