/**
 * box-renderer.mjs
 *
 * ANSI 컬러 헬퍼와 다중 행 박스 UI 렌더러.
 * 2열 × 3행의 레이블 박스를 그린다:
 *
 *   CORE   | SUPPLY
 *   GIT    | PLUGIN
 */

// ---------------------------------------------------------------------------
// ANSI 헬퍼
// ---------------------------------------------------------------------------

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
 * 문자열의 터미널에서의 가시 폭을 측정한다.
 * 동아시아 전각 문자(CJK, 한글 등)는 2칸을 차지한다.
 *
 * @param {string} s
 * @returns {number} 가시 폭(칸 수).
 */
export function visibleWidth(s) {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0);
    // CJK 통합 한자, 한글 음절, 전각 형태, CJK 호환 등.
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||  // Hangul Jamo
      (cp >= 0x2e80 && cp <= 0x303e) ||  // CJK 부수, 강희, CJK 기호
      (cp >= 0x3040 && cp <= 0x33bf) ||  // 히라가나, 가타카나, CJK 호환
      (cp >= 0x3400 && cp <= 0x4dbf) ||  // CJK 통합 확장 A
      (cp >= 0x4e00 && cp <= 0xa4cf) ||  // CJK 통합, Yi
      (cp >= 0xac00 && cp <= 0xd7af) ||  // 한글 음절
      (cp >= 0xf900 && cp <= 0xfaff) ||  // CJK 호환 한자
      (cp >= 0xfe30 && cp <= 0xfe6f) ||  // CJK 호환 형태
      (cp >= 0xff01 && cp <= 0xff60) ||  // 전각 형태
      (cp >= 0xffe0 && cp <= 0xffe6) ||  // 전각 기호
      (cp >= 0x20000 && cp <= 0x2fffd) || // CJK 확장 B+
      (cp >= 0x30000 && cp <= 0x3fffd)    // CJK 확장 G+
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

/**
 * 가시 폭 기준으로 문자열의 오른쪽을 공백으로 패딩한다.
 *
 * @param {string} s
 * @param {number} width - 목표 가시 폭.
 * @returns {string}
 */
export function pad(s, width) {
  const vw = visibleWidth(s);
  const diff = width - vw;
  return diff > 0 ? s + " ".repeat(diff) : s;
}

// ---------------------------------------------------------------------------
// 색상 임계값
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 박스 빌더
// ---------------------------------------------------------------------------

/**
 * 동적 행을 가진 2열 박스를 만든다.
 *
 * @param {Object} sections
 * @param {string[]} sections.core   - CORE(좌상단) 라인들.
 * @param {string[]} sections.supply - SUPPLY(우상단) 라인들.
 * @param {string[]} sections.git    - GIT(좌하단) 라인들.
 * @param {string[]|null} sections.plugin - PLUGIN(우하단) 라인들. null 이면 숨김.
 * @returns {string} 줄바꿈으로 이어진 박스 문자열.
 */
export function buildBox({ core, supply, git, plugin }) {
  // 컨텐츠로부터 컬럼 너비를 계산한다.
  const leftLines  = [...core, ...git];
  const rightLines = [...supply, ...(plugin || [])];

  const leftWidth  = Math.max(18, ...leftLines.map(l => visibleWidth(l)));
  const rightWidth = Math.max(18, ...rightLines.map(l => visibleWidth(l)));

  const lw = leftWidth + 2;   // 좌우 패딩 +2
  const rw = rightWidth + 2;

  // 레이블
  const coreLabel   = yellow("CORE");
  const supplyLabel = cyan("SUPPLY");
  const gitLabel    = yellow("GIT");
  const pluginLabel = cyan("PLUGIN");

  // 헬퍼
  const hLine = (w, label, ch = "─") => {
    const labelLen = visibleWidth(label);
    const after = Math.max(0, w - labelLen - 3);
    return `${ch} ${label} ${"─".repeat(after)}`;
  };

  const row = (left, right) =>
    `│ ${pad(left, leftWidth)} │ ${pad(right, rightWidth)} │`;

  // 행 조립
  const lines = [];

  // 상단 테두리
  lines.push(`┌${hLine(lw, coreLabel)}┬${hLine(rw, supplyLabel)}┐`);

  // CORE / SUPPLY 행(라인 수를 맞춘다)
  const topRows = Math.max(core.length, supply.length);
  for (let i = 0; i < topRows; i++) {
    lines.push(row(core[i] || "", supply[i] || ""));
  }

  if (plugin && plugin.length > 0) {
    // 중간 구분선
    lines.push(`├${hLine(lw, gitLabel)}┼${hLine(rw, pluginLabel)}┤`);

    // GIT / PLUGIN 행
    const bottomRows = Math.max(git.length, plugin.length);
    for (let i = 0; i < bottomRows; i++) {
      lines.push(row(git[i] || "", plugin[i] || ""));
    }
  } else {
    // PLUGIN 섹션이 없으면 GIT 이 전체 폭을 차지한다.
    const fullInner = lw + 1 + rw; // left + ┼ + right
    lines.push(`├${hLine(fullInner, gitLabel)}┤`);

    const fullContent = leftWidth + 3 + rightWidth;
    for (let i = 0; i < git.length; i++) {
      lines.push(`│ ${pad(git[i], fullContent)} │`);
    }
    lines.push(`└${"─".repeat(fullInner)}┘`);
    return lines.join("\n");
  }

  // 하단 테두리
  lines.push(`└${"─".repeat(lw)}┴${"─".repeat(rw)}┘`);

  return lines.join("\n");
}
