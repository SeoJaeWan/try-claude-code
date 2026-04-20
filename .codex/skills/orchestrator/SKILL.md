---
name: orchestrator
description: Explicit multi-agent planning orchestrator for requests that should run through the repository's planning loop instead of a one-off planning pass. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for the automated architect/review/materialize workflow, and Codex should coordinate `plan-architect`, `plan-reviewer`, and `plan-materializer` through a stateless artifact-driven controller with explicit user approval before test materialization.
---

<Skill_Guide>
<Purpose>
Run the repository's planning loop as a stateless, artifact-driven workflow with named planning agents, explicit user approval, and no file-backed orchestration state.
</Purpose>

<Instructions>
# orchestrator

Use this skill only for explicit planning orchestration requests.
Do not use it as a generic replacement for `architect`, `plan-review`, or `plan-materialize`.

## Inputs to inspect

1. Latest user request and latest conversation context
2. Existing plan artifacts under `./plans/**` relevant to the task
3. Existing review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` when present
4. Existing plan-local `materialize.md` adjacent to the selected executable plan when present
5. `./.codex/agents/plan-architect.toml`
6. `./.codex/agents/plan-reviewer.toml`
7. `./.codex/agents/plan-materializer.toml`
8. `../review-wiki-setup/references/staging-contract.md`

## Required runtime expectations

- This skill assumes the runtime can invoke the named custom agents `plan-architect`, `plan-reviewer`, and `plan-materializer`.
- If any named agent definition is missing, unreadable, or not invokable, stop and report the blocker.
- Do not silently inline architect, reviewer, or materializer work inside this skill when the named-agent path is expected.
- Do not create, mutate, or rely on `state.json`, `clarification.md`, or `user-gate.md`.
- Treat orchestration helper state as current-turn only. It may be recomputed from artifacts on every re-entry.
- Do not hardcode runtime-specific spawn tactics such as `fork_context = true` or packet-only fallbacks into the orchestration contract. Use the safest runtime invocation the platform supports at execution time.
- Reuse a still-usable named planning agent when convenient, but do not persist agent ids to disk or require same-agent reuse to make progress.
- If a named-agent invocation fails, report the exact target role and the exact tool error.

## Authoritative artifacts

Treat only these artifacts as durable orchestration evidence:

- executable plan artifacts under `./plans/{task-slug}/`
- review artifact at `./plans/_orchestrator/review/{task-slug}/review.md`
- plan-local materialization report at `./plans/{task-slug}/materialize.md`

Do not create a second source of truth for stage, approval, blocker routing, or agent reuse.

## Ephemeral helper state

The orchestrator may keep only current-turn helper state such as:

- `task_slug`
- selected `plan_path`
- current `plan_signature`
- whether the current review artifact is fresh
- whether the current materialize artifact is fresh
- the latest user question still awaiting an answer
- the last named-agent outcome and exact failure text
- per-turn retry counters

This helper state must be safely discardable between turns.

## Freshness rules

- The current plan fingerprint is `plan_signature`: a stable short fingerprint of the current `plan.md` plus every linked phase detail file.
- A `review.md` artifact is fresh only when both `plan_path` and `plan_signature` match the current plan artifacts on disk.
- A `materialize.md` artifact is fresh only when both `plan_path` and `plan_signature` match the current plan artifacts on disk.
- User approval is valid only for the exact current `plan_signature`.
- When `plan_signature` changes, treat previous review, approval, and materialization state as stale and recompute from the artifacts.

## Handoff packet rules

When invoking a named planning agent, pass a concise handoff packet in the prompt or structured message, not a file-backed orchestration packet.

The handoff should include only the minimum fields needed for the role:

- `task_slug`
- selected `plan_path`
- authoritative `review_wiki_root` when the role uses it
- current `plan_signature` when freshness matters
- latest user-request summary when the role cannot safely rely on full parent context
- latest review artifact path when `plan-architect` is revising from review findings
- explicit output path requirements for the role

Do not force named planning agents to rediscover orchestrator-owned metadata from disk when the controller already selected it.

## Failure taxonomy

Classify named-agent failures precisely instead of collapsing them into a generic stall:

- `invocation_failure`: the runtime could not invoke or reuse the named agent
- `agent_protocol_failure`: the agent replied but did not provide a usable result for the requested role
- `artifact_writeback_failure`: the agent claimed success but the required artifact is still missing or stale on disk
- `no_progress`: the same artifact signature or finding signature repeated against an unchanged plan after one safe retry

Report the exact classification when stopping.

## Workflow

### Step 0. Normalize target and verify prerequisites

- Derive one canonical `task-slug`.
- Resolve the planning `review_wiki_root` to `./.codex/review-wiki/sync/current`.
- If `./.codex/review-wiki/sync/current` is missing, stop and route to `review-wiki-setup` instead of attempting per-run staging inside this skill.
- Confirm `plan-architect`, `plan-reviewer`, and `plan-materializer` definitions exist.
- Confirm the linked local skills are present.
- Derive the default plan path as `./plans/{task-slug}/plan.md` unless the current run explicitly targets another existing executable plan.
- Inspect the current `plan.md`, linked phase detail files, `review.md`, and `materialize.md` when they exist.

### Step 1. Build the current orchestration picture

- If no executable `plan.md` exists for the selected `task-slug`, route first to `plan-architect`.
- If `plan.md` exists:
  - compute the current `plan_signature`
  - determine whether `review.md` is present and fresh
  - determine whether `materialize.md` is present and fresh
- Do not reconstruct hidden stage from old chat text when the artifacts disagree.
- If current user approval cannot be tied to the current `plan_signature`, treat approval as absent and ask again later.

### Step 2. Run architect draft or revision

- Invoke `plan-architect` when:
  - no executable `plan.md` exists
  - the latest fresh `review.md` routes back to `architect`
  - the latest fresh `materialize.md` routes back to `architect`
  - the user requested plan changes or answered a question that changes the plan contract
- Ask it to stay within the `architect` skill.
- Pass a handoff packet containing:
  - exact `task-slug`
  - exact `plan_path`
  - authoritative `review_wiki_root`
  - latest review artifact path when revising
  - latest request summary when the runtime did not provide full continuity safely
  - explicit write scope under `./plans/{task-slug}/`
- Require `plan-architect` to do exactly one of:
  - write or update the executable plan artifacts under `./plans/{task-slug}/`
  - return a concise blocking decision packet in chat when fresh user input is required before any plan can be written
- Do not ask `plan-architect` to write `clarification.md` or `user-gate.md`.
- After every architect pass, re-check `plan_path` on disk and recompute the current `plan_signature`.
- If the architect returned a blocking decision packet, ask the user directly in chat and route the answer back to `plan-architect`.
- If the invocation failed, classify it as `invocation_failure`.
- If the architect replied without a usable plan result or blocking decision packet, classify it as `agent_protocol_failure`.
- If the architect claimed to write or update a plan but the plan artifact is still missing or stale on disk, classify it as `artifact_writeback_failure`.
- After one safe retry in the same turn, stop and report the exact failure instead of looping indefinitely.

### Step 3. Run cold review

- Invoke `plan-reviewer` only when an executable `plan.md` exists and the current `review.md` is missing or stale.
- Pass a handoff packet containing:
  - exact `task-slug`
  - exact `plan_path`
  - authoritative `review_wiki_root`
  - current `plan_signature`
- Require `review.md` to start with a YAML frontmatter block containing at least:
  - `plan_path`
  - `task_slug`
  - `plan_signature`
  - `outcome`
  - `next_action`
  - `finding_signature`
  - `requires_user_decision`
  - `issue_codes`
  - `affected_phase_paths`
- After the reviewer finishes, reread `review.md` from disk instead of trusting transient chat alone.
- If the invocation failed, classify it as `invocation_failure`.
- If the reviewer replied without a usable review result, classify it as `agent_protocol_failure`.
- If the reviewer claimed success but `review.md` is still missing or stale, classify it as `artifact_writeback_failure`.

### Step 4. Route review findings

- If the fresh review outcome is `blocked`, send the findings to `plan-architect`.
- If the fresh review outcome is `ready-with-findings`, send the findings to `plan-architect`.
- If the fresh review says `requires_user_decision = true` or `next_action = user_gate`, continue to the user gate.
- If the fresh review outcome is `ready`, continue to the user gate.
- If the same `finding_signature` repeats against the same `plan_signature` after one architect revision attempt, stop and report `no_progress`.

### Step 5. User gate

Always require explicit user approval before materialization.

At the gate:

- Present the current `plan.md` path and the latest fresh `review.md` outcome in Korean.
- When the review or materialization result already contains enough information to ask the user directly, ask directly in chat.
- Only ask `plan-architect` for a short decision summary in chat when the current artifacts do not expose the decision clearly enough.
- Do not create `user-gate.md`.
- If the user requests plan changes, route the request back to `plan-architect` and rerun review.
- If the user answers a policy question that changes the plan contract, route the answer to `plan-architect`, rerun review, and ask for approval again.
- If the user explicitly approves the current `plan_signature`, continue to materialization.

### Step 6. Materialize tests

- Invoke `plan-materializer` only after explicit user approval of the current `plan_signature`.
- Invoke it only when the current `materialize.md` is missing or stale.
- Pass a handoff packet containing:
  - exact `task-slug`
  - exact `plan_path`
  - current `plan_signature`
- Let it create or update source-tree tests and plan-local `materialize.md`.
- Require `materialize.md` to start with a YAML frontmatter block containing at least:
  - `plan_path`
  - `task_slug`
  - `plan_signature`
  - `outcome`
  - `gate_status`
  - `blocker_type`
  - `blocker_code`
  - `next_action`
  - `resume_from`
  - `materialize_signature`
  - `requires_user_decision`
  - `blocked_clause_ids`
  - `affected_phase_paths`
- After the materializer finishes, reread `materialize.md` from disk instead of trusting transient chat alone.
- If the invocation failed, classify it as `invocation_failure`.
- If the materializer replied without a usable result, classify it as `agent_protocol_failure`.
- If the materializer claimed success but `materialize.md` is still missing or stale, classify it as `artifact_writeback_failure`.

### Step 7. Route materialize outcomes

- If `outcome = completed` and `gate_status = passed`, the orchestration is done.
- If `outcome = completed` and `gate_status = failed`, stop and tell the user that materialization finished but the targeted gate did not pass.
- If `outcome = blocked` and `blocker_type = external_setup`, stop and tell the user which prerequisite must be added first.
- If `outcome = blocked` and `blocker_type = plan_ambiguity`, route the blocker back to `plan-architect`, rerun review, and require fresh approval before another materialize pass.
- If `outcome = blocked` and `blocker_type = user_policy`, ask the user directly in chat:
  - if the answer changes the plan contract, route to `plan-architect`, rerun review, and require fresh approval
  - if the answer only chooses between already-planned policy variants without changing the plan files, rerun `plan-materializer` against the same current `plan_signature`
- If the same `materialize_signature` repeats against the same `plan_signature` after one architect or user intervention attempt, stop and report `no_progress`.

### Step 8. Completion

The orchestration is `done` only when all of the following are true:

- executable plan artifacts exist
- a fresh `review.md` exists for the current `plan_signature`
- the latest fresh review is ready enough to proceed
- the user explicitly approved the current `plan_signature`
- a fresh `materialize.md` exists for the current `plan_signature`
- the latest fresh materialization result is `completed` with `gate_status = passed`

## Chat response requirements

- Keep orchestration updates short.
- Tell the user which stage is running.
- Present user-decision questions in Korean.
- When blocked, say which role blocked and what the next safe route would be.
- When stopping, report the exact failure classification instead of saying only that the workflow is stuck.
- When materialization completes but `gate_status = failed`, say that the planning workflow finished but the targeted test gate did not pass.

## Output contract

- Plan artifacts under `./plans/**`
- Review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` with YAML frontmatter status fields
- Test materialization output under plan-local `materialize.md` with YAML frontmatter status fields

## Guardrails

- Orchestrate only: do not substitute for `architect`, `plan-review`, or `plan-materialize`.
- Do not implement production code.
- Do not create or rely on `state.json`, `clarification.md`, or `user-gate.md`.
- Do not hardcode runtime-specific spawn mechanics into the skill contract.
- Do not ask named planning agents to rediscover `plan_path`, `plan_signature`, or `review_wiki_root` when the orchestrator already selected them.
- Do not trust stale review or materialize artifacts after `plan_signature` changes.
- Do not skip explicit user approval.
- Do not let `plan-reviewer` edit plans.
- Do not let `plan-materializer` patch plan ambiguity with tests.
- Do not bypass review after architect revisions.
- Do not reuse approval after the plan changes.
- Do not keep looping silently when the same signature repeats with no plan progress.
- Do not collapse invocation, protocol, and artifact-writeback failures into one generic stall.

</Instructions>
</Skill_Guide>
