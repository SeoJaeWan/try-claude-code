/**
 * box-renderer.mjs
 *
 * ANSI color helpers and multi-line box UI renderer.
 * Draws a 2-column, 3-row box with labeled sections:
 *
 *   CORE   | SUPPLY
 *   GIT    | PLUGIN
 */

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const R = "\x1b[0m";

export const red    = (s) => `\x1b[31m${s}${R}`;
export const green  = (s) => `\x1b[32m${s}${R}`;
export const yellow = (s) => `\x1b[33m${s}${R}`;
export const cyan   = (s) => `\x1b[36m${s}${R}`;
export const gray   = (s) => `\x1b[90m${s}${R}`;
export const white  = (s) => `\x1b[97m${s}${R}`;
export const bold   = (s) => `\x1b[1m${s}${R}`;

/** Strip ANSI escape sequences. */
export function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Measure visible terminal width of a string.
 * East Asian full-width characters (CJK, Hangul, etc.) take 2 columns.
 */
export function visibleWidth(s) {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0);
    // CJK Unified Ideographs, Hangul Syllables, Fullwidth Forms, CJK Compat, etc.
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||  // Hangul Jamo
      (cp >= 0x2e80 && cp <= 0x303e) ||  // CJK Radicals, Kangxi, CJK Symbols
      (cp >= 0x3040 && cp <= 0x33bf) ||  // Hiragana, Katakana, CJK Compat
      (cp >= 0x3400 && cp <= 0x4dbf) ||  // CJK Unified Ext A
      (cp >= 0x4e00 && cp <= 0xa4cf) ||  // CJK Unified, Yi
      (cp >= 0xac00 && cp <= 0xd7af) ||  // Hangul Syllables
      (cp >= 0xf900 && cp <= 0xfaff) ||  // CJK Compat Ideographs
      (cp >= 0xfe30 && cp <= 0xfe6f) ||  // CJK Compat Forms
      (cp >= 0xff01 && cp <= 0xff60) ||  // Fullwidth Forms
      (cp >= 0xffe0 && cp <= 0xffe6) ||  // Fullwidth Signs
      (cp >= 0x20000 && cp <= 0x2fffd) || // CJK Ext B+
      (cp >= 0x30000 && cp <= 0x3fffd)    // CJK Ext G+
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

/** Pad string to `width` based on visible terminal width. */
export function pad(s, width) {
  const vw = visibleWidth(s);
  const diff = width - vw;
  return diff > 0 ? s + " ".repeat(diff) : s;
}

// ---------------------------------------------------------------------------
// Color thresholds
// ---------------------------------------------------------------------------

export function colorPct(pct, text) {
  if (pct >= 80) return red(text);
  if (pct >= 60) return yellow(text);
  if (pct >= 30) return cyan(text);
  return green(text);
}

export function colorCount(count, text) {
  if (count === 0) return gray(text);
  if (count >= 30) return red(text);
  if (count >= 10) return yellow(text);
  return white(text);
}

// ---------------------------------------------------------------------------
// Box builder
// ---------------------------------------------------------------------------

/**
 * Build a 2-column box with dynamic rows.
 *
 * @param {Object} sections
 * @param {string[]} sections.core   - Lines for CORE (top-left)
 * @param {string[]} sections.supply - Lines for SUPPLY (top-right)
 * @param {string[]} sections.git    - Lines for GIT (bottom-left)
 * @param {string[]|null} sections.plugin - Lines for PLUGIN (bottom-right), null = hide
 * @returns {string} Multi-line box string
 */
export function buildBox({ core, supply, git, plugin }) {
  // Calculate column widths from content
  const leftLines  = [...core, ...git];
  const rightLines = [...supply, ...(plugin || [])];

  const leftWidth  = Math.max(18, ...leftLines.map(l => visibleWidth(l)));
  const rightWidth = Math.max(18, ...rightLines.map(l => visibleWidth(l)));

  const lw = leftWidth + 2;   // +2 for padding
  const rw = rightWidth + 2;

  // Labels
  const coreLabel   = yellow("CORE");
  const supplyLabel = cyan("SUPPLY");
  const gitLabel    = yellow("GIT");
  const pluginLabel = cyan("PLUGIN");

  // Helpers
  const hLine = (w, label, ch = "─") => {
    const labelLen = visibleWidth(label);
    const after = Math.max(0, w - labelLen - 3);
    return `${ch} ${label} ${"─".repeat(after)}`;
  };

  const row = (left, right) =>
    `│ ${pad(left, leftWidth)} │ ${pad(right, rightWidth)} │`;

  // Build rows
  const lines = [];

  // Top border
  lines.push(`┌${hLine(lw, coreLabel)}┬${hLine(rw, supplyLabel)}┐`);

  // Core / Supply rows (ensure same number of lines)
  const topRows = Math.max(core.length, supply.length);
  for (let i = 0; i < topRows; i++) {
    lines.push(row(core[i] || "", supply[i] || ""));
  }

  if (plugin && plugin.length > 0) {
    // Middle divider
    lines.push(`├${hLine(lw, gitLabel)}┼${hLine(rw, pluginLabel)}┤`);

    // Git / Plugin rows
    const bottomRows = Math.max(git.length, plugin.length);
    for (let i = 0; i < bottomRows; i++) {
      lines.push(row(git[i] || "", plugin[i] || ""));
    }
  } else {
    // No plugin section — GIT spans full width
    const fullInner = lw + 1 + rw; // left + ┼ + right
    lines.push(`├${hLine(fullInner, gitLabel)}┤`);

    const fullContent = leftWidth + 3 + rightWidth;
    for (let i = 0; i < git.length; i++) {
      lines.push(`│ ${pad(git[i], fullContent)} │`);
    }
    lines.push(`└${"─".repeat(fullInner)}┘`);
    return lines.join("\n");
  }

  // Bottom border
  lines.push(`└${"─".repeat(lw)}┴${"─".repeat(rw)}┘`);

  return lines.join("\n");
}
