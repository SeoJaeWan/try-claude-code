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
// Subcommands (state path is always argv[1]). Phase 4 reshape: most rework /
// QA subcommands are *phase mutators* (they change `dev_review.phase` while
// status stays at DEV_REVIEWING). Only `arm-for-dispatch`, `mark-approved`,
// and `mark-merged` cross status boundaries.
//
//   arm-for-dispatch <state>
//     Assert status in [preparing, dispatching]. Transition → dispatching +
//     stop_review.phase = "armed". Sets stop_review.armed = true. Kept for
//     manual recovery — PreToolUse auto-arms in normal operation.
//
//   begin-rework <state> <feedback-path>
//     Assert status = dev_reviewing && dev_review.phase = "awaiting".
//     Phase mutation → "rework". bumpDevReviewRound(state, feedback-path)
//     so the round number visible to the reviewer matches the persisted
//     round.
//
//   rework-done <state>
//     Assert status = dev_reviewing && dev_review.phase = "rework".
//     Phase mutation → "awaiting".
//
//   mark-qa-pending <state>
//     Assert status = dev_reviewing && dev_review.phase = "awaiting".
//     Phase mutation → "qa".
//
//   qa-resolved <state>
//     Assert status = dev_reviewing && dev_review.phase = "qa".
//     Phase mutation → "awaiting".
//
//   mark-approved <state>
//     Assert status = dev_reviewing && dev_review.phase = "awaiting".
//     Transition → closing. Clears dev_review.phase.
//
//   mark-merged <state>
//     Assert status = closing. Transition → merged.
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
  DEV_REVIEW_PHASE,
  STATUS,
  STOP_REVIEW_PHASE,
  assertExpectedStatus,
  bumpDevReviewRound,
  loadState,
  saveState,
  setDevReviewPhase,
  setStopReviewArmed,
  setStopReviewPhase,
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

// Phase 4: a phase-mutator helper for subcommands that change a sub-state
// (begin-rework, rework-done, mark-qa-pending, qa-resolved). Status stays at
// DEV_REVIEWING the whole time — only `dev_review.phase` moves.
function runPhaseMutation({
  statePath, label, allowedStatus, mutate,
}) {
  const state = loadOrFail(statePath);
  const before = state.dev_review?.phase ?? null;
  try {
    assertExpectedStatus(state, allowedStatus, label);
  } catch (err) {
    fail(`runner-state-cli: ${err.message}`);
  }
  try {
    mutate(state);
  } catch (err) {
    fail(`runner-state-cli: ${err.message} (label="${label}")`);
  }
  saveState(statePath, state);
  const after = state.dev_review?.phase ?? null;
  process.stderr.write(`[${label}] phase ${before ?? "null"} → ${after ?? "null"}\n`);
  process.stdout.write(`${after ?? "null"}\n`);
}

// arm-for-dispatch is kept for manual recovery — PreToolUse auto-arms the
// gate as a side-effect of seeing the plan-agent dispatch, but a runner
// operator may still need to walk a state forward by hand (e.g. after a
// runner-state-fixup --rollback-to dispatching). The CLI accepts:
//   - `preparing`                         → DISPATCHING + phase=ARMED
//   - `dispatching` + phase in {armed, blocked}  → phase=ARMED (idempotent
//     re-arm). PASSED is rejected because it is the post-ALLOW transient
//     phase — re-arming after an ALLOW means going back to stop-review,
//     which is not a recovery move the operator should drive.
function cmdArmForDispatch(statePath) {
  const state = loadOrFail(statePath);
  const beforeStatus = state.status;
  const beforePhase = state.stop_review?.phase ?? null;
  try {
    assertExpectedStatus(
      state,
      [STATUS.PREPARING, STATUS.DISPATCHING],
      "arm-for-dispatch",
    );
  } catch (err) {
    fail(`runner-state-cli: ${err.message}`);
  }
  if (
    state.status === STATUS.DISPATCHING &&
    state.stop_review.phase === STOP_REVIEW_PHASE.PASSED
  ) {
    fail(
      `runner-state-cli: cannot re-arm from stop_review.phase="passed" — that ` +
      `phase is set right before transitioning to dev_reviewing.`,
    );
  }
  try {
    if (state.status === STATUS.PREPARING) {
      transitionStatus(state, STATUS.DISPATCHING);
    }
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
  } catch (err) {
    fail(`runner-state-cli: ${err.message} (status was "${beforeStatus}")`);
  }
  setStopReviewArmed(state, true);
  saveState(statePath, state);
  process.stderr.write(
    `[arm-for-dispatch] ${beforeStatus}/${beforePhase ?? "null"} → ` +
    `${state.status}/${state.stop_review.phase}\n`,
  );
  process.stdout.write(`${state.status}\n`);
}

function cmdBeginRework(statePath, feedbackPath) {
  if (!feedbackPath) {
    fail("runner-state-cli: begin-rework requires <feedback-path>");
  }
  const absFeedback = path.isAbsolute(feedbackPath)
    ? feedbackPath
    : path.resolve(process.cwd(), feedbackPath);
  runPhaseMutation({
    statePath,
    label: "begin-rework",
    allowedStatus: STATUS.DEV_REVIEWING,
    mutate: (state) => {
      // Phase guard: only AWAITING → REWORK is legal here. setDevReviewPhase
      // throws on any other source phase.
      if (state.dev_review.phase !== DEV_REVIEW_PHASE.AWAITING) {
        throw new Error(
          `begin-rework: dev_review.phase must be "awaiting" (was ` +
          `"${state.dev_review.phase}").`,
        );
      }
      bumpDevReviewRound(state, absFeedback);
      setDevReviewPhase(state, DEV_REVIEW_PHASE.REWORK);
    },
  });
}

function cmdReworkDone(statePath) {
  runPhaseMutation({
    statePath,
    label: "rework-done",
    allowedStatus: STATUS.DEV_REVIEWING,
    mutate: (state) => {
      if (state.dev_review.phase !== DEV_REVIEW_PHASE.REWORK) {
        throw new Error(
          `rework-done: dev_review.phase must be "rework" (was ` +
          `"${state.dev_review.phase}").`,
        );
      }
      setDevReviewPhase(state, DEV_REVIEW_PHASE.AWAITING);
    },
  });
}

function cmdMarkQaPending(statePath) {
  runPhaseMutation({
    statePath,
    label: "mark-qa-pending",
    allowedStatus: STATUS.DEV_REVIEWING,
    mutate: (state) => {
      if (state.dev_review.phase !== DEV_REVIEW_PHASE.AWAITING) {
        throw new Error(
          `mark-qa-pending: dev_review.phase must be "awaiting" (was ` +
          `"${state.dev_review.phase}").`,
        );
      }
      setDevReviewPhase(state, DEV_REVIEW_PHASE.QA);
    },
  });
}

function cmdQaResolved(statePath) {
  runPhaseMutation({
    statePath,
    label: "qa-resolved",
    allowedStatus: STATUS.DEV_REVIEWING,
    mutate: (state) => {
      if (state.dev_review.phase !== DEV_REVIEW_PHASE.QA) {
        throw new Error(
          `qa-resolved: dev_review.phase must be "qa" (was ` +
          `"${state.dev_review.phase}").`,
        );
      }
      setDevReviewPhase(state, DEV_REVIEW_PHASE.AWAITING);
    },
  });
}

function cmdMarkApproved(statePath) {
  runTransition({
    statePath,
    label: "mark-approved",
    allowedFrom: STATUS.DEV_REVIEWING,
    nextStatus: STATUS.CLOSING,
    mutate: (state) => {
      if (state.dev_review.phase !== DEV_REVIEW_PHASE.AWAITING) {
        throw new Error(
          `mark-approved: dev_review.phase must be "awaiting" (was ` +
          `"${state.dev_review.phase}").`,
        );
      }
      // Status leaves DEV_REVIEWING; phase is no longer meaningful.
      setDevReviewPhase(state, null);
    },
  });
}

function cmdMarkMerged(statePath) {
  runTransition({
    statePath,
    label: "mark-merged",
    allowedFrom: STATUS.CLOSING,
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
