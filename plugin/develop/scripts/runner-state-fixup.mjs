#!/usr/bin/env node

// CLI escape hatch for plans/{plan_dir}/.runner-state.json.
//
// This script is a thin wrapper around the runner-state library: every
// change goes through loadState → mutate-via-helper → saveState, so the
// schema check and the legal-transitions table run exactly the same way
// they do during normal operation. It exists so a stuck plan can be
// recovered without anyone reaching for `Edit` / `Write` on the JSON
// directly — see plugin/develop/skills/runner/references/plan-state-recovery.md
// for the full scenario list.
//
// What this CLI deliberately will NOT do:
//   - Edit fields that affect git semantics (base_branch, task_branch,
//     worktree_path-from-branch derivation). Do those with `git` first,
//     then run --rotate-plan-path here if you need state to follow.
//   - Skip validateState. Every command loads, mutates, validates, saves.
//   - Add policy that the runner skill itself does not enforce. The
//     skill's procedure is honor-system; this CLI is honor-system too.
//     If you reach for --force-status, you are accepting that you know
//     why you are violating the normal flow.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  STATUS,
  STATUS_VALUES,
  bumpDevReviewRound,
  clearPlanBlockStreak,
  deriveStatePathFromPlanPath,
  loadState,
  saveState,
  setStopReviewArmed,
} from "./lib/runner-state.mjs";
import { absoluteNormalizePath, toPosixPath } from "./lib/fs.mjs";

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

// --reset-armed: clear stop_review.armed. Use when a dispatch failed to arm
// or a stale arm survived an aborted turn.
if (flags["--reset-armed"]) {
  setStopReviewArmed(state, false);
  ops.push("stop_review.armed = false");
}

// --reset-block-history: append an __allow__ separator so the streak counter
// resets without losing audit trail. Mirrors what an ALLOW pass does.
if (flags["--reset-block-history"]) {
  clearPlanBlockStreak(state);
  ops.push("stop_review.block_history streak reset (__allow__ separator appended)");
}

// --force-status <value>: bypass transitionStatus and set the status field
// directly. The new value is still validated against STATUS_VALUES so a
// typo throws, but the legal-transitions table is intentionally skipped —
// the whole point of the flag is to recover from a state the table would
// otherwise refuse to leave.
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

// --bump-dev-round: rare; useful when you regenerated review-data.json
// out-of-band and need the round counter to follow.
if (flags["--bump-dev-round"]) {
  bumpDevReviewRound(state, flags["--feedback-path"] ?? null);
  ops.push(`dev_review.current_round → ${state.dev_review.current_round}`);
}

// --rotate-plan-path <new>: rename a plan file. Updates plan_path on the
// state object and moves the state file alongside the new plan location
// (deriveStatePathFromPlanPath gives us the canonical target). Caller is
// responsible for moving the .plan.md file itself first; we just check it
// exists at the new location.
let movedStateTo = null;
if (flags["--rotate-plan-path"]) {
  const newPlanPath = absoluteNormalizePath(flags["--rotate-plan-path"]);
  if (!fs.existsSync(newPlanPath)) {
    fail(
      `--rotate-plan-path: ${newPlanPath} does not exist. Move the .plan.md ` +
      `file first, then re-run.`,
    );
  }
  state.plan_path = toPosixPath(newPlanPath);
  ops.push(`plan_path → ${state.plan_path}`);
  const { statePath: newStatePath, stateDir } = deriveStatePathFromPlanPath(newPlanPath);
  if (newStatePath !== toPosixPath(statePath)) {
    fs.mkdirSync(stateDir, { recursive: true });
    saveState(newStatePath, state); // validates + writes new location
    fs.unlinkSync(statePath);
    movedStateTo = newStatePath;
    ops.push(`state file moved: ${statePath} → ${newStatePath}`);
  }
}

if (ops.length === 0) {
  process.stderr.write(
    "no operation specified. Pass at least one of: " +
      "--reset-armed, --reset-block-history, --force-status <value>, " +
      "--bump-dev-round, --rotate-plan-path <new>. See --help.\n",
  );
  process.exit(2);
}

if (movedStateTo === null) {
  // Save at original location. saveState validates before writing, so a
  // mutation that produced an invalid shape throws here and the file on
  // disk stays untouched.
  saveState(statePath, state);
}

const after = snapshot(state);
const finalPath = movedStateTo ?? statePath;

process.stdout.write(
  [
    `[runner-state-fixup] ${finalPath}`,
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
  let i = 0;
  while (i < rest.length) {
    const tok = rest[i];
    if (!tok.startsWith("--")) {
      fail(`unexpected positional argument: "${tok}"`);
    }
    const valueful = new Set([
      "--force-status",
      "--rotate-plan-path",
      "--feedback-path",
    ]);
    if (valueful.has(tok)) {
      const value = rest[i + 1];
      if (!value || value.startsWith("--")) {
        fail(`${tok} requires a value`);
      }
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
    last_block_count: lastEntryCount(state.stop_review.block_history),
    dev_review_round: state.dev_review.current_round,
    plan_path: state.plan_path,
  };
}

function lastEntryCount(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;
  const last = history[history.length - 1];
  return last && typeof last === "object" ? (last.count ?? 0) : 0;
}

function formatSnapshot(s) {
  return [
    `status=${s.status}`,
    `armed=${s.armed}`,
    `last_reviewed_commit=${s.last_reviewed_commit ?? "null"}`,
    `block_history.length=${s.block_history_len} (last_count=${s.last_block_count})`,
    `dev_review.current_round=${s.dev_review_round}`,
    `plan_path=${s.plan_path}`,
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
      "  --reset-armed                 Set stop_review.armed = false.",
      "  --reset-block-history         Append __allow__ separator so the next BLOCK",
      "                                starts a fresh streak (audit trail preserved).",
      "  --force-status <value>        Set status directly, bypassing the legal-",
      "                                transitions guard. Validated against the",
      "                                STATUS enum so typos still throw.",
      "  --bump-dev-round              dev_review.current_round += 1.",
      "  --feedback-path <path>        Optional, used with --bump-dev-round to set",
      "                                dev_review.last_feedback_path.",
      "  --rotate-plan-path <newpath>  Update plan_path and move the state file to",
      "                                the canonical location alongside the new",
      "                                plan file. The .plan.md must already exist",
      "                                at the new location.",
      "",
      "All edits go through validateState + saveState so a mutation that produces",
      "an invalid shape leaves the on-disk file untouched.",
      "",
      "See plugin/develop/skills/runner/references/plan-state-recovery.md for the",
      "scenario-by-scenario decision tree.",
      "",
    ].join("\n"),
  );
}
