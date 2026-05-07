// Stop-review outcome vocabulary.
//
// `classifyOutcome` in stop-review-gate-hook.mjs maps a review result to one
// of these strings; every downstream branch (artifact persistence, log emit,
// plan-state transition, decision emission) compares against them.
//
// Pulling the values out keeps the branches grep-able by symbol instead of
// by string literal, and lets a second consumer reuse the vocabulary cheaply
// — the lesson from commit c116510 (the missing
// STOP_REVIEW_BLOCKED → AWAITING_DEV_REVIEW edge that we paid for).
//
// Outcome semantics:
//
//   ALLOW             — Codex returned ok. Plan advances to AWAITING_DEV_REVIEW.
//   ALLOW_DOWNGRADED  — Codex returned BLOCK below the confidence threshold.
//                       Treated as ALLOW for gating, but the original BLOCK
//                       reason is persisted to .codex/reviews/ for audit.
//   BLOCK             — Codex returned a confident BLOCK. Plan moves to
//                       STOP_REVIEW_BLOCKED, block_history is updated, and
//                       the next turn is halted with the BLOCK reason.
//   SKIPPED           — review never ran (Codex CLI missing, etc.). ALLOW.
//   TIMEOUT           — Codex did not respond within STOP_REVIEW_TIMEOUT_MS.
//                       Crucially distinct from BLOCK: a slow Codex call is
//                       not a finding about the code. The plan stays in
//                       AWAITING_STOP_REVIEW with armed=true and an unchanged
//                       last_reviewed_commit, so the next Stop hook firing
//                       reviews the same diff again. The user is told via
//                       systemMessage that the gate auto-retries; if they do
//                       not want that, /codex:cancel is the explicit escape.
//
// NOTE: Do not confuse these with:
//   - `decision: "block"` emitted by the Stop hook — that string is the
//     Claude Code Stop-hook API contract, not our internal vocabulary.
//   - `last_result: "ALLOW" | "BLOCK" | "skipped" | "timeout"` persisted on
//     plan-state — that is a user-visible log label, deliberately cased
//     differently from the outcome enum. Same words, different audiences.

export const STOP_REVIEW_OUTCOME = Object.freeze({
  ALLOW: "allow",
  ALLOW_DOWNGRADED: "allow_downgraded",
  BLOCK: "block",
  SKIPPED: "skipped",
  TIMEOUT: "timeout",
});

export const STOP_REVIEW_OUTCOME_VALUES = new Set(
  Object.values(STOP_REVIEW_OUTCOME),
);
