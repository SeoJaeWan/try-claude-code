#!/usr/bin/env node

// CLI escape hatch for plans/{plan_dir}/.runner-state.json — minimal version.
//
// Phase 5 trim: this CLI used to support 5 flags. The kept set is the
// scenarios that actually fire in practice; the rest (rotate-plan-path,
// reset-block-history, bump-dev-round) had no real-world callers and can
// be handled with a one-line jq edit when ever needed. The recovery doc
// (plan-state-recovery.md) carries the jq examples.
//
// Surviving flags:
//   --clear-armed                 Set stop_review.armed = false. Use when a
//                                 dispatch failed to arm or a stale arm
//                                 survived an aborted turn.
//   --force-status <value>        Set status directly, bypassing the legal-
//                                 transitions guard. Validated against the
//                                 STATUS enum so typos still throw.

import fs from "node:fs";
import process from "node:process";

import {
  STATUS_VALUES,
  loadState,
  saveState,
  setStopReviewArmed,
} from "./lib/runner-state.mjs";
import { absoluteNormalizePath } from "./lib/fs.mjs";

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  printUsage();
  process.exit(0);
}

const statePath = absoluteNormalizePath(argv[0]);
const flags = parseFlags(argv.slice(1));

if (!fs.existsSync(statePath)) {
  fail(`state file not found: ${statePath}`);
}

let state;
try {
  state = loadState(statePath);
} catch (err) {
  fail(`failed to load state: ${err.message}`);
}

const before = snapshot(state);
const ops = [];

if (flags["--clear-armed"]) {
  setStopReviewArmed(state, false);
  ops.push("stop_review.armed = false");
}

if (flags["--force-status"]) {
  const next = String(flags["--force-status"]);
  if (!STATUS_VALUES.has(next)) {
    fail(
      `--force-status: unknown status "${next}". Valid: ` +
      [...STATUS_VALUES].join(", "),
    );
  }
  state.status = next;
  ops.push(`status = ${next} (forced; transition guard bypassed)`);
}

if (ops.length === 0) {
  process.stderr.write(
    "no operation specified. Pass --clear-armed or --force-status <value>. See --help.\n",
  );
  process.exit(2);
}

// saveState validates before writing — an invalid mutation leaves disk untouched.
saveState(statePath, state);

const after = snapshot(state);
process.stdout.write(
  [
    `[runner-state-fixup] ${statePath}`,
    "  applied:",
    ...ops.map((op) => `    - ${op}`),
    "  before:",
    ...formatSnapshot(before).map((l) => `    ${l}`),
    "  after:",
    ...formatSnapshot(after).map((l) => `    ${l}`),
    "",
  ].join("\n"),
);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseFlags(rest) {
  const out = {};
  const valueful = new Set(["--force-status"]);
  let i = 0;
  while (i < rest.length) {
    const tok = rest[i];
    if (!tok.startsWith("--")) fail(`unexpected positional argument: "${tok}"`);
    if (valueful.has(tok)) {
      const value = rest[i + 1];
      if (!value || value.startsWith("--")) fail(`${tok} requires a value`);
      out[tok] = value;
      i += 2;
    } else {
      out[tok] = true;
      i += 1;
    }
  }
  return out;
}

function snapshot(state) {
  return {
    status: state.status,
    armed: state.stop_review.armed,
    last_reviewed_commit: state.stop_review.last_reviewed_commit,
    block_history_len: state.stop_review.block_history.length,
    dev_review_round: state.dev_review.current_round,
  };
}

function formatSnapshot(s) {
  return [
    `status=${s.status}`,
    `armed=${s.armed}`,
    `last_reviewed_commit=${s.last_reviewed_commit ?? "null"}`,
    `block_history.length=${s.block_history_len}`,
    `dev_review.current_round=${s.dev_review_round}`,
  ];
}

function fail(msg) {
  process.stderr.write(`[runner-state-fixup] error: ${msg}\n`);
  process.exit(1);
}

function printUsage() {
  process.stdout.write(
    [
      "Usage: node plugin/develop/scripts/runner-state-fixup.mjs <state-path> [flags...]",
      "",
      "Flags:",
      "  --clear-armed                 Set stop_review.armed = false.",
      "  --force-status <value>        Set status directly, bypassing the legal-",
      "                                transitions guard. Validated against the",
      "                                STATUS enum so typos still throw.",
      "",
      "Edits go through validateState + saveState so a mutation that produces",
      "an invalid shape leaves the on-disk file untouched.",
      "",
      "For other recovery scenarios (rotating plan_path, resetting block_history,",
      "bumping dev-review round) edit the JSON with jq — see",
      "plugin/develop/skills/runner/references/plan-state-recovery.md.",
      "",
    ].join("\n"),
  );
}
