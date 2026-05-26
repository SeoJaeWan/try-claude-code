/**
 * status-cache.mjs
 *
 * 캐시 읽기/쓰기, 락 관리, 백그라운드 갱신 조정자.
 * claude-code-status 의 coordinator.ts + cache.ts 에서 포팅.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// 경로
// ---------------------------------------------------------------------------

const STATUSLINE_DATA = path.join(os.homedir(), ".claude", "statusline");

/** 캐시 디렉터리 경로. */
function getCacheDir() {
  return path.join(STATUSLINE_DATA, "cache");
}

/** 락 디렉터리 경로. */
function getLockDir() {
  return path.join(STATUSLINE_DATA, "locks");
}

/**
 * 서비스별 캐시 파일 경로(JSON).
 *
 * @param {string} service
 * @returns {string}
 */
function getCachePath(service) {
  return path.join(getCacheDir(), `${service}.json`);
}

/**
 * 서비스별 락 파일 경로.
 *
 * @param {string} service
 * @returns {string}
 */
function getLockPath(service) {
  return path.join(getLockDir(), `${service}.lock`);
}

// ---------------------------------------------------------------------------
// 캐시 읽기
// ---------------------------------------------------------------------------

/**
 * 캐시된 수집기 결과를 읽는다. 파일이 없거나 읽을 수 없으면 null 반환.
 *
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
 * 캐시 결과가 TTL 이내(신선)한지 확인한다.
 *
 * @param {object} result - fetchedAt 와 ttlMs 를 가진 CollectorResult.
 * @returns {boolean}
 */
export function isFresh(result) {
  if (!result || !result.fetchedAt || !result.ttlMs) return false;
  const age = Date.now() - new Date(result.fetchedAt).getTime();
  return age < result.ttlMs;
}

// ---------------------------------------------------------------------------
// 캐시 쓰기 (원자적)
// ---------------------------------------------------------------------------

/**
 * 수집기 결과를 캐시 디렉터리에 원자적으로 기록한다(tmp + rename).
 *
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
// 락 관리
// ---------------------------------------------------------------------------

const LOCK_MAX_AGE_MS = 60_000;

/**
 * 서비스가 현재 락 상태인지 확인한다. 오래된 락(60초 초과)은 자동 제거 후
 * 락 해제로 처리한다.
 *
 * @param {string} service
 * @returns {boolean}
 */
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

/**
 * 락 파일을 배타적으로 생성(O_EXCL)해 락을 획득한다. 이미 존재하면 실패.
 *
 * @param {string} service
 * @returns {boolean} 획득 성공 여부.
 */
export function acquireLock(service) {
  try {
    fs.mkdirSync(getLockDir(), { recursive: true });
    fs.writeFileSync(getLockPath(service), String(process.pid), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

/**
 * 락 파일을 제거한다. 실패해도 무시한다(stale 락은 LOCK_MAX_AGE_MS 로 회수).
 *
 * @param {string} service
 */
export function releaseLock(service) {
  try {
    fs.unlinkSync(getLockPath(service));
  } catch {
    // 무시
  }
}

// ---------------------------------------------------------------------------
// 백그라운드 갱신
// ---------------------------------------------------------------------------

/**
 * 캐시가 stale 이고 락이 없으면 detached 자식 프로세스로 수집기를 띄운다.
 * 어떤 예외도 던지지 않는다 — stale 데이터를 보여주는 것이 허용 가능한
 * fallback 이기 때문이다.
 *
 * @param {string} service - 서비스명(예: "gmail").
 * @param {string} collectScript - 수집기 CLI 스크립트의 절대 경로.
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
    // 절대 throw 하지 않는다 — stale 데이터로 충분.
  }
}
