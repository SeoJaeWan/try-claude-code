/**
 * gmail-collector.mjs
 *
 * Gmail 미읽음 메일 수 수집기.
 * Google Workspace CLI(`gws`)를 사용해 UNREAD 라벨 정보를 가져온다.
 * claude-code-status 의 gmail.ts 에서 포팅.
 */

import { spawn } from "node:child_process";
import process from "node:process";
import { writeCacheFile, acquireLock, releaseLock } from "./status-cache.mjs";

const SERVICE = "gmail";
const TTL_MS = 60_000; // 1분

// ---------------------------------------------------------------------------
// 에러 분류
// ---------------------------------------------------------------------------

/**
 * gws 호출 실패의 메시지/종료 코드를 분류해 사람이 읽기 좋은 카테고리와
 * detail 문자열을 반환한다.
 *
 * @param {unknown} err - 던져진 에러 또는 메시지.
 * @param {number} [exitCode] - gws 가 반환한 종료 코드.
 * @returns {{errorKind: string, detail: string}}
 */
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
// gws 실행
// ---------------------------------------------------------------------------

/**
 * Windows 에서는 cmd.exe 를 거쳐 `gws.cmd`(npm 글로벌 CLI 가 가지는 형태)
 * 가 해석되도록 spawn 사양을 만든다. `shell: true` + args 조합이 Node 의
 * DEP0190 경고를 일으키기 때문에 우회한다. POSIX 는 그대로 spawn 한다.
 *
 * @param {string[]} args - gws 에 넘길 인자.
 * @returns {{command: string, args: string[]}}
 */
function buildGwsSpec(args) {
  if (process.platform !== "win32") {
    return { command: "gws", args };
  }
  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", "gws", ...args],
  };
}

/**
 * gws 를 자식 프로세스로 실행하고 stdout/stderr/exitCode 를 모아 반환한다.
 * 15초 타임아웃이 걸려 있으며, spawn error 도 exitCode=-1 로 정상 응답한다.
 *
 * @param {string[]} args
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
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
// UNREAD 라벨 조회
// ---------------------------------------------------------------------------

/**
 * gws gmail.users.labels.get 으로 UNREAD 라벨을 조회해 messagesUnread 값을
 * 반환한다. 실패 시 exitCode 가 부착된 Error 를 던진다.
 *
 * @returns {Promise<number>} 미읽음 메일 수.
 */
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
// 메인 수집
// ---------------------------------------------------------------------------

/**
 * 락을 획득한 뒤 미읽음 메일 수를 가져와 캐시 파일에 기록한다. 락 획득에
 * 실패하면 즉시 반환한다(다른 프로세스가 처리 중).
 */
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
