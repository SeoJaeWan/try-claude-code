# Dev-review flow notes

Background that supplements Step 4 in `SKILL.md`. Read this when the
rework branch fires or you need the rationale behind round bookkeeping.

## Rework is per-commit

One `rework_items[i]` covers one flagged commit and aggregates every
`needs-change` line comment on it. Multiple rework items may be dispatched
sequentially (safe default) or in parallel when they target different
commits whose files do not overlap.

The rework dispatch's description is whatever the runtime produces; it is
**not** a `Plan: ...` dispatch. Like the plan dispatch in Step 3, rework
dispatches must be foreground (no `run_in_background: true`) — the runner
has to wait for completion before calling `rework-done` and re-entering
dev-review.

## Rework intentionally does not call `arm-for-dispatch`

Stop-review is bypassed for rework commits because the reviewer sees them
directly in the next dev-review round; routing them through stop-review
would decouple round counts from review results and create BLOCK ↔ rework
cycles that the UI cannot represent.

## Round bookkeeping invariants

The dev-review server reads `dev_review.current_round` directly as
`review_iteration`, so the runner is responsible for keeping it accurate.
`begin-rework` is the only call that bumps the round — the first entry
into Step 4 stays at round 1 because there is no rework yet.

| Trigger | Effect on round |
|---|---|
| First Step 4 entry (after Stop-review ALLOW) | stays at round 1, no bump |
| `result = "approved"` | no change, move to Step 5 via `mark-approved` |
| `result = "qa_required"` | no change, phase toggles `awaiting → qa → awaiting` (`mark-qa-pending` / `qa-resolved`) |
| `result = "rework"` | `begin-rework` bumps round + flips phase `awaiting → rework` + records feedback path in one call; after every rework agent commits, `rework-done` flips phase back to `awaiting` |

## Why "foreground only" matters

Background for the "**Foreground only — never pass `run_in_background:
true`**" rule in Step 3.

A foreground Agent call blocks the turn until the agent finishes, so the
Stop hook only fires once commits are in place. A background dispatch
returns immediately, the model often ends the turn before commits exist,
and the Stop hook would see a zero-commit range. The current Stop hook
catches this — `collectDiffForPlan` returns null and the fallback emits
"[stop-gate] dispatch됐지만 새 commit 없음", leaving the gate armed for
the next foreground re-dispatch. Cost of the slip: one wasted turn.

(A previous version of the runner had a PreToolUse gate that refused
backgrounded Agent dispatches outright. That gate was removed because
its sub-agent BLOCK false positives caused worse problems than the
slip it prevented — see `references/enforcement.md`.)
