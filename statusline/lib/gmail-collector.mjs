/**
 * gmail-collector.mjs
 *
 * Gmail unread count collector.
 * Uses the Google Workspace CLI (`gws`) to fetch UNREAD label info.
 * Ported from claude-code-status gmail.ts.
 */

import { exec } from "node:child_process";
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

function runGws(args) {
  const escaped = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ");
  return new Promise((resolve) => {
    exec(`gws ${escaped}`, { timeout: 15_000, windowsHide: true }, (err, stdout, stderr) => {
      const exitCode = err && "code" in err ? err.code : 0;
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
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
