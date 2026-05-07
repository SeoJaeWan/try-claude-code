#!/usr/bin/env node

// print-transitions — render the runner-state-machine's status enum and
// allowed transitions as a Markdown table. Used as the single source for
// the routing/transition table in SKILL.md and plan-state-recovery.md so
// neither file drifts from `lib/runner-state-machine.mjs`.
//
// Usage:
//   node scripts/print-transitions.mjs           # prints to stdout
//   node scripts/print-transitions.mjs --check   # exits non-zero if the
//                                                  prose tables in SKILL.md
//                                                  are stale (future hook)

import {
  ALLOWED_TRANSITIONS,
  STATUS,
  STATUS_VALUES,
  TERMINAL_STATUSES,
} from "./lib/runner-state-machine.mjs";

function renderStatusTable() {
  const rows = [...STATUS_VALUES].map((s) => {
    const terminal = TERMINAL_STATUSES.has(s) ? "✓" : "";
    return `| \`${s}\` | ${terminal} |`;
  });
  return [
    "| status | terminal |",
    "|---|---|",
    ...rows,
  ].join("\n");
}

function renderTransitionsTable() {
  const rows = [];
  for (const [from, toSet] of ALLOWED_TRANSITIONS) {
    const fromLabel = from === null ? "_(initial)_" : `\`${from}\``;
    const toList = [...toSet].map((s) => `\`${s}\``).join(", ") || "—";
    rows.push(`| ${fromLabel} | ${toList} |`);
  }
  return [
    "| from | allowed next |",
    "|---|---|",
    ...rows,
  ].join("\n");
}

const out = [
  "## Status enum",
  "",
  renderStatusTable(),
  "",
  "## Allowed transitions",
  "",
  renderTransitionsTable(),
  "",
];

process.stdout.write(out.join("\n"));
