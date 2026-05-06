// Stop-review outcome vocabulary.
//
// `classifyOutcome` in stop-review-gate-hook.mjs maps a review result to one
// of four strings; every downstream branch (artifact persistence, log emit,
// plan-state transition, decision emission) compares against those strings.
//
// Today the values are only consumed inside that hook, but we learned the
// hard way (commit c116510 — STOP_REVIEW_BLOCKED → AWAITING_DEV_REVIEW edge
// missing from the state machine) that "internally closed" string contracts
// decay the moment a new caller is added. Pulling the values out into a
// shared module makes a future second consumer cheap and keeps the existing
// branches grep-able by symbol instead of by string literal.
//
// NOTE: Do not confuse these with:
//   - `decision: "block"` on line 603 of the hook — that string is the
//     Claude Code Stop-hook API contract, not our internal vocabulary.
//   - `last_result: "ALLOW" | "BLOCK" | "skipped"` persisted on plan-state —
//     that is a user-visible log label, deliberately upper/lower-cased
//     differently from the outcome enum. Same words, different audiences.

export const STOP_REVIEW_OUTCOME = Object.freeze({
  ALLOW: "allow",
  ALLOW_DOWNGRADED: "allow_downgraded",
  BLOCK: "block",
  SKIPPED: "skipped",
});

export const STOP_REVIEW_OUTCOME_VALUES = new Set(
  Object.values(STOP_REVIEW_OUTCOME),
);
