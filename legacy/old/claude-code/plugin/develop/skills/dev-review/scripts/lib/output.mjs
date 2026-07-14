import fs from "node:fs";
import path from "node:path";

/**
 * 디렉터리가 없으면 재귀적으로 생성한다.
 *
 * @param {string} dir - 보장할 디렉터리 경로.
 */
export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * JSON 값을 임시 파일에 쓴 뒤 renameSync 로 원자적으로 교체한다.
 * 부모 디렉터리는 필요 시 자동 생성된다.
 *
 * @param {string} filePath - 기록할 파일 절대 경로.
 * @param {*} value - JSON 직렬화 가능한 값.
 */
export function writeJsonAtomic(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const body = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, filePath);
}

/**
 * 텍스트를 임시 파일에 쓴 뒤 renameSync 로 원자적으로 교체한다.
 *
 * @param {string} filePath - 기록할 파일 절대 경로.
 * @param {string} value - 파일 내용.
 */
export function writeTextAtomic(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, value, "utf8");
  fs.renameSync(tmp, filePath);
}
