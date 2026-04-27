# Orchestrator Contracts

## Table of Contents

- Inputs to inspect
- Runtime expectations
- Authoritative artifacts
- Ephemeral helper state
- Freshness rules
- Wait policy
- Handoff packet rules
- Failure taxonomy
- Chat response requirements
- Output contract

## Inputs to Inspect

1. Latest user request and latest conversation context
2. Existing plan artifacts under `./plans/**` relevant to the task
3. Existing review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` when present
4. Existing plan-local `materialize.md` adjacent to the selected executable plan when present
5. Existing `./.codex/artifacts/brainstorm/**` or `./.codex/artifacts/design-discovery/**` artifacts when directly referenced or when they narrow the next architect pass
6. `../brainstorm/SKILL.md`
7. `../design-discovery/SKILL.md` when UI-direction feedback triage may be needed
8. `../architect/SKILL.md`
9. `../plan-review/SKILL.md`
10. Existing developer review artifacts under `./plans/{task-slug}/developer-review/` when present
11. `../review-wiki-ingest/SKILL.md` when developer review learnings should be normalized into the review wiki
12. `../plan-materialize/SKILL.md`
13. `../review-wiki-setup/references/staging-contract.md`
14. `./references/developer-review-ui.md`

## Runtime Expectations

- Assume the runtime can invoke generic planning sub-agents and attach the local `brainstorm`, `design-discovery`, `architect`, `plan-review`, or `plan-materialize` skill for the active pass.
- If a required local skill is missing, unreadable, or cannot be attached to a sub-agent, stop and report the blocker.
- Optional legacy planning profiles may exist under `./.codex/agents/`, but do not require them for this workflow.
- Do not silently inline brainstorm, design-discovery, architect, reviewer, or materializer work when the sub-agent path is available.
- Do not create, mutate, or rely on `state.json`, `clarification.md`, or `user-gate.md`.
- Treat orchestration helper state as current-turn only. It may be recomputed from artifacts on every re-entry.
- Do not hardcode runtime-specific spawn tactics such as `fork_context = true` or packet-only fallbacks into the orchestration contract.
- Prefer role-pinned live-agent reuse for `brainstorm`, `design-discovery`, `architect`, and `plan-materialize` when the same `task_slug`, role contract, and handoff authority still apply.
- Always use a fresh reviewer pass for `plan-review`; do not reuse a prior reviewer agent by default.
- Reuse a still-usable planning sub-agent when convenient, but do not persist agent ids to disk or require same-agent reuse to make progress.
- If a planning sub-agent invocation fails, report the exact target role and exact tool error.
- If a planning sub-agent is still `running`, do not shut it down merely because a bounded wait timed out.
- If the controller must shut down a still-running planning sub-agent, report a controller-initiated interruption.

## Authoritative Artifacts

Treat only these artifacts as durable orchestration evidence:

- executable plan artifacts under `./plans/{task-slug}/`
- review artifact at `./plans/_orchestrator/review/{task-slug}/review.md`
- developer review artifacts under `./plans/{task-slug}/developer-review/`
- developer review history artifact at `./plans/{task-slug}/developer-review/review-history.json`
- plan-local materialization report at `./plans/{task-slug}/materialize.md`

Do not create a second source of truth for stage, approval, blocker routing, or agent reuse.

## Ephemeral Helper State

The orchestrator may keep only current-turn helper state such as:

- `task_slug`
- selected `plan_path`
- current `plan_signature`
- `current_handoff_signature`
- `active_role_agent_id` for the currently running role pass when available
- `live_role_agents` keyed by role for reusable `brainstorm`, `design-discovery`, `architect`, and `materializer` passes when available
- `active_role_started_at`
- whether the current review artifact is fresh
- whether the current developer review package is fresh
- whether the current developer review feedback is submitted and fresh
- the current feedback triage route for submitted non-approved developer review feedback
- whether current developer review learnings were captured or intentionally skipped for this turn
- whether the current materialize artifact is fresh
- the latest user question still awaiting an answer
- `last_meaningful_progress_at`
- the last planning sub-agent outcome and exact failure text
- per-turn retry counters

This helper state must be safely discardable between turns.

## Freshness Rules

- The current plan fingerprint is `plan_signature`: a stable short fingerprint of the current `plan.md` plus every linked phase detail file.
- A `review.md` artifact is fresh only when both `plan_path` and `plan_signature` match the current plan artifacts on disk.
- A developer review package is fresh only when `review-data.json`, `feedback.json`, and `review-history.json` are all present, and the current developer-review model files reference the current `plan_signature` appropriately.
- Developer review approval is valid only when `feedback.json` has `review_status = submitted`, every required step is `approved`, and its `plan_signature` matches the current plan signature.
- Submitted developer review feedback with any required step or card not `approved` is fresh triage input, not approval.
- `review-history.json` may contain prior signatures, but its `current_plan_signature` must match the current plan signature whenever the developer review package is refreshed.
- A `materialize.md` artifact is fresh only when both `plan_path` and `plan_signature` match the current plan artifacts on disk.
- Developer approval is valid only for the exact current `plan_signature` recorded in developer review feedback.
- When `plan_signature` changes, treat previous cold review, developer review approval, and materialization state as stale and recompute from artifacts.

## Wait Policy

- When a role pass is on the critical path, prefer a long wait over repeated short polling.
- For brainstorm, design-discovery, architect, reviewer, and materializer passes, the first bounded wait should normally be at least 3 minutes, and 5 minutes is preferred when the workflow is otherwise blocked on that pass.
- If the sub-agent emits meaningful progress, or if the required artifact path or reviewed plan files change on disk during the wait window, refresh `last_meaningful_progress_at` and allow another bounded wait before intervening.
- If the runtime supports a longer one-shot wait safely, prefer that over repeated short waits.
- Do not treat slow analysis alone as `agent_protocol_failure` while there is fresh evidence of progress.
- If a new user turn arrives while a planning sub-agent is still running and there is recent progress, prefer waiting on or reusing the same sub-agent.
- Only switch to a narrowed fallback such as `write now or block` after sustained idle time: normally at least 5 minutes for reviewer/materializer and at least 8 minutes for architect.
- When the same still-running sub-agent is reused after user re-entry, keep the role, handoff authority, and output contract unchanged unless the user actually changed the plan contract.
- For `brainstorm`, `design-discovery`, `architect`, and `materializer`, prefer reusing a compatible live role agent before spawning a replacement.
- For `plan-review`, prefer a fresh reviewer even when a prior reviewer agent still exists.
- A timed-out `wait_agent` call with empty status is not evidence that the sub-agent is idle, stuck, or finished.
- Before closing or replacing a role pass after a timeout, re-check recent progress messages and the full write scope for created or updated files or directories.
- Never call `close_agent` on a still-running planning sub-agent unless the user canceled, the plan contract changed and the old pass has satisfied the idle window, or the runtime cannot safely continue reuse.
- If `close_agent` returns `previous_status = running`, treat that as proof the controller interrupted a live pass.

## Handoff Packet Rules

When invoking a planning sub-agent, pass a concise handoff packet in the prompt or structured message, not a file-backed orchestration packet.

Include only the minimum fields needed for the role:

- target skill and role label for the pass
- `task_slug`
- selected `plan_path`
- authoritative `review_wiki_root` when the role uses it
- current `plan_signature` when freshness matters
- latest user-request summary when the role cannot safely rely on full parent context
- `authoritative_existing_inputs` containing only controller-verified literal paths
- `known_missing_inputs` containing referenced but missing literal paths only as non-authoritative context
- latest review artifact path when the next `architect` pass is revising from review findings
- latest developer review `feedback.json` path when the next `brainstorm`, `design-discovery`, or `architect` pass is revising from browser feedback
- explicit output path requirements for the role

Do not force planning sub-agents to rediscover orchestrator-owned metadata. Do not include wildcard globs, open-ended discovery prompts, or instructions that ask the sub-agent to reinterpret missing paths into new authoritative inputs. State narrow terminal output contracts explicitly.

## Failure Taxonomy

- `invocation_failure`: the runtime could not invoke or reuse the planning sub-agent
- `agent_protocol_failure`: the agent replied or streamed progress, but did not provide a usable terminal result for the requested role before the bounded wait ended
- `artifact_writeback_failure`: the agent claimed success but the required artifact is still missing or stale on disk
- `controller_interruption`: the controller shut down a still-running planning sub-agent before explicit user cancellation or before the role-specific idle window was satisfied
- `no_progress`: the same artifact signature or finding signature repeated against an unchanged plan after one safe retry

Report the exact classification when stopping.

## Chat Response Requirements

- Keep orchestration updates short.
- Tell the user which stage is running.
- Present user-decision questions in Korean.
- Current developer review gates must present `http://localhost:8787/review/{task-slug}` or the chosen alternate port URL and tell the user to reply `review complete` after pressing submit in the browser.
- When developer review feedback is not fully approved, say that feedback triage is running and name the next safe route: chat clarification, `brainstorm`, `design-discovery`, or `architect`.
- When a new developer review package is shown after feedback triage, keep prior review comments and controller actions visible through the package history.
- When developer review learning capture runs, say whether it produced reusable review wiki candidates, raw-only evidence, or no promotable learning.
- When blocked, say which role blocked and what the next safe route would be.
- When stopping, report the exact failure classification.
- When materialization completes but `gate_status = failed`, say that the planning workflow finished but the targeted test gate did not pass.

## Output Contract

- Plan artifacts under `./plans/**`
- Review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` with YAML frontmatter status fields
- Developer review package under `./plans/{task-slug}/developer-review/`
- Developer review history artifact under `./plans/{task-slug}/developer-review/review-history.json`
- Optional developer review learning evidence for `review-wiki-ingest`, with provenance to the source review round and current `plan_signature`
- Test materialization output under plan-local `materialize.md` with YAML frontmatter status fields
