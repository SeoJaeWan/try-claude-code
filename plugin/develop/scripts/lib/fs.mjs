import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function ensureAbsolutePath(cwd, maybePath) {
  return path.isAbsolute(maybePath) ? maybePath : path.resolve(cwd, maybePath);
}

// Convert path separators to POSIX style. Does not resolve or normalize segments.
export function toPosixPath(p) {
  if (!p) return "";
  return String(p).replace(/\\/g, "/");
}

// Collapse ./ and ../ segments and convert to POSIX separators. Relative paths
// stay relative; this does NOT resolve against the current working directory.
// Use when storing paths in JSON that should keep their original relativity.
export function normalizePath(p) {
  if (!p) return "";
  return toPosixPath(path.normalize(p));
}

// Resolve to an absolute POSIX-style path. Use when paths are passed between
// processes (hooks, subprocesses) or compared against a canonical location.
export function absoluteNormalizePath(p) {
  if (!p) return "";
  return toPosixPath(path.resolve(p));
}

// Compare two paths for equality. When both sides resolve on disk, defer to the
// OS via `realpathSync` (which canonicalizes case on Windows and follows links
// on POSIX); otherwise fall back to absolute POSIX-form string equality. Use
// this instead of raw string equality for worktree and session-stored paths.
export function comparePaths(a, b) {
  const na = absoluteNormalizePath(a);
  const nb = absoluteNormalizePath(b);
  if (!na || !nb) return na === nb;
  try {
    return fs.realpathSync.native(na) === fs.realpathSync.native(nb);
  } catch {
    return na === nb;
  }
}

export function createTempDir(prefix = "codex-plugin-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// Atomic JSON write: serialize, write to a sibling tempfile, then rename onto
// the target. `renameSync` is atomic on both POSIX and Windows when source and
// target live on the same volume — which is always the case here because the
// tempfile is in the same directory as the target. Use this whenever a process
// kill, OS crash, or full disk mid-write would otherwise leave callers reading
// partially-written JSON. Plain `writeJsonFile` does not give that guarantee.
export function writeJsonAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`,
  );
  const body = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(tmp, body, "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    throw err;
  }
}

export function safeReadFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

export function isProbablyText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  for (const value of sample) {
    if (value === 0) {
      return false;
    }
  }
  return true;
}

export function readStdinIfPiped() {
  if (process.stdin.isTTY) {
    return "";
  }
  return fs.readFileSync(0, "utf8");
}
