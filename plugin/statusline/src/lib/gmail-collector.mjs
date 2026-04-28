/**
 * gmail-collector.mjs
 *
 * Gmail unread count collector.
 * Uses the Google Workspace CLI (`gws`) to fetch UNREAD label info.
 * Ported from claude-code-status gmail.ts.
 */

import { spawn } from "node:child_process";
import process from "node:process";
import { writeCacheFile, acquireLock, releaseLock } from "./status-cache.mjs";

const SERVICE = "gmail";
const TTL_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

function classifyError(err, exitCode) {
  const msg = err instanceof Error ? err.message : String(err);

  if (exitCode === 2 || /auth|credentials|login|401|403|unauthorized|forbidden/i.test(msg)) {
    return { errorKind: "auth", detail: `Gmail auth error: ${msg}` };
  }
  if (/not found|ENOENT|gws/i.test(msg) && /command|spawn/i.test(msg)) {
    return { errorKind: "dependency", detail: "gws CLI not found. Install: npm install -g @googleworkspace/cli" };
  }
  if (/429|rateLimitExceeded|rate.?limit/i.test(msg)) {
    return { errorKind: "rate_limit", detail: `Gmail rate limit: ${msg}` };
  }
  if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network|socket|timeout/i.test(msg)) {
    return { errorKind: "transient", detail: `Network error: ${msg}` };
  }
  return { errorKind: "unknown", detail: msg };
}

// ---------------------------------------------------------------------------
// Run gws command
// ---------------------------------------------------------------------------

// Route Windows commands through cmd.exe so that `gws.cmd` (the shape an
// npm-installed CLI takes on Windows) resolves without `shell: true` + args,
// which triggers Node's DEP0190 deprecation. POSIX spawns directly.
function buildGwsSpec(args) {
  if (process.platform !== "win32") {
    return { command: "gws", args };
  }
  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", "gws", ...args],
  };
}

function runGws(args) {
  return new Promise((resolve) => {
    const spec = buildGwsSpec(args);
    let stdout = "";
    let stderr = "";
    const child = spawn(spec.command, spec.args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => child.kill(), 15_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err?.message ?? String(err), exitCode: -1 });
    });
  });
}

// ---------------------------------------------------------------------------
// Fetch UNREAD label
// ---------------------------------------------------------------------------

async function fetchUnreadCount() {
  const { stdout, stderr, exitCode } = await runGws([
    "gmail", "users", "labels", "get",
    "--params", '{"userId":"me","id":"UNREAD"}',
  ]);

  if (exitCode !== 0) {
    const err = new Error(stderr.trim() || stdout.trim() || `gws exited with code ${exitCode}`);
    err.exitCode = exitCode;
    throw err;
  }

  const parsed = JSON.parse(stdout);
  if (parsed.messagesUnread === undefined) {
    throw new Error(`Missing messagesUnread: ${stdout.slice(0, 200)}`);
  }
  return parsed.messagesUnread;
}

// ---------------------------------------------------------------------------
// Main collect
// ---------------------------------------------------------------------------

export async function collect() {
  if (!acquireLock(SERVICE)) return;

  const now = new Date().toISOString();
  let result;

  try {
    const count = await fetchUnreadCount();
    result = {
      value: count,
      status: "ok",
      fetchedAt: now,
      ttlMs: TTL_MS,
      errorKind: null,
      detail: null,
      source: SERVICE,
    };
  } catch (err) {
    const exitCode = err?.exitCode;
    const { errorKind, detail } = classifyError(err, exitCode);
    result = {
      value: null,
      status: "error",
      fetchedAt: now,
      ttlMs: TTL_MS,
      errorKind,
      detail,
      source: SERVICE,
    };
  }

  writeCacheFile(SERVICE, result);
  releaseLock(SERVICE);
}
