// Plan-state machine: schema version, status enum, terminal statuses, and
// the allowed-transition table.
//
// This file is the single contract that the runner skill, the UserPromptSubmit
// hook, the Stop hook, and the dev-review skill all share. `runner-state.mjs`
// re-exports everything from here so existing imports keep working — but new
// code that only needs the state-machine pieces (no fs / I/O) should import
// from this module directly.
//
// Editing rules:
//   - `STATUS` strings are part of the on-disk JSON contract. Adding a new
//     value is fine; renaming or removing one is a breaking change for any
//     plan-state file already on disk.
//   - Every `ALLOWED_TRANSITIONS` edge must reflect a real path that some
//     caller actually drives. Phantom edges hide bugs by silently accepting
//     accidental writes.

export const SCHEMA_VERSION = 1;

// All legal `status` values, in the canonical order they appear during a
// plan's lifecycle. The runner skill reads `status` to decide where to resume,
// so the set of strings here is part of the contract — additions are fine,
// renames are a breaking change.
export const STATUS = Object.freeze({
  VALIDATING: "validating",
  DISPATCHING: "dispatching",
  AWAITING_STOP_REVIEW: "awaiting_stop_review",
  STOP_REVIEW_BLOCKED: "stop_review_blocked",
  AWAITING_DEV_REVIEW: "awaiting_dev_review",
  REWORK_IN_PROGRESS: "rework_in_progress",
  QA_PENDING: "qa_pending",
  APPROVED: "approved",
  MERGED: "merged",
});

export const STATUS_VALUES = new Set(Object.values(STATUS));

// Terminal states never re-enter the runner flow without being deleted first.
// UserPromptSubmit treats a state file in TERMINAL status as "this plan is
// finished — start a fresh one or remove the state file to re-run".
export const TERMINAL_STATUSES = new Set([STATUS.MERGED]);

// Allowed status transitions. The runner skill drives most transitions; hooks
// drive a few:
//   - UserPromptSubmit creates VALIDATING (the `null → VALIDATING` edge).
//   - Stop hook moves AWAITING_STOP_REVIEW to either STOP_REVIEW_BLOCKED
//     (BLOCK) or AWAITING_DEV_REVIEW (ALLOW).
//   - After a BLOCK, the next ALLOW pass advances STOP_REVIEW_BLOCKED directly
//     to AWAITING_DEV_REVIEW — without bouncing through AWAITING_STOP_REVIEW —
//     because the gate stays armed across re-dispatches and the runner skill
//     does not transition back to AWAITING_STOP_REVIEW between them.
// Anything not listed is rejected so a buggy caller cannot quietly corrupt
// state. Self-transitions are allowed where they are idempotent (e.g. Stop
// hook re-arming after a BLOCK).
export const ALLOWED_TRANSITIONS = new Map([
  [null, new Set([STATUS.VALIDATING])], // first write
  [STATUS.VALIDATING, new Set([STATUS.DISPATCHING, STATUS.VALIDATING])],
  [STATUS.DISPATCHING, new Set([STATUS.AWAITING_STOP_REVIEW, STATUS.DISPATCHING])],
  [
    STATUS.AWAITING_STOP_REVIEW,
    new Set([
      STATUS.STOP_REVIEW_BLOCKED,
      STATUS.AWAITING_DEV_REVIEW,
      STATUS.AWAITING_STOP_REVIEW,
    ]),
  ],
  [
    STATUS.STOP_REVIEW_BLOCKED,
    new Set([
      STATUS.AWAITING_STOP_REVIEW,
      STATUS.AWAITING_DEV_REVIEW,
      STATUS.STOP_REVIEW_BLOCKED,
    ]),
  ],
  [
    STATUS.AWAITING_DEV_REVIEW,
    new Set([
      STATUS.REWORK_IN_PROGRESS,
      STATUS.QA_PENDING,
      STATUS.APPROVED,
      STATUS.AWAITING_DEV_REVIEW,
    ]),
  ],
  [
    STATUS.REWORK_IN_PROGRESS,
    new Set([STATUS.AWAITING_DEV_REVIEW, STATUS.REWORK_IN_PROGRESS]),
  ],
  [
    STATUS.QA_PENDING,
    new Set([STATUS.AWAITING_DEV_REVIEW, STATUS.QA_PENDING]),
  ],
  [STATUS.APPROVED, new Set([STATUS.MERGED, STATUS.APPROVED])],
  [STATUS.MERGED, new Set()],
]);
