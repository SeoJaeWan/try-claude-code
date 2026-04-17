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
    worktrees: [],
    stopReviewThreadId: null
  };
  fs.writeFileSync(resolveSessionFile(sessionId), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  return session;
}

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
      worktrees: Array.isArray(parsed.worktrees) ? parsed.worktrees : [],
      stopReviewThreadId: parsed.stopReviewThreadId ?? null,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      blockHistory: Array.isArray(parsed.blockHistory) ? parsed.blockHistory : []
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
    "utf8"
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

export function addWorktree(sessionId, worktreePath, branch) {
  const session = loadSession(sessionId);
  if (!session) {
    return;
  }
  const normalized = normalizePath(worktreePath);
  const exists = session.worktrees.some((wt) => normalizePath(wt.path) === normalized);
  if (exists) {
    return;
  }
  session.worktrees.push({
    path: normalized,
    branch: branch || null,
    addedAt: nowIso(),
    lastReviewedCommit: null
  });
  saveSession(session);
}

export function updateWorktreeReviewedCommit(sessionId, worktreePath, commitSha) {
  const session = loadSession(sessionId);
  if (!session) {
    return;
  }
  const normalized = normalizePath(worktreePath);
  const wt = session.worktrees.find((w) => normalizePath(w.path) === normalized);
  if (wt) {
    wt.lastReviewedCommit = commitSha;
    saveSession(session);
  }
}

export function updateWorktreePhase(sessionId, worktreePath, phase) {
  const session = loadSession(sessionId);
  if (!session) {
    return;
  }
  const normalized = normalizePath(worktreePath);
  const wt = session.worktrees.find((w) => normalizePath(w.path) === normalized);
  if (wt) {
    wt.currentPhase = phase;
    saveSession(session);
  }
}

export function getStopReviewThreadId(sessionId) {
  const session = loadSession(sessionId);
  return session?.stopReviewThreadId ?? null;
}

export function setStopReviewThreadId(sessionId, threadId) {
  const session = loadSession(sessionId);
  if (!session) {
    return;
  }
  session.stopReviewThreadId = threadId;
  saveSession(session);
}

export function removeWorktree(sessionId, worktreePath) {
  const session = loadSession(sessionId);
  if (!session) {
    return;
  }
  const normalized = normalizePath(worktreePath);
  session.worktrees = session.worktrees.filter((wt) => normalizePath(wt.path) !== normalized);
  saveSession(session);
}

// Append a contract-drift warning to the session. Stop-gate consumes these and
// injects them into the review prompt so drift is surfaced to the reviewer.
export function addSessionWarning(sessionId, warning) {
  const session = loadSession(sessionId);
  if (!session) {
    return;
  }
  session.warnings = session.warnings || [];
  session.warnings.push({
    at: nowIso(),
    kind: warning.kind ?? "unknown",
    detail: warning.detail ?? "",
    sample: warning.sample ?? null
  });
  // Cap to last 20 to keep session file bounded.
  if (session.warnings.length > 20) {
    session.warnings = session.warnings.slice(-20);
  }
  saveSession(session);
}

// Read warnings and clear them atomically. Returns [] if none.
export function consumeSessionWarnings(sessionId) {
  const session = loadSession(sessionId);
  if (!session || !Array.isArray(session.warnings) || session.warnings.length === 0) {
    return [];
  }
  const warnings = session.warnings;
  session.warnings = [];
  saveSession(session);
  return warnings;
}

// Record a BLOCK decision by its fingerprint (sha256 of the normalized reason).
// If the most recent block has the same fingerprint, increment its count;
// otherwise append a new entry with count=1. Returns { fingerprint, count }.
export function recordBlock(sessionId, fingerprint) {
  const session = loadSession(sessionId);
  if (!session) {
    return { fingerprint, count: 1 };
  }
  session.blockHistory = session.blockHistory || [];
  const last = session.blockHistory[session.blockHistory.length - 1];
  if (last && last.fingerprint === fingerprint) {
    last.count = (last.count || 1) + 1;
    last.lastAt = nowIso();
  } else {
    session.blockHistory.push({
      fingerprint,
      count: 1,
      firstAt: nowIso(),
      lastAt: nowIso()
    });
  }
  // Cap block history to last 10 entries.
  if (session.blockHistory.length > 10) {
    session.blockHistory = session.blockHistory.slice(-10);
  }
  saveSession(session);
  const current = session.blockHistory[session.blockHistory.length - 1];
  return { fingerprint: current.fingerprint, count: current.count };
}

// Called when stop-gate returns ALLOW. Clears consecutive-BLOCK tracking so a
// later BLOCK with the same fingerprint starts fresh at count=1.
export function clearRecentBlockStreak(sessionId) {
  const session = loadSession(sessionId);
  if (!session || !Array.isArray(session.blockHistory) || session.blockHistory.length === 0) {
    return;
  }
  // Keep the history for auditability but mark the streak as broken by
  // appending a synthetic "allow" separator.
  const last = session.blockHistory[session.blockHistory.length - 1];
  if (last && last.fingerprint !== "__allow__") {
    session.blockHistory.push({
      fingerprint: "__allow__",
      count: 1,
      firstAt: nowIso(),
      lastAt: nowIso()
    });
    if (session.blockHistory.length > 10) {
      session.blockHistory = session.blockHistory.slice(-10);
    }
    saveSession(session);
  }
}
