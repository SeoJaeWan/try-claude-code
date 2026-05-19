#!/usr/bin/env node

// runner-state-cli — dev-review phase mutators for the runner skill.
//
// The runner skill (plugin/develop/skills/runner/SKILL.md) is prose Claude
// reads each turn. dev-review sub-state transitions (awaiting ↔ rework ↔ qa)
// happen multiple times within a single plan run, and the runner skill needs
// a single atomic command to update plan-state.json instead of inlining
// load/mutate/save by hand.
//
// All status-level transitions have been removed — the slim plan-state JSON
// no longer carries a `status` field; the runner skill infers the current
// Step from disk inspection (worktree presence, commits, feedback.json).
// Only the dev_review.phase value and post-merge cleanup live here.
//
// Subcommands:
//
//   begin-rework <state-path> <feedback-path>
//     Set dev_review.phase = "rework" and record the feedback file path so
//     the runner skill can find rework_items[] when dispatching rework agents.
//
//   rework-done <state-path>
//     Set dev_review.phase = "awaiting".
//
//   mark-qa-pending <state-path>
//     Set dev_review.phase = "qa".
//
//   qa-resolved <state-path>
//     Set dev_review.phase = "awaiting".
//
//   reset <state-path> [--confirm]
//     Delete the state file and any sibling feedback*.json under
//     plans/{plan_key}/. Without --confirm prints a dry-run summary and
//     exits 0 without touching disk. Intended for post-merge cleanup — the
//     runner skill calls this after `touch plans/{plan_key}/.merged`.
//
// Exit codes:
//   0   mutation succeeded (or dry-run printed)
//   1   missing argument, missing file, unknown subcommand

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  DEV_REVIEW_PHASE,
  loadState,
  saveState,
  setDevReviewFeedbackPath,
  setDevReviewPhase,
} from "./lib/runner-state.mjs";

const USAGE = `Usage:
  runner-state-cli begin-rework <state-path> <feedback-path>
  runner-state-cli rework-done <state-path>
  runner-state-cli mark-qa-pending <state-path>
  runner-state-cli qa-resolved <state-path>
  runner-state-cli reset <state-path> [--confirm]`;

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function loadOrFail(statePath) {
  if (!fs.existsSync(statePath)) {
    fail(`runner-state-cli: state file not found at ${statePath}`);
  }
  try {
    return loadState(statePath);
  } catch (err) {
    fail(`runner-state-cli: failed to load state: ${err.message}`);
  }
}

// All four phase mutators share the same shape: load state, change phase,
// optionally record feedback path, save. Pulled into one table to keep the
// dispatch function trivial.
const PHASE_MUTATIONS = {
  "begin-rework":    { to: DEV_REVIEW_PHASE.REWORK,   needsFeedback: true },
  "rework-done":     { to: DEV_REVIEW_PHASE.AWAITING },
  "mark-qa-pending": { to: DEV_REVIEW_PHASE.QA },
  "qa-resolved":     { to: DEV_REVIEW_PHASE.AWAITING },
};

function cmdPhaseMutation(subcommand, statePath, args) {
  const spec = PHASE_MUTATIONS[subcommand];
  let feedbackPath = null;
  if (spec.needsFeedback) {
    if (!args[0]) fail(`runner-state-cli: ${subcommand} requires <feedback-path>`);
    feedbackPath = path.isAbsolute(args[0]) ? args[0] : path.resolve(process.cwd(), args[0]);
  }
  const state = loadOrFail(statePath);
  const before = state.dev_review?.phase ?? null;
  if (spec.needsFeedback) setDevReviewFeedbackPath(state, feedbackPath);
  try {
    setDevReviewPhase(state, spec.to);
  } catch (err) {
    fail(`runner-state-cli: ${err.message}`);
  }
  saveState(statePath, state);
  process.stderr.write(`[${subcommand}] phase ${before ?? "null"} → ${spec.to}\n`);
  process.stdout.write(`${spec.to}\n`);
}

// reset is the only subcommand that does not touch dev_review.phase. It runs
// post-merge cleanup: removes the state file and sibling feedback*.json so
// the plan directory can be re-used by a future /runner against the same
// plan path without colliding with the now-merged record.
function cmdReset(statePath, args) {
  if (!fs.existsSync(statePath)) {
    fail(`runner-state-cli: state file not found at ${statePath}`);
  }
  const dir = path.dirname(statePath);
  const targets = [statePath];
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith("feedback") && entry.endsWith(".json")) {
      targets.push(path.join(dir, entry));
    }
  }
  const confirm = args.includes("--confirm");
  if (!confirm) {
    process.stderr.write("[reset] dry-run — pass --confirm to delete:\n");
    for (const t of targets) process.stderr.write(`  ${t}\n`);
    return;
  }
  for (const t of targets) {
    try {
      fs.unlinkSync(t);
      process.stderr.write(`[reset] removed ${t}\n`);
    } catch (err) {
      process.stderr.write(`[reset] failed to remove ${t}: ${err.message}\n`);
    }
  }
  process.stdout.write(`reset\n`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const [subcommand, statePath, ...rest] = argv;
  if (!statePath) {
    fail(`runner-state-cli: <state-path> is required\n${USAGE}`);
  }

  switch (subcommand) {
    case "begin-rework":
    case "rework-done":
    case "mark-qa-pending":
    case "qa-resolved":
      return cmdPhaseMutation(subcommand, statePath, rest);
    case "reset":
      return cmdReset(statePath, rest);
    default:
      fail(`runner-state-cli: unknown subcommand "${subcommand}"\n${USAGE}`);
  }
}

main();
