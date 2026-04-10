import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const FALLBACK_SESSIONS_DIR = path.join(os.tmpdir(), "codex-companion", "sessions");
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function normalizePath(p) {
  return path.normalize(p).replace(/\\/g, "/");
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
      stopReviewThreadId: parsed.stopReviewThreadId ?? null
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
