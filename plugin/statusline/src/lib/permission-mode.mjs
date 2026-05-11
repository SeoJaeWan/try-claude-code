/**
 * permission-mode.mjs
 *
 * Read the current session's permission mode from a transcript jsonl file.
 *
 * Claude Code does NOT expose the active permission mode through statusline
 * stdin. However, every transcript entry carries a `"permissionMode":"…"` key
 * with one of: "default", "plan", "auto" (acceptEdits), "bypassPermissions".
 *
 * We tail the last ~32 KB of the transcript and pick the most recent value.
 * This avoids loading large jsonl files while remaining accurate — statusline
 * is re-triggered on permission mode changes, so the tail will already contain
 * the new value by the time we read.
 */

import fs from "node:fs";

const TAIL_BYTES = 32 * 1024;
const MODE_REGEX = /"permissionMode"\s*:\s*"([^"]+)"/g;

/**
 * Read the most recent permissionMode from a transcript jsonl file.
 * Returns null if the file is missing, empty, or contains no permissionMode entries.
 *
 * @param {string|undefined} transcriptPath - absolute path to the .jsonl transcript
 * @returns {string|null}
 */
export function readPermissionMode(transcriptPath) {
  if (!transcriptPath) return null;

  let fd;
  try {
    const stats = fs.statSync(transcriptPath);
    if (stats.size === 0) return null;

    const readBytes = Math.min(stats.size, TAIL_BYTES);
    const offset = stats.size - readBytes;

    fd = fs.openSync(transcriptPath, "r");
    const buf = Buffer.alloc(readBytes);
    fs.readSync(fd, buf, 0, readBytes, offset);
    const text = buf.toString("utf8");

    let last = null;
    let m;
    MODE_REGEX.lastIndex = 0;
    while ((m = MODE_REGEX.exec(text)) !== null) {
      last = m[1];
    }
    return last;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
}
