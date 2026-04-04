/**
 * status-cache.mjs
 *
 * Cache read/write, lock management, and background refresh coordinator.
 * Ported from claude-code-status coordinator.ts + cache.ts.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const STATUSLINE_DATA = path.join(os.homedir(), ".claude", "statusline");

function getCacheDir() {
  return path.join(STATUSLINE_DATA, "cache");
}

function getLockDir() {
  return path.join(STATUSLINE_DATA, "locks");
}

function getCachePath(service) {
  return path.join(getCacheDir(), `${service}.json`);
}

function getLockPath(service) {
  return path.join(getLockDir(), `${service}.lock`);
}

// ---------------------------------------------------------------------------
// Cache read
// ---------------------------------------------------------------------------

/**
 * Read a cached collector result. Returns null if not found or unreadable.
 * @param {string} service
 * @returns {object|null}
 */
export function readCache(service) {
  try {
    const raw = fs.readFileSync(getCachePath(service), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if a cached result is still fresh (within TTL).
 * @param {object} result - CollectorResult with fetchedAt and ttlMs
 * @returns {boolean}
 */
export function isFresh(result) {
  if (!result || !result.fetchedAt || !result.ttlMs) return false;
  const age = Date.now() - new Date(result.fetchedAt).getTime();
  return age < result.ttlMs;
}

// ---------------------------------------------------------------------------
// Cache write (atomic)
// ---------------------------------------------------------------------------

/**
 * Atomically write a collector result to the cache directory.
 * @param {string} service
 * @param {object} data
 */
export function writeCacheFile(service, data) {
  const cacheDir = getCacheDir();
  fs.mkdirSync(cacheDir, { recursive: true });

  const finalPath = getCachePath(service);
  const tmpPath = finalPath + ".tmp";

  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpPath, finalPath);
}

// ---------------------------------------------------------------------------
// Lock management
// ---------------------------------------------------------------------------

const LOCK_MAX_AGE_MS = 60_000;

function isLocked(service) {
  try {
    const stat = fs.statSync(getLockPath(service));
    if (Date.now() - stat.mtimeMs > LOCK_MAX_AGE_MS) {
      fs.unlinkSync(getLockPath(service));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(service) {
  try {
    fs.mkdirSync(getLockDir(), { recursive: true });
    fs.writeFileSync(getLockPath(service), String(process.pid), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(service) {
  try {
    fs.unlinkSync(getLockPath(service));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Background refresh
// ---------------------------------------------------------------------------

/**
 * If cache is stale and not locked, spawn a detached collector process.
 * @param {string} service - Service name (e.g. "gmail")
 * @param {string} collectScript - Absolute path to the collector CLI script
 */
export function triggerRefreshIfStale(service, collectScript) {
  try {
    const cache = readCache(service);
    if (cache && isFresh(cache)) return;
    if (isLocked(service)) return;
    if (!fs.existsSync(collectScript)) return;

    const child = spawn(process.execPath, [collectScript], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env },
    });

    child.unref();
  } catch {
    // Never throw — stale data is acceptable
  }
}
