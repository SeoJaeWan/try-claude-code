#!/usr/bin/env node

/**
 * status-line.mjs
 *
 * Claude Code 의 상태줄 — 1줄 인라인 출력.
 *
 * Claude Code 가 주는 stdin JSON 과 git 상태를 읽어 핵심 지표를 한 줄로
 * 압축해 출력한다.
 *
 * 예시 출력:
 * sonnet-4-6 │ ⏱50m │ CTX:13% ~$1.14 │ 5h:17%(3h12m↓) │ 7d:17%(2d14h↓) │ main
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import {
  colorPct,
  gray,
  white,
  yellow,
  cyan,
  green,
  red,
  stripAnsi,
} from "./lib/format.mjs";
import { readPermissionMode } from "./lib/permission-mode.mjs";

// ---------------------------------------------------------------------------
// 경로
// ---------------------------------------------------------------------------

const PLUGIN_DATA = path.join(
  os.homedir(),
  ".claude",
  "plugins",
  "data",
  "try-claude-code-try-claude"
);

const STATUSLINE_DATA = path.join(os.homedir(), ".claude", "statusline");
const LAST_INPUT_CACHE = path.join(STATUSLINE_DATA, "cache", "_last_input.json");

// ---------------------------------------------------------------------------
// stdin + fallback 캐시
// ---------------------------------------------------------------------------

/**
 * stdin 으로 들어온 JSON 을 파싱한다. 실패 시 빈 객체를 반환한다.
 *
 * @returns {object}
 */
function readStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 현재 stdin 입력과 직전 캐시를 병합한다.
 * 현재 입력에 rate_limits/context_window/cost 가 없으면 마지막으로 알려진
 * 값으로 fallback 한다. 실제 데이터가 들어있는 경우에만 캐시를 갱신한다.
 *
 * @param {object} input - 이번에 받은 stdin 객체.
 * @returns {object} 캐시와 병합된 입력 객체.
 */
function mergeWithCache(input) {
  let cached = {};
  try {
    cached = JSON.parse(fs.readFileSync(LAST_INPUT_CACHE, "utf8"));
  } catch { /* 아직 캐시 없음 */ }

  const merged = { ...input };
  if (!merged.rate_limits && cached.rate_limits) merged.rate_limits = cached.rate_limits;
  if (!merged.context_window && cached.context_window) merged.context_window = cached.context_window;
  if (!merged.cost && cached.cost) merged.cost = cached.cost;
  if (!merged.model && cached.model) merged.model = cached.model;

  // 다음 호출을 위해 현재 입력을 저장한다(실제 데이터가 들어있을 때만).
  if (input.rate_limits || input.context_window) {
    try {
      fs.mkdirSync(path.dirname(LAST_INPUT_CACHE), { recursive: true });
      fs.writeFileSync(LAST_INPUT_CACHE, JSON.stringify(input), "utf8");
    } catch { /* 무시 */ }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// 포맷 헬퍼
// ---------------------------------------------------------------------------

/**
 * Epoch(초) 시각까지 남은 시간을 사람이 읽기 좋은 문자열로 표시한다.
 * 60분 미만은 "5m", 24시간 미만은 "3h12m", 그 이상은 "2d14h" 형태.
 *
 * @param {number|null|undefined} resetsAtSec - 리셋 시각(Unix epoch, 초).
 * @returns {string|null}
 */
function formatTimeRemaining(resetsAtSec) {
  if (resetsAtSec == null) return null;
  const remainMs = resetsAtSec * 1000 - Date.now();
  if (remainMs <= 0) return "now";
  const totalMin = Math.floor(remainMs / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const totalH = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (totalH < 24) return m > 0 ? `${totalH}h${m}m` : `${totalH}h`;
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  return h > 0 ? `${d}d${h}h` : `${d}d`;
}

/**
 * 밀리초 길이를 "Xh Ym" 또는 "Ym" 형태로 표현한다.
 *
 * @param {number|null|undefined} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms == null) return gray("—");
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  }
  return `${totalMin}m`;
}

/**
 * USD 비용을 짧게 표현한다. $10 이상은 1자리, 미만은 2자리 소수.
 *
 * @param {number|null|undefined} usd
 * @returns {string}
 */
function formatCost(usd) {
  if (usd == null) return gray("—");
  if (usd >= 10) return `$${usd.toFixed(1)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * permission mode 레이블을 위험도에 따라 색상화한다. 알 수 없는 모드는
 * null 을 반환해 호출자가 렌더링을 건너뛸 수 있게 한다. `default` 는
 * 회색 처리한다.
 *
 * @param {string|null} mode
 * @returns {string|null}
 */
function formatPermissionMode(mode) {
  if (!mode) return null;
  switch (mode) {
    case "plan":              return cyan(mode);
    case "auto":              return yellow(mode);
    case "acceptEdits":       return yellow("auto");
    case "bypassPermissions": return red("bypass");
    case "default":           return gray(mode);
    default:                  return gray(mode);
  }
}

// ---------------------------------------------------------------------------
// 섹션 렌더러
// ---------------------------------------------------------------------------

/**
 * 현재 git 브랜치와 세션 파일에 기록된 워크트리 브랜치들을 한 줄로 반환한다.
 *
 * @param {string|undefined} sessionId
 * @returns {string[]}
 */
function renderGit(sessionId) {
  const parts = [];

  // 현재 브랜치
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], {
      encoding: "utf8",
      timeout: 3000,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (branch) parts.push(white(branch));
  } catch {
    parts.push(gray("?"));
  }

  // 세션 파일의 워크트리 브랜치
  if (sessionId) {
    try {
      const sessFile = path.join(PLUGIN_DATA, "sessions", sessionId + ".json");
      const session = JSON.parse(fs.readFileSync(sessFile, "utf8"));
      const branches = (session.worktrees || [])
        .map((wt) => wt.branch)
        .filter(Boolean);
      for (const b of branches) {
        parts.push(cyan(b));
      }
    } catch {
      // 세션 파일이 없거나 파싱 실패 — 무시
    }
  }

  return [parts.join(` ${gray("|")} `)];
}

// ---------------------------------------------------------------------------
// 인라인(단일 라인 압축) 렌더러
// ---------------------------------------------------------------------------

/**
 * 인라인 모드의 1줄 출력을 만든다. 박스 모드의 핵심 지표만 순서대로 나열한다.
 *
 * @param {object} input
 * @returns {string}
 */
function renderInline(input) {
  const parts = [];

  // 1. Git branch / worktree (가장 중요한 컨텍스트)
  const gitLines = renderGit(input.session_id);
  if (gitLines.length > 0 && stripAnsi(gitLines[0]).trim()) {
    parts.push(gitLines[0]);
  }

  // 2. 5시간 rate limit + 남은 시간
  const sessPct = input.rate_limits?.five_hour?.used_percentage;
  const sessLeft = formatTimeRemaining(input.rate_limits?.five_hour?.resets_at);
  if (sessPct != null) {
    const pctStr = colorPct(sessPct, Math.round(sessPct) + "%");
    const leftStr = sessLeft ? gray(`(${sessLeft}↓)`) : "";
    parts.push(`${gray("5h:")}${pctStr}${leftStr}`);
  }

  // 3. 7일 rate limit + 남은 시간
  const weekPct = input.rate_limits?.seven_day?.used_percentage;
  const weekLeft = formatTimeRemaining(input.rate_limits?.seven_day?.resets_at);
  if (weekPct != null) {
    const pctStr = colorPct(weekPct, Math.round(weekPct) + "%");
    const leftStr = weekLeft ? gray(`(${weekLeft}↓)`) : "";
    parts.push(`${gray("7d:")}${pctStr}${leftStr}`);
  }

  // 4. 모델 + mode 배지
  const modelId = input.model?.id ?? "unknown";
  const modeBadge = formatPermissionMode(readPermissionMode(input.transcript_path));
  parts.push(modeBadge ? `${white(modelId)} ${modeBadge}` : white(modelId));

  // 5. 누적 시간
  const duration = formatDuration(input.cost?.total_duration_ms);
  parts.push(`${gray("⏱")}${duration}`);

  // 6. 컨텍스트 사용률 + 누적 비용
  const ctxPct = input.context_window?.used_percentage;
  const costUsd = input.cost?.total_cost_usd;
  const ctxStr = ctxPct != null ? `${gray("CTX:")}${colorPct(ctxPct, ctxPct + "%")}` : `${gray("CTX:")}${gray("—")}`;
  const costStr = costUsd != null ? `${gray("~")}${white(formatCost(costUsd))}` : `${gray("~")}${gray("—")}`;
  parts.push(`${ctxStr} ${costStr}`);

  // 7. 캐시 hit rate
  const usage = input.context_window?.current_usage;
  if (usage) {
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const inputTk = usage.input_tokens ?? 0;
    const total = cacheRead + cacheWrite + inputTk;
    const hitRate = total > 0 ? Math.round((cacheRead / total) * 100) : 0;
    const hitColor = hitRate >= 90 ? green : hitRate >= 50 ? yellow : red;
    parts.push(`${gray("cache:")}${hitColor(hitRate + "%")}`);
  }

  return parts.join(gray(" │ "));
}

// ---------------------------------------------------------------------------
// 진입점
// ---------------------------------------------------------------------------

/**
 * stdin 을 읽고 인라인 한 줄을 stdout 으로 출력한다.
 * 어떤 에러도 statusline 을 죽이지 않는다 — stderr 로 메시지를 남기고
 * "status: error" 한 줄을 출력해 Claude Code 가 정상적으로 화면을 갱신할 수
 * 있게 한다.
 */
function main() {
  try {
    const rawInput = readStdin();
    const input = mergeWithCache(rawInput);
    process.stdout.write(renderInline(input) + "\n");
  } catch (err) {
    process.stderr.write(`[status-line] ERROR: ${err?.message ?? err}\n`);
    process.stdout.write("status: error\n");
  }
  process.exit(0);
}

main();
