#!/usr/bin/env node

// runner-state-cli — single entry point for plan-state transitions.
//
// The runner skill (plugin/develop/skills/runner/SKILL.md) is prose Claude
// reads each turn. Before this CLI existed, every state transition was an
// inline `node -e "..."` written from scratch by the model — three concerns
// in one ad-hoc snippet (load → assert status → transitionStatus + helpers
// → saveState). Forgetting one of those steps silently corrupted state
// because nothing else enforced the order.
//
// This CLI collapses each runner step into one named subcommand. The skill
// only chooses which subcommand to invoke; the assertion, the transition,
// the auxiliary field updates, and the atomic saveState are bundled here.
// That moves a slice of the honor system into testable code: invalid
// transitions and wrong-status entries throw with actionable messages, and
// the unit tests cover the matrix that prose alone cannot.
//
// Subcommands (state path is always argv[1]):
//   arm-for-dispatch <state>
//     Assert status in [validating, dispatching, stop_review_blocked].
//     Transition → awaiting_stop_review. Set stop_review.armed = true.
//
//   begin-rework <state> <feedback-path>
//     Assert status = awaiting_dev_review. Transition → rework_in_progress.
//     bumpDevReviewRound(state, feedback-path) so the round number visible
//     to the reviewer matches the persisted round.
//
//   rework-done <state>
//     Assert status = rework_in_progress. Transition → awaiting_dev_review.
//
//   mark-qa-pending <state>
//     Assert status = awaiting_dev_review. Transition → qa_pending.
//
//   qa-resolved <state>
//     Assert status = qa_pending. Transition → awaiting_dev_review.
//
//   mark-approved <state>
//     Assert status = awaiting_dev_review. Transition → approved.
//
//   mark-merged <state>
//     Assert status = approved. Transition → merged.
//
//   reset <state> --confirm
//     Assert status = merged. Delete the state file and any sibling
//     feedback*.json under plans/{plan_key}/. Without --confirm prints a
//     dry-run summary and exits 0 without touching disk.
//
// Exit codes:
//   0   transition succeeded (or dry-run printed)
//   1   wrong status, illegal transition, missing argument, missing file
//
// stdout carries the new status (one line). stderr carries human-readable
// "before → after" lines and any error reasons. Tests assert against both.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  STATUS,
  assertExpectedStatus,
  bumpDevReviewRound,
  loadState,
  saveState,
  setStopReviewArmed,
  transitionStatus,
} from "./lib/runner-state.mjs";

const USAGE = `Usage:
  runner-state-cli arm-for-dispatch <state-path>
  runner-state-cli begin-rework <state-path> <feedback-path>
  runner-state-cli rework-done <state-path>
  runner-state-cli mark-qa-pending <state-path>
  runner-state-cli qa-resolved <state-path>
  runner-state-cli mark-approved <state-path>
  runner-state-cli mark-merged <state-path>
  runner-state-cli reset <state-path> --confirm`;

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

// Run a transition under a wrapper that surfaces the prior status in stderr
// even on failure — debugging "why did the CLI reject me" is much easier when
// the user can see what status the file actually held.
function runTransition({ statePath, allowedFrom, nextStatus, mutate, label }) {
  const state = loadOrFail(statePath);
  const before = state.status;
  try {
    assertExpectedStatus(state, allowedFrom, label);
  } catch (err) {
    fail(`runner-state-cli: ${err.message}`);
  }
  if (typeof mutate === "function") {
    mutate(state);
  }
  try {
    transitionStatus(state, nextStatus);
  } catch (err) {
    fail(
      `runner-state-cli: ${err.message} (status was "${before}", attempted ` +
      `"${nextStatus}")`,
    );
  }
  saveState(statePath, state);
  process.stderr.write(`[${label}] ${before} → ${state.status}\n`);
  process.stdout.write(`${state.status}\n`);
}

// arm-for-dispatch is the one subcommand that may need to walk the state
// machine through more than one edge: a fresh plan enters as VALIDATING,
// and ALLOWED_TRANSITIONS forbids VALIDATING → AWAITING_STOP_REVIEW directly
// (the canonical path is VALIDATING → DISPATCHING → AWAITING_STOP_REVIEW).
// The runner skill's Step 2 doesn't surface DISPATCHING as a separate event;
// the worktree is prepared and Step 3 immediately arms the gate. So we
// collapse the two edges here and emit a single "before → after" line.
function cmdArmForDispatch(statePath) {
  const state = loadOrFail(statePath);
  const before = state.status;
  try {
    assertExpectedStatus(
      state,
      [STATUS.VALIDATING, STATUS.DISPATCHING, STATUS.STOP_REVIEW_BLOCKED],
      "arm-for-dispatch",
    );
  } catch (err) {
    fail(`runner-state-cli: ${err.message}`);
  }
  try {
    if (state.status === STATUS.VALIDATING) {
      transitionStatus(state, STATUS.DISPATCHING);
    }
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
  } catch (err) {
    fail(
      `runner-state-cli: ${err.message} (status was "${before}", attempted ` +
      `"${STATUS.AWAITING_STOP_REVIEW}")`,
    );
  }
  setStopReviewArmed(state, true);
  saveState(statePath, state);
  process.stderr.write(`[arm-for-dispatch] ${before} → ${state.status}\n`);
  process.stdout.write(`${state.status}\n`);
}

function cmdBeginRework(statePath, feedbackPath) {
  if (!feedbackPath) {
    fail("runner-state-cli: begin-rework requires <feedback-path>");
  }
  // Resolve to absolute so subsequent runner turns can read it back without
  // depending on cwd. The state JSON serializer normalizes to POSIX, so we
  // pass the resolved path through bumpDevReviewRound which calls toPosixPath.
  const absFeedback = path.isAbsolute(feedbackPath)
    ? feedbackPath
    : path.resolve(process.cwd(), feedbackPath);
  runTransition({
    statePath,
    label: "begin-rework",
    allowedFrom: STATUS.AWAITING_DEV_REVIEW,
    nextStatus: STATUS.REWORK_IN_PROGRESS,
    mutate: (state) => bumpDevReviewRound(state, absFeedback),
  });
}

function cmdReworkDone(statePath) {
  runTransition({
    statePath,
    label: "rework-done",
    allowedFrom: STATUS.REWORK_IN_PROGRESS,
    nextStatus: STATUS.AWAITING_DEV_REVIEW,
  });
}

function cmdMarkQaPending(statePath) {
  runTransition({
    statePath,
    label: "mark-qa-pending",
    allowedFrom: STATUS.AWAITING_DEV_REVIEW,
    nextStatus: STATUS.QA_PENDING,
  });
}

function cmdQaResolved(statePath) {
  runTransition({
    statePath,
    label: "qa-resolved",
    allowedFrom: STATUS.QA_PENDING,
    nextStatus: STATUS.AWAITING_DEV_REVIEW,
  });
}

function cmdMarkApproved(statePath) {
  runTransition({
    statePath,
    label: "mark-approved",
    allowedFrom: STATUS.AWAITING_DEV_REVIEW,
    nextStatus: STATUS.APPROVED,
  });
}

function cmdMarkMerged(statePath) {
  runTransition({
    statePath,
    label: "mark-merged",
    allowedFrom: STATUS.APPROVED,
    nextStatus: STATUS.MERGED,
  });
}

// reset is the only subcommand that does not transition status. It runs
// post-merge cleanup: removes the state file and sibling feedback*.json so
// the plan directory is empty and the user can re-run /runner against the
// same plan path without colliding with an already-merged record. Refusing
// any other status keeps "reset" from being misused as an emergency wipe.
function cmdReset(statePath, args) {
  if (!fs.existsSync(statePath)) {
    fail(`runner-state-cli: state file not found at ${statePath}`);
  }
  const state = loadOrFail(statePath);
  if (state.status !== STATUS.MERGED) {
    fail(
      `runner-state-cli: reset requires status="merged" (was "${state.status}"). ` +
      "Only merged plans are eligible for cleanup.",
    );
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
      // Surface the failure but keep going — partial cleanup is still useful
      // and the user can re-run reset to mop up.
      process.stderr.write(`[reset] failed to remove ${t}: ${err.message}\n`);
    }
  }
  // Final status line — stdout convention used by every other subcommand so
  // shell pipelines stay uniform.
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
    case "arm-for-dispatch":
      return cmdArmForDispatch(statePath);
    case "begin-rework":
      return cmdBeginRework(statePath, rest[0]);
    case "rework-done":
      return cmdReworkDone(statePath);
    case "mark-qa-pending":
      return cmdMarkQaPending(statePath);
    case "qa-resolved":
      return cmdQaResolved(statePath);
    case "mark-approved":
      return cmdMarkApproved(statePath);
    case "mark-merged":
      return cmdMarkMerged(statePath);
    case "reset":
      return cmdReset(statePath, rest);
    default:
      fail(`runner-state-cli: unknown subcommand "${subcommand}"\n${USAGE}`);
  }
}

main();
