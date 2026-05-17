// Append-only diagnostics log for the Stop hook (and any future hook that
// wants to leave breadcrumbs). The file lives under
// `$CLAUDE_PLUGIN_DATA/logs/stop-hook.log` and is intended to be inspected
// after the fact when a hook either misbehaves or — more often — appears to
// not fire at all. The absence of a fresh `invoked` line for a turn that
// should have triggered the Stop event is a positive signal that Claude
// Code never triggered the hook, as opposed to the hook firing and exiting
// silently.
//
// Format: one JSON object per line (JSONL). Each entry MUST carry an `event`
// key and a `ts` ISO timestamp; everything else is event-specific. Writes are
// synchronous so a process kill mid-hook still flushes whatever has been
// logged so far.
//
// Rotation: when the file passes ROTATION_BYTES we rename it to
// `stop-hook.log.old` (replacing any prior backup) and start fresh. Two files
// at ROTATION_BYTES each cap disk usage at roughly 10 MB without needing a
// background cleanup task.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const FALLBACK_LOGS_DIR = path.join(os.tmpdir(), "codex-companion", "logs");
const STOP_HOOK_LOG = "stop-hook.log";
const ROTATION_BYTES = 5 * 1024 * 1024; // 5 MB

function resolveLogsDir() {
  const pluginDataDir = process.env[PLUGIN_DATA_ENV];
  return pluginDataDir ? path.join(pluginDataDir, "logs") : FALLBACK_LOGS_DIR;
}

function resolveStopHookLogPath() {
  return path.join(resolveLogsDir(), STOP_HOOK_LOG);
}

function ensureLogsDir() {
  fs.mkdirSync(resolveLogsDir(), { recursive: true });
}

function rotateIfNeeded(filePath) {
  let size = 0;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    return; // file does not exist yet, nothing to rotate
  }
  if (size < ROTATION_BYTES) return;
  const backup = `${filePath}.old`;
  try {
    fs.renameSync(filePath, backup); // overwrites prior .old on Windows + POSIX
  } catch (err) {
    // Best-effort rotation. If rotation fails, continue appending — disk
    // usage is bounded by the user's free space, not our policy.
    process.stderr.write(`[diagnostics] rotation failed: ${err.message}\n`);
  }
}

// Append a JSONL line. All writes are synchronous and swallow errors —
// diagnostics must never break the host hook. The caller passes the event
// name and a payload object; we attach `ts` automatically.
export function logStopHookEvent(event, payload = {}) {
  let filePath;
  try {
    ensureLogsDir();
    filePath = resolveStopHookLogPath();
    rotateIfNeeded(filePath);
  } catch (err) {
    process.stderr.write(`[diagnostics] setup failed: ${err.message}\n`);
    return;
  }
  const entry = {
    ts: new Date().toISOString(),
    event,
    pid: process.pid,
    ...payload,
  };
  try {
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (err) {
    process.stderr.write(`[diagnostics] write failed: ${err.message}\n`);
  }
}

// Exposed for tests that need to inspect the log location.
export function getStopHookLogPath() {
  return resolveStopHookLogPath();
}
