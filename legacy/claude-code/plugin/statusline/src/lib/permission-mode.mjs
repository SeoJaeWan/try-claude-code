/**
 * permission-mode.mjs
 *
 * 트랜스크립트 jsonl 파일에서 현재 세션의 permission mode 를 읽는다.
 *
 * Claude Code 는 statusline stdin 으로 활성 permission mode 를 노출하지
 * 않는다. 다만 모든 트랜스크립트 엔트리는 `"permissionMode":"…"` 키를 가지며,
 * 값은 "default", "plan", "auto"(acceptEdits), "bypassPermissions" 중 하나다.
 *
 * 트랜스크립트의 마지막 ~32 KB 만 tail 해서 가장 최근 값을 골라낸다. 큰
 * jsonl 파일을 통째로 로드하지 않으면서도 정확도를 유지한다 — permission
 * mode 가 바뀌면 statusline 이 재트리거되므로, 읽는 시점에 tail 영역에는
 * 이미 새 값이 들어와 있다.
 */

import fs from "node:fs";

const TAIL_BYTES = 32 * 1024;
const MODE_REGEX = /"permissionMode"\s*:\s*"([^"]+)"/g;

/**
 * 트랜스크립트 jsonl 파일에서 가장 최근의 permissionMode 값을 읽는다.
 * 파일이 없거나 비어 있거나 permissionMode 엔트리가 하나도 없으면 null 을
 * 반환한다.
 *
 * @param {string|undefined} transcriptPath - .jsonl 트랜스크립트의 절대 경로.
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
      try { fs.closeSync(fd); } catch { /* 무시 */ }
    }
  }
}
