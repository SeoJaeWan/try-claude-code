# Orchestrator Contracts

## Inputs to Inspect

1. Latest user request and latest conversation context.
2. Existing executable plan files under `./plans/**` relevant to the task.
3. Existing review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` when present.
4. Existing `./.codex/artifacts/brainstorm/**` or `./.codex/artifacts/ui-spec/**` artifacts when directly referenced, latest relevant to the task, or needed to prove the next architect pass is planning-ready.
5. `../architect/SKILL.md`.
6. `../plan-tdd/SKILL.md`.
7. `../plan-review/SKILL.md`.
8. `../plan-wiki-setup/references/staging-contract.md`.
9. `../figma-inventory-snapshot/SKILL.md` only when a controller-verified Figma inventory artifact is already required by the locked planning input.

## Runtime Expectations

- Assume the runtime can invoke generic planning sub-agents and attach the local `architect`, `plan-tdd`, or `plan-review` skill for the active pass.
- If a required local skill is missing, unreadable, or cannot be attached to a sub-agent, stop and report the blocker.
- Do not silently inline architect, TDD, or reviewer work when the sub-agent path is available.
- Do not run `brainstorm`, request-scope locking, or UI-spec locking from this orchestrator contract unless the user explicitly invoked that separate skill or explicitly asked to continue beyond planning.
- For implementation-scope plans, run `plan-tdd` after every current architect pass and before `plan-review`; do not report browser approval or planning completion from a plan-only review.
- Run developer review only through `references/developer-review.md` after a fresh `plan-review` has accepted the current plan signature and matching `tdd.md`.
- Do not create, mutate, or rely on `state.json`, `clarification.md`, or `user-gate.md`.
- Treat orchestration helper state as current-turn only. It may be recomputed from artifacts on every re-entry.
- Prefer role-pinned live-agent reuse for `architect` when the same `task_slug`, role contract, and handoff authority still apply.
- Always use a fresh reviewer pass for `plan-review`; do not reuse a prior reviewer agent by default.
- If a planning sub-agent invocation fails, report the exact target role and exact tool error.

## Authoritative Artifacts

Treat only these artifacts as durable orchestration evidence:

- executable plan files under `./plans/{task-slug}/`
- TDD report at `./plans/{task-slug}/tdd.md` and source-tree TDD tests written by `plan-tdd`
- planning-only evidence artifacts referenced by executable plans under `./plans/{task-slug}/evidence/**`
- controller-verified upstream Figma inventory artifacts under `./.codex/artifacts/figma-inventory/{task-slug}/` when the current pass selected them and lists them in `authoritative_existing_inputs`
- review artifact at `./plans/_orchestrator/review/{task-slug}/review.md`
- developer review artifacts under `./plans/{task-slug}/developer-review/`
- directly referenced upstream request-lock or UI-direction artifacts under `./.codex/artifacts/**`

Do not create a second source of truth for stage, approval, blocker routing, or agent reuse.

## Ephemeral Helper State

The orchestrator may keep only current-turn helper state such as:

- `task_slug`
- selected `plan_path`
- current `plan_signature`
- `current_handoff_signature`
- `active_role_agent_id` for the currently running role pass when available
- `live_role_agents` keyed by role for reusable `architect` passes when available
- whether the current review artifact is fresh
- whether the current developer review package and approval evidence match the current `plan_signature`
- the latest user question still awaiting an answer
- `last_meaningful_progress_at`
- the last planning sub-agent outcome and exact failure text
- per-turn retry counters

This helper state must be safely discardable between turns.

## Freshness Rules

- The current plan fingerprint is `plan_signature`: a stable short fingerprint of the current executable plan file.
- A `tdd.md` artifact is fresh only when its frontmatter `plan_path` and `plan_signature` match the current plan file and its `outcome` is `completed` or an explicit blocker is present for the current plan.
- A `review.md` artifact is fresh only when both `plan_path` and `plan_signature` match the current plan file on disk and the review was run with the matching `tdd.md` in place.
- Developer review approval is fresh only when `feedback.json.review_status` is `submitted`, every required `review-data.json.review_items[]` entry has `item_status[target_id].approved = true`, each `approved_against.plan_signature` and `approved_against.review_item_signature` matches the current review item, and no active `needs-change` or `question` comments remain.
- Developer review package generation is fresh only when any plan-referenced evidence asset has been copied from `plans/{task-slug}/evidence/**` into `plans/{task-slug}/developer-review/assets/evidence/**`, its `content_hash` is represented in `review-data.json`, and `review-data.json.tdd_summary` reflects the current `tdd.md`.
- When `plan_signature` changes, treat previous TDD, cold review, and browser review state as stale and recompute from artifacts.
- When `plan_signature` changes, regenerate the developer review package and carry forward only approvals whose item signatures still match.

## Wait Policy

- When a role pass is on the critical path, prefer a long wait over repeated short polling.
- For architect, TDD, and reviewer passes, the first bounded wait should normally be at least 3 minutes, and 5 minutes is preferred when the workflow is otherwise blocked on that pass.
- If the sub-agent emits meaningful progress, or if the required artifact path or reviewed plan file changes on disk during the wait window, refresh `last_meaningful_progress_at` and allow another bounded wait before intervening.
- Do not treat slow analysis alone as `agent_protocol_failure` while there is fresh evidence of progress.
- Only switch to a narrowed fallback such as `write now or block` after sustained idle time: normally at least 5 minutes for reviewer and at least 8 minutes for architect.
- For `architect`, prefer reusing a compatible live role agent before spawning a replacement.
- For `plan-review`, prefer a fresh reviewer even when a prior reviewer agent still exists.
- A timed-out `wait_agent` call with empty status is not evidence that the sub-agent is idle, stuck, or finished.

## Handoff Packet Rules

When invoking a planning sub-agent, pass a concise handoff packet in the prompt or structured message, not a file-backed orchestration packet.

Include only the minimum fields needed for the role:

- target skill and role label for the pass
- `task_slug`
- selected `plan_path` when known
- authoritative `plan_wiki_root`
- current `plan_signature` when freshness matters
- latest user-request summary when the role cannot safely rely on full parent context
- authoritative locked request summary or artifact path when present
- `authoritative_existing_inputs` containing only controller-verified literal paths
- controller-verified Figma inventory `manifest.json` and snapshot paths when Figma inventory is required for the next role
- `known_missing_inputs` containing referenced but missing literal paths only as non-authoritative context
- latest review artifact path when the next `architect` pass is revising from review findings
- latest `tdd.md` path when the next `plan-review` pass must review plan/TDD alignment
- explicit output path requirements for the role

Do not force planning sub-agents to rediscover orchestrator-owned metadata. Do not include wildcard globs, open-ended discovery prompts, or instructions that ask the sub-agent to reinterpret missing paths into new authoritative inputs. State narrow terminal output contracts explicitly.

## Failure Taxonomy

- `missing_upstream_lock`: request scope, UI direction, test strategy, execution-agent boundary, planning-ready artifact status, or latest relevant request-lock artifact is not locked enough for `architect`
- `invocation_failure`: the runtime could not invoke or reuse the planning sub-agent
- `agent_protocol_failure`: the agent replied or streamed progress, but did not provide a usable terminal result for the requested role before the bounded wait ended
- `artifact_writeback_failure`: the agent claimed success but the required artifact is still missing or stale on disk
- `tdd_gate_blocker`: `plan-tdd` returned a blocker, wrote stale `tdd.md`, or could not map selected plan clauses to source-tree tests, execution commands, or manual smoke gates
- `tool_data_blocker`: the role pass completed with `needs_user_input = false` because required external tool data, permission, timeout-safe shard data, or source inventory coverage is unavailable
- `developer_review_gate_blocker`: the developer review package cannot be generated, the review server cannot be started, feedback is incomplete, or submitted feedback requires routing before planning can complete
- `controller_interruption`: the controller shut down a still-running planning sub-agent before explicit user cancellation or before the role-specific idle window was satisfied
- `no_progress`: the same artifact signature or finding signature repeated against an unchanged plan after one safe retry

Report the exact classification when stopping.

## Chat Response Requirements

- Keep orchestration updates short.
- Tell the user which stage is running.
- Present user-decision questions in Korean.
- When blocked, say which role blocked and what the next safe route would be.
- When blocked by `missing_upstream_lock`, state that `brainstorm`, `figma-inventory-snapshot`, UI-direction locking, test-strategy locking, or another upstream locking step must happen before rerunning orchestrator.
- When blocked by `tool_data_blocker`, report the exact missing tool/data root, path, or artifact instead of asking the user for a planning decision.
- When stopping, report the exact failure classification.

## Output Contract

- Plan artifacts under `./plans/**`
- Review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` with YAML frontmatter status fields
- TDD artifact under `./plans/{task-slug}/tdd.md` and source-tree TDD tests when implementation scope applies
- Developer review artifacts under `./plans/{task-slug}/developer-review/**` when implementation scope requires user approval
- Chat output that names the current implementation readiness after developer review approval
