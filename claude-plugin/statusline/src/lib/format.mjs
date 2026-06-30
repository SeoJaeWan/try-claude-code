/**
 * format.mjs
 *
 * ANSI 컬러 헬퍼와 퍼센트 기반 색상화 유틸.
 */

const R = "\x1b[0m";

/** ANSI 색을 입혀 반환하는 헬퍼들. 종료에 reset(R) 을 붙인다. */
export const red    = (s) => `\x1b[31m${s}${R}`;
export const green  = (s) => `\x1b[32m${s}${R}`;
export const yellow = (s) => `\x1b[33m${s}${R}`;
export const cyan   = (s) => `\x1b[36m${s}${R}`;
export const gray   = (s) => `\x1b[90m${s}${R}`;
export const white  = (s) => `\x1b[97m${s}${R}`;
export const bold   = (s) => `\x1b[1m${s}${R}`;

/**
 * ANSI 이스케이프 시퀀스를 제거해 plain text 만 반환한다.
 *
 * @param {string} s
 * @returns {string}
 */
export function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * 퍼센트 값에 따라 색을 다르게 입힌다.
 * 80↑ 빨강 / 60↑ 노랑 / 30↑ 시안 / 그 외 초록.
 *
 * @param {number} pct
 * @param {string} text
 * @returns {string}
 */
export function colorPct(pct, text) {
  if (pct >= 80) return red(text);
  if (pct >= 60) return yellow(text);
  if (pct >= 30) return cyan(text);
  return green(text);
}
