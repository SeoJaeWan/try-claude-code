#!/usr/bin/env node

/**
 * status-line.mjs
 *
 * Multi-line box UI status line for Claude Code.
 *
 * Reads stdin JSON from Claude Code, external caches, and git state.
 * Outputs a box-drawn dashboard to stdout.
 *
 * ┌─ CORE ──────────────────────┬─ SUPPLY ──────────────────────┐
 * │ opus-4-6[1m]   ⏱ 8m 41s     │ CTX 11%   ~$1.90             │
 * │ week 3%   session 22%       │ 캐시 110kr 488w  적중 99%     │
 * ├─ GIT ───────────────────────┼─ PLUGIN ──────────────────────┤
 * │ main | task-A               │ gmail 7                       │
 * └─────────────────────────────┴───────────────────────────────┘
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import {
  buildBox,
  colorPct,
  colorCount,
  gray,
  white,
  yellow,
  cyan,
  green,
  red,
  stripAnsi,
} from "./lib/box-renderer.mjs";
import { readCache, isFresh, triggerRefreshIfStale } from "./lib/status-cache.mjs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PLUGIN_DATA = path.join(
  os.homedir(),
  ".claude",
  "plugins",
  "data",
  "try-claude-code-try-claude"
);

const COLLECT_SCRIPT = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
  "gmail-collect.mjs"
);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const STATUSLINE_DATA = path.join(os.homedir(), ".claude", "statusline");
const LAST_INPUT_CACHE = path.join(STATUSLINE_DATA, "cache", "_last_input.json");

// ---------------------------------------------------------------------------
// stdin + fallback cache
// ---------------------------------------------------------------------------

function readStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Merge current stdin with cached previous input.
 * If rate_limits/context_window/cost are missing from current input,
 * fall back to the last known values.
 */
function mergeWithCache(input) {
  let cached = {};
  try {
    cached = JSON.parse(fs.readFileSync(LAST_INPUT_CACHE, "utf8"));
  } catch { /* no cache yet */ }

  const merged = { ...input };
  if (!merged.rate_limits && cached.rate_limits) merged.rate_limits = cached.rate_limits;
  if (!merged.context_window && cached.context_window) merged.context_window = cached.context_window;
  if (!merged.cost && cached.cost) merged.cost = cached.cost;
  if (!merged.model && cached.model) merged.model = cached.model;

  // Save current input for next time (only if it has real data)
  if (input.rate_limits || input.context_window) {
    try {
      fs.mkdirSync(path.dirname(LAST_INPUT_CACHE), { recursive: true });
      fs.writeFileSync(LAST_INPUT_CACHE, JSON.stringify(input), "utf8");
    } catch { /* ignore */ }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTokens(n) {
  if (n == null) return gray("—");
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

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

function formatCost(usd) {
  if (usd == null) return gray("—");
  if (usd >= 10) return `$${usd.toFixed(1)}`;
  return `$${usd.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderCore(input) {
  const lines = [];

  // Line 1: model + duration
  const modelId = input.model?.id ?? "unknown";
  const duration = formatDuration(input.cost?.total_duration_ms);
  lines.push(`${white(modelId)}   ${gray("⏱")} ${duration}`);

  // Line 2: week% + session% (always show, placeholder if missing)
  const weekPct = input.rate_limits?.seven_day?.used_percentage;
  const sessPct = input.rate_limits?.five_hour?.used_percentage;
  const weekStr = weekPct != null ? colorPct(weekPct, Math.round(weekPct) + "%") : gray("—");
  const sessStr = sessPct != null ? colorPct(sessPct, Math.round(sessPct) + "%") : gray("—");
  lines.push(`${gray("week")} ${weekStr}   ${gray("session")} ${sessStr}`);

  return lines;
}

function renderSupply(input) {
  const lines = [];
  const ctx = input.context_window;
  const cost = input.cost;

  // Line 1: CTX% + cost (always show)
  const ctxPct = ctx?.used_percentage;
  const costUsd = cost?.total_cost_usd;
  const ctxStr = ctxPct != null ? colorPct(ctxPct, ctxPct + "%") : gray("—");
  const costStr = costUsd != null ? `${gray("~")}${white(formatCost(costUsd))}` : `${gray("~")}${gray("—")}`;
  lines.push(`${gray("CTX")} ${ctxStr}   ${costStr}`);

  // Line 2: cache tokens + hit rate (always show)
  const usage = ctx?.current_usage;
  if (usage) {
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const inputTk = usage.input_tokens ?? 0;
    const total = cacheRead + cacheWrite + inputTk;
    const hitRate = total > 0 ? Math.round((cacheRead / total) * 100) : 0;

    const readStr = formatTokens(cacheRead);
    const writeStr = formatTokens(cacheWrite);
    const hitColor = hitRate >= 90 ? green : hitRate >= 50 ? yellow : red;

    lines.push(
      `${gray("캐시")} ${cyan(readStr + "r")} ${gray(writeStr + "w")}  ${gray("적중")} ${hitColor(hitRate + "%")}`
    );
  } else {
    lines.push(`${gray("캐시")} ${gray("—")}`);
  }

  return lines;
}

function renderGit(sessionId) {
  const parts = [];

  // Current branch
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
      timeout: 3000,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (branch) parts.push(white(branch));
  } catch {
    parts.push(gray("?"));
  }

  // Worktree branches from session file
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
      // No session file or parse error — ignore
    }
  }

  return [parts.join(` ${gray("|")} `)];
}

function renderPlugin() {
  const segments = [];

  // Gmail
  const gmailCache = readCache("gmail");
  triggerRefreshIfStale("gmail", COLLECT_SCRIPT);

  if (gmailCache && gmailCache.status === "ok" && gmailCache.value != null) {
    const countStr = String(gmailCache.value);
    segments.push(`${gray("gmail")} ${colorCount(gmailCache.value, countStr)}`);
  }
  // Error or no cache → hide (don't show !)

  // Future services can be added here in the same pattern:
  // const tasksCache = readCache("tasks");
  // triggerRefreshIfStale("tasks", tasksCollectScript);
  // if (tasksCache && tasksCache.status === "ok" && tasksCache.value != null) { ... }

  if (segments.length === 0) return null;
  return [segments.join(` ${gray("|")} `)];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  try {
    const rawInput = readStdin();
    const input = mergeWithCache(rawInput);

    const core = renderCore(input);
    const supply = renderSupply(input);
    const git = renderGit(input.session_id);
    const plugin = renderPlugin();

    const output = buildBox({ core, supply, git, plugin });

    process.stdout.write(output + "\n");
  } catch (err) {
    process.stderr.write(`[status-line] ERROR: ${err?.message ?? err}\n`);
    process.stdout.write("status: error\n");
  }
  process.exit(0);
}

main();
