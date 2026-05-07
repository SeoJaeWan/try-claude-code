// Plan-state machine: schema version, status enum, terminal statuses, sub-
// state phase enums, and the allowed-transition tables.
//
// This file is the single contract that the runner skill, the UserPromptSubmit
// hook, the PreToolUse hook, the Stop hook, and the dev-review skill all
// share. `runner-state.mjs` re-exports everything from here so existing
// imports keep working — but new code that only needs the state-machine
// pieces (no fs / I/O) should import from this module directly.
//
// Phase 4 reshape (schema_version 2):
//   The 9-status enum was collapsed to 5 by separating "which Step are we in"
//   (status) from "what sub-state of that Step are we in" (phase). The phase
//   lives on the relevant nested block (`stop_review.phase` /
//   `dev_review.phase`) so a future routing table only needs to read one
//   field for the high-level branch and a second field for the sub-branch.
//
// Editing rules:
//   - `STATUS` strings are part of the on-disk JSON contract. Adding a new
//     value or phase is fine; renaming or removing one is a breaking change
//     for any plan-state file already on disk and requires a schema bump
//     plus a migrator (see lib/runner-state.mjs:migrateV1ToV2 for the v1→v2
//     example).
//   - Every `ALLOWED_TRANSITIONS` edge must reflect a real path that some
//     caller actually drives. Phantom edges hide bugs by silently accepting
//     accidental writes.

export const SCHEMA_VERSION = 2;

// Status enum. Each value names the runner Step the plan is currently in.
// Sub-states inside a Step (rework vs Q&A inside dev-review, armed vs blocked
// inside stop-review) live on `stop_review.phase` / `dev_review.phase`.
//
//   PREPARING     — Step 1-2: state file just created, worktree being set up.
//                   The plan-agent dispatch has not fired yet.
//   DISPATCHING   — Step 3: plan-agent dispatched, stop-review gate active.
//                   `stop_review.phase` distinguishes "armed" (gate primed)
//                   from "blocked" (Stop hook reported BLOCK, awaiting
//                   re-dispatch).
//   DEV_REVIEWING — Step 4: dev-review gate is open. `dev_review.phase`
//                   distinguishes "awaiting" (waiting for reviewer reply),
//                   "rework" (rework agents in flight), and "qa" (Q&A pause).
//   CLOSING       — Step 5: dev-review approved; worktree cleanup is in
//                   progress and we are waiting on the user's merge / PR /
//                   "later" decision.
//   MERGED        — Terminal. UserPromptSubmit refuses to resume.
export const STATUS = Object.freeze({
  PREPARING: "preparing",
  DISPATCHING: "dispatching",
  DEV_REVIEWING: "dev_reviewing",
  CLOSING: "closing",
  MERGED: "merged",
});

export const STATUS_VALUES = new Set(Object.values(STATUS));

// Terminal states never re-enter the runner flow without being deleted first.
// UserPromptSubmit treats a state file in TERMINAL status as "this plan is
// finished — start a fresh one or remove the state file to re-run".
export const TERMINAL_STATUSES = new Set([STATUS.MERGED]);

// Allowed status transitions. Compared to v1 this graph is dramatically
// smaller — the bulk of the old edges turned out to be sub-state moves
// inside Step 3 (armed↔blocked) and Step 4 (awaiting↔rework↔qa) that are now
// phase mutations. Only "we are leaving the Step entirely" is a status edge.
//
//   null         → preparing                (UserPromptSubmit, first write)
//   preparing    → dispatching              (plan-agent dispatch fires)
//   dispatching  → dev_reviewing            (Stop hook ALLOW)
//   dev_reviewing→ closing                  (mark-approved CLI)
//   closing      → merged                   (mark-merged CLI)
//
// Self-edges are kept where they are idempotent — e.g. preparing→preparing
// for the case where Step 2's status check re-runs.
export const ALLOWED_TRANSITIONS = new Map([
  [null, new Set([STATUS.PREPARING])],
  [STATUS.PREPARING, new Set([STATUS.PREPARING, STATUS.DISPATCHING])],
  [STATUS.DISPATCHING, new Set([STATUS.DISPATCHING, STATUS.DEV_REVIEWING])],
  [STATUS.DEV_REVIEWING, new Set([STATUS.DEV_REVIEWING, STATUS.CLOSING])],
  [STATUS.CLOSING, new Set([STATUS.CLOSING, STATUS.MERGED])],
  [STATUS.MERGED, new Set()],
]);

// ---------------------------------------------------------------------------
// Sub-state phases
// ---------------------------------------------------------------------------

// Stop-review phase. Lives on `state.stop_review.phase` and is meaningful
// only when `state.status === DISPATCHING`. Outside that status it is
// `null`.
//
//   ARMED   — gate primed, waiting on the next Stop hook firing.
//   BLOCKED — last Stop hook firing reported BLOCK; awaiting plan-agent
//             re-dispatch.
//   PASSED  — last firing returned ALLOW. Set transiently right before the
//             status flips to DEV_REVIEWING, so callers reading the file
//             between the verdict and the transition see a sensible value.
export const STOP_REVIEW_PHASE = Object.freeze({
  ARMED: "armed",
  BLOCKED: "blocked",
  PASSED: "passed",
});
export const STOP_REVIEW_PHASE_VALUES = new Set(Object.values(STOP_REVIEW_PHASE));

// Dev-review phase. Lives on `state.dev_review.phase` and is meaningful only
// when `state.status === DEV_REVIEWING`.
//
//   AWAITING — gate is open, waiting for the reviewer to reply
//              `리뷰 완료`. Initial phase on entering the status.
//   REWORK   — `result = "rework"` was received; rework Agent dispatches in
//              flight. Returns to AWAITING via the rework-done CLI.
//   QA       — `result = "qa_required"` was received; main session is
//              answering questions in chat. Returns to AWAITING via
//              qa-resolved.
export const DEV_REVIEW_PHASE = Object.freeze({
  AWAITING: "awaiting",
  REWORK: "rework",
  QA: "qa",
});
export const DEV_REVIEW_PHASE_VALUES = new Set(Object.values(DEV_REVIEW_PHASE));

// Phase transition tables. Like ALLOWED_TRANSITIONS but for the sub-state
// fields. Hubs (AWAITING for dev-review, ARMED for stop-review) sit at the
// centre of small stars — no rework↔qa or armed↔passed jumps.
export const ALLOWED_STOP_REVIEW_PHASE_TRANSITIONS = new Map([
  [null, new Set([STOP_REVIEW_PHASE.ARMED])],
  [STOP_REVIEW_PHASE.ARMED, new Set([
    STOP_REVIEW_PHASE.ARMED,
    STOP_REVIEW_PHASE.BLOCKED,
    STOP_REVIEW_PHASE.PASSED,
  ])],
  [STOP_REVIEW_PHASE.BLOCKED, new Set([
    STOP_REVIEW_PHASE.BLOCKED,
    STOP_REVIEW_PHASE.ARMED,
    STOP_REVIEW_PHASE.PASSED,
  ])],
  [STOP_REVIEW_PHASE.PASSED, new Set([STOP_REVIEW_PHASE.PASSED])],
]);

export const ALLOWED_DEV_REVIEW_PHASE_TRANSITIONS = new Map([
  [null, new Set([DEV_REVIEW_PHASE.AWAITING])],
  [DEV_REVIEW_PHASE.AWAITING, new Set([
    DEV_REVIEW_PHASE.AWAITING,
    DEV_REVIEW_PHASE.REWORK,
    DEV_REVIEW_PHASE.QA,
  ])],
  [DEV_REVIEW_PHASE.REWORK, new Set([
    DEV_REVIEW_PHASE.REWORK,
    DEV_REVIEW_PHASE.AWAITING,
  ])],
  [DEV_REVIEW_PHASE.QA, new Set([
    DEV_REVIEW_PHASE.QA,
    DEV_REVIEW_PHASE.AWAITING,
  ])],
]);
