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

## Feedback file bookkeeping

There is no round counter. Each invocation of dev-review writes the
current state into `feedback.json` and the prior round's data into
`review-history.json` (see dev-review SKILL.md Step 3). The runner's only
bookkeeping responsibility is recording the feedback path in
`state.dev_review.last_feedback_path` via `begin-rework` so rework
dispatches can find it.

Every `리뷰 완료` closes a round and the skill reopens a clean one — the
reviewer re-reviews every commit each round, and the prior round's comments
move to `review-history.json`. So that the **response** each comment got
shows up in History next to it, the runner writes
`plans/{plan_key}/dev-review/round-responses.json` before re-invoking
dev-review for a `qa_required` or `rework` result (required for qa — chat
answers exist nowhere else; optional for rework — the skill can derive it
from follow-up commits). The skill consumes and deletes the file. Shape and
fallbacks: dev-review `references/review-data-schema.md` → "round-responses.json".

| Trigger | Effect |
|---|---|
| First Step 4 entry (right after the plan-agent returns in Step 3) | dev-review skill writes a fresh `feedback.json`; runner has nothing to do until the result comes back |
| `result = "approved"` | move to Step 5 (no CLI call needed — state file stays until cleanup) |
| `result = "qa_required"` | phase toggles `awaiting → qa → awaiting` (`mark-qa-pending` / `qa-resolved`) |
| `result = "rework"` | `begin-rework` flips phase `awaiting → rework` and records the feedback path in one call; after every rework agent commits, `rework-done` flips phase back to `awaiting` |

## Why foreground matters

Background for the "**Foreground only — never pass `run_in_background:
true`**" rule in Step 3.

A foreground Agent call blocks the turn until the agent finishes, so the
runner can move directly into Step 4 (dev-review) in the same turn once
the commits are in place. A background dispatch returns immediately, the
model often ends the turn before commits exist, and the next `/runner`
resume mis-routes to Step 3 again (the routing table sees worktree present
+ zero commits and picks "dispatch the plan agent" — looping you back).

Cost of the slip: one wasted turn re-dispatching foreground.

(A previous version of the runner used a Stop hook + Codex auto-review to
gate dispatches, and a PreToolUse gate that refused backgrounded Agent
dispatches outright. Both layers were removed because their false
positives caused worse problems than the slip they prevented — the human
reviewer in dev-review catches every issue the gates were meant to catch.)
