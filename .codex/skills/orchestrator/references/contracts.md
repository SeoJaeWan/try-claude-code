# Orchestrator Contracts

## Inputs to Inspect

1. Latest user request and latest conversation context.
2. Existing executable plan files under `./plans/**` relevant to the task.
3. Existing review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` when present.
4. Existing `./.codex/artifacts/brainstorm/**` or `./.codex/artifacts/ui-spec/**` artifacts when directly referenced, latest relevant to the task, or needed to prove the next plan-maker pass is planning-ready.
5. `../plan-maker/SKILL.md`.
6. `../plan-tdd/SKILL.md`.
7. `../plan-review/SKILL.md`.
8. `../plan-wiki-setup/references/staging-contract.md`.
9. `../plan-wiki-setup/references/sync-repair.md` only when the plan wiki fast-forward preflight fails and the next safe route must be reported.
10. `../dev-wiki-setup/references/staging-contract.md` when `.codex/dev-wiki/config.json` exists or dev wiki root is being reported.
11. `../dev-wiki-setup/references/sync-policy.md` only when the dev wiki fast-forward preflight fails and the next safe route must be reported.
12. `../dev-wiki-setup/references/consumer-context.md` when passing `dev_wiki_root` to planning roles.
13. `../figma-inventory-snapshot/SKILL.md` only when a controller-verified Figma inventory artifact is already required by the locked planning input.

## Runtime Expectations

- Assume the controller can load and execute local `plan-maker` and `plan-tdd` skills inline in the main session for the active pass.
- Assume the runtime can invoke a fresh generic planning sub-agent and attach the local `plan-review` skill for cold review.
- If `plan-maker` or `plan-tdd` is missing or unreadable, stop and report the blocker before writing artifacts.
- If a fresh `plan-review` sub-agent cannot be invoked or cannot attach the local `plan-review` skill, stop and report the blocker.
- Run `plan-maker` and `plan-tdd` inline by default. Use sub-agents for those roles only when the user explicitly requests delegation, when the controller chooses a bounded parallel/fallback pass with disjoint write scope, or when an inline pass is impossible.
- Never inline `plan-review`. The reviewer must stay independent from the controller that wrote or revised `plan.md` and `tdd.md`.
- Do not run `brainstorm`, request-scope locking, or UI-spec locking from this orchestrator contract unless the user explicitly invoked that separate skill or explicitly asked to continue beyond planning.
- Do not repair the plan wiki source clone inside orchestrator. When `git -C .codex/plan-wiki/source pull --ff-only` fails, stop and route to `plan-wiki-setup` sync/repair before any planning role invocation.
- If `.codex/dev-wiki/config.json` exists, refresh the dev wiki source clone before planning roles with `git -C .codex/dev-wiki/source pull --ff-only`, mirroring the plan wiki freshness preflight.
- Do not repair the dev wiki source clone inside orchestrator. When the dev wiki fast-forward pull fails, stop and route to `dev-wiki-setup` sync/repair before any planning role invocation.
- For implementation-scope plans, run `plan-tdd` after every current plan-maker pass and before `plan-review`; do not report browser approval or planning completion from a plan-only review.
- Run planning docs only through `references/planning-docs.md` after a fresh `plan-review` has accepted the current plan signature and matching `tdd.md`.
- Do not create, mutate, or rely on `state.json`, `clarification.md`, or `user-gate.md`.
- Treat orchestration helper state as current-turn only. It may be recomputed from artifacts on every re-entry.
- Always use a fresh reviewer pass for `plan-review`; do not reuse a prior reviewer agent by default.
- If a required inline role cannot complete or write fresh artifacts, classify the exact artifact or role failure.
- If a required reviewer sub-agent invocation fails, report the exact target role and exact tool error.

## Authoritative Artifacts

Treat only these artifacts as durable orchestration evidence:

- executable plan files under `./plans/{task-slug}/`
- TDD report at `./plans/{task-slug}/tdd.md` and source-tree TDD tests written by `plan-tdd`
- planning-only evidence artifacts referenced by executable plans under `./plans/{task-slug}/evidence/**`
- controller-verified upstream Figma inventory artifacts under `./.codex/artifacts/figma-inventory/{task-slug}/` when the current pass selected them and lists them in `authoritative_existing_inputs`
- review artifact at `./plans/_orchestrator/review/{task-slug}/review.md`
- planning docs artifacts under `./plans/{task-slug}/planning-docs/`
- directly referenced upstream request-lock or UI-direction artifacts under `./.codex/artifacts/**`
- verified `dev_wiki_root` under `./.codex/dev-wiki/source/{project}` when the workspace has opted in and the source clone fast-forward preflight succeeded

Do not create a second source of truth for stage, approval, blocker routing, or agent reuse.

## Ephemeral Helper State

The orchestrator may keep only current-turn helper state such as:

- `task_slug`
- selected `plan_path`
- current `plan_signature`
- `current_handoff_signature`
- `active_reviewer_agent_id` for the currently running fresh review pass when available
- `delegated_role_agent_ids` for optional non-default delegated maker/TDD passes when available
- whether the current review artifact is fresh
- whether the current planning docs package and approval evidence match the current `plan_signature`
- the latest user question still awaiting an answer
- `last_meaningful_progress_at`
- the last inline role, delegated role, or reviewer outcome and exact failure text
- per-turn retry counters

This helper state must be safely discardable between turns.

## Freshness Rules

- The current plan fingerprint is `plan_signature`: a stable short fingerprint of the current executable plan file.
- A `tdd.md` artifact is fresh only when its frontmatter `plan_path` and `plan_signature` match the current plan file and its `outcome` is `completed` or an explicit blocker is present for the current plan.
- A `review.md` artifact is fresh only when both `plan_path` and `plan_signature` match the current plan file on disk and the review was run with the matching `tdd.md` in place.
- Planning docs approval is fresh only when `feedback.json.review_status` is `submitted`, every required `review-data.json.review_items[]` entry has `item_status[target_id].approved = true`, each `approved_against.plan_signature` and `approved_against.review_item_signature` matches the current review item, and no active `needs-change` or `question` comments remain.
- Planning docs package generation is fresh only when any plan-referenced evidence asset has been copied from `plans/{task-slug}/evidence/**` into `plans/{task-slug}/planning-docs/assets/evidence/**`, its `content_hash` is represented in `review-data.json`, and `review-data.json.tdd_summary` reflects the current `tdd.md`.
- When `plan_signature` changes, treat previous TDD, cold review, and planning docs state as stale and recompute from artifacts.
- When `plan_signature` changes, regenerate the planning docs package and carry forward only approvals whose item signatures still match.

## Wait Policy

- Inline `plan-maker` and `plan-tdd` passes are controller work, so sub-agent wait policy does not apply to them.
- When a fresh reviewer or optional delegated maker/TDD pass is on the critical path, prefer a long wait over repeated short polling.
- For reviewer passes, the first bounded wait should normally be at least 3 minutes, and 5 minutes is preferred when the workflow is otherwise blocked on review.
- For optional delegated maker/TDD passes, use the same bounded wait policy only after confirming delegation is still the chosen route.
- If the sub-agent emits meaningful progress, or if the required artifact path or reviewed plan file changes on disk during the wait window, refresh `last_meaningful_progress_at` and allow another bounded wait before intervening.
- Do not treat slow sub-agent analysis alone as `agent_protocol_failure` while there is fresh evidence of progress.
- Only switch a reviewer to a narrowed fallback such as `write now or block` after sustained idle time: normally at least 5 minutes for reviewer.
- For `plan-review`, prefer a fresh reviewer even when a prior reviewer agent still exists.
- A timed-out `wait_agent` call with empty status is not evidence that the sub-agent is idle, stuck, or finished.

## Handoff Packet Rules

When invoking a fresh reviewer or optional delegated role sub-agent, pass a concise handoff packet in the prompt or structured message, not a file-backed orchestration packet.

Include only the minimum fields needed for the role:

- target skill and role label for the pass
- `task_slug`
- selected `plan_path` when known
- authoritative `plan_wiki_root`
- verified `dev_wiki_root` when `.codex/dev-wiki/config.json` exists and the fast-forward preflight succeeded
- current `plan_signature` when freshness matters
- latest user-request summary when the role cannot safely rely on full parent context
- authoritative locked request summary or artifact path when present
- `authoritative_existing_inputs` containing only controller-verified literal paths
- controller-verified Figma inventory `manifest.json` and snapshot paths when Figma inventory is required for the next role
- `known_missing_inputs` containing referenced but missing literal paths only as non-authoritative context
- latest review artifact path when the next `plan-maker` pass is revising from review findings
- latest `tdd.md` path when the next `plan-review` pass must review plan/TDD alignment
- explicit output path requirements for the role

Do not force reviewer or delegated sub-agents to rediscover orchestrator-owned metadata. Do not include wildcard globs, open-ended discovery prompts, or instructions that ask the sub-agent to reinterpret missing paths into new authoritative inputs. State narrow terminal output contracts explicitly.

## Failure Taxonomy

- `missing_upstream_lock`: request scope, UI direction, test strategy, execution-agent boundary, planning-ready artifact status, or latest relevant request-lock artifact is not locked enough for `plan-maker`
- `invocation_failure`: the runtime could not invoke the required fresh reviewer or optional delegated planning sub-agent
- `agent_protocol_failure`: the delegated agent or reviewer replied or streamed progress, but did not provide a usable terminal result for the requested role before the bounded wait ended
- `artifact_writeback_failure`: an inline role or delegated agent completed or appeared complete, but the required artifact is still missing or stale on disk
- `tdd_gate_blocker`: `plan-tdd` returned a blocker, wrote stale `tdd.md`, or could not map selected plan clauses to source-tree tests, execution commands, or manual smoke gates
- `tool_data_blocker`: the role pass completed with `needs_user_input = false` because required external tool data, permission, timeout-safe shard data, or source inventory coverage is unavailable
- `plan_wiki_sync_required`: the plan wiki source clone could not be refreshed by fast-forward preflight because it is dirty, diverged, conflicted, behind local commits, or otherwise needs `plan-wiki-setup` sync/repair before planning roles can consume it
- `dev_wiki_sync_required`: the dev wiki source clone could not be refreshed by fast-forward preflight because it is dirty, diverged, conflicted, behind local commits, missing, remote-mismatched, or otherwise needs `dev-wiki-setup` sync/repair before planning roles can consume it
- `planning_docs_gate_blocker`: the planning docs package cannot be generated, the review server cannot be started, feedback is incomplete, or submitted feedback requires routing before planning can complete
- `controller_interruption`: the controller shut down a still-running reviewer or optional delegated planning sub-agent before explicit user cancellation or before the role-specific idle window was satisfied
- `no_progress`: the same artifact signature or finding signature repeated against an unchanged plan after one safe retry

Report the exact classification when stopping.

## Chat Response Requirements

- Keep orchestration updates short.
- Tell the user which stage is running.
- Present user-decision questions in Korean.
- When blocked, say which role blocked and what the next safe route would be.
- When blocked by `missing_upstream_lock`, state that `brainstorm`, `figma-inventory-snapshot`, UI-direction locking, test-strategy locking, or another upstream locking step must happen before rerunning orchestrator.
- When blocked by `tool_data_blocker`, report the exact missing tool/data root, path, or artifact instead of asking the user for a planning decision.
- When blocked by `plan_wiki_sync_required`, report the failing fast-forward command, nested repo status summary, and that `plan-wiki-setup` sync/repair must receive or reconcile remote changes before rerunning orchestrator.
- When blocked by `dev_wiki_sync_required`, report the failing fast-forward command, nested repo status summary, and that `dev-wiki-setup` sync/repair must receive or reconcile remote changes before rerunning orchestrator.
- When stopping, report the exact failure classification.

## Output Contract

- Plan artifacts under `./plans/**`
- Review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` with YAML frontmatter status fields
- TDD artifact under `./plans/{task-slug}/tdd.md` and source-tree TDD tests when implementation scope applies
- Planning docs artifacts under `./plans/{task-slug}/planning-docs/**` when implementation scope requires user approval
- Chat output that names the current implementation readiness after planning docs approval
