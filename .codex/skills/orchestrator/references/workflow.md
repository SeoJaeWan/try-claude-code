# Orchestrator Workflow

## Table of Contents

- Step 0. Normalize target and verify prerequisites
- Step 1. Build the current orchestration picture
- Step 2. Run architect draft or revision
- Step 3. Run cold review
- Step 4. Route review findings
- Step 5. Developer review gate
- Step 6. Triage developer review feedback
- Step 7. Capture developer review learnings
- Step 8. Materialize tests
- Step 9. Route materialize outcomes
- Step 10. Completion

Follow `contracts.md` for freshness, handoff, wait, failure, chat, and output rules. Follow `developer-review.md` for Steps 5 and 6. Follow `developer-review-learning.md` for Step 7.

## Step 0. Normalize Target and Verify Prerequisites

- Derive one canonical `task-slug`.
- Resolve the planning `review_wiki_root` to `./.codex/review-wiki/sync/current`.
- If `./.codex/review-wiki/sync/current` is missing, stop and route to `review-wiki-setup` instead of attempting per-run staging inside this skill.
- Confirm the linked local `brainstorm`, `architect`, `plan-review`, and `plan-materialize` skills are present.
- Confirm `../design-discovery/SKILL.md` before taking a UI-direction feedback route.
- Confirm `./references/developer-review-ui.md`, `./assets/developer-review/index.html`, and `../../tools/developer-review-server.mjs` are present before entering the developer review gate.
- Derive the default plan path as `./plans/{task-slug}/plan.md` unless the current run explicitly targets another existing executable plan.
- Collect task-local plan or prerequisite paths referenced by the user request, current selected plan, latest fresh review/materialize artifact, or directly referenced upstream `brainstorm` / `design-discovery` artifact when they affect the next role pass.
- Resolve each referenced path literally before spawning a planning sub-agent.
- Build `authoritative_existing_inputs` from verified present paths only.
- If a verified brainstorm or design-discovery artifact already locks ambiguity for the next architect pass, treat that artifact as authoritative upstream input.
- Build `known_missing_inputs` from referenced but missing paths only as controller-owned notes.
- If the next architect pass depends on local upstream plan artifacts and no authoritative input remains after verification, stop and report the blocker.
- Inspect current `plan.md`, linked phase detail files, `review.md`, developer review files, and `materialize.md` when they exist.

## Step 1. Build the Current Orchestration Picture

- If no executable `plan.md` exists for the selected `task-slug`, route first to an `architect` pass.
- If `plan.md` exists, compute current `plan_signature` and determine whether `review.md`, developer review package/feedback, and `materialize.md` are fresh.
- Do not reconstruct hidden stage from old chat text when artifacts disagree.
- If current developer review approval cannot be tied to current `plan_signature`, treat approval as absent and require browser review again later.
- Developer review approval is binary: every required Overview and Phase step must be `approved`.
- If `feedback.json` is submitted and any required step or card is not `approved`, treat the state as `feedback_triage_pending`.
- When feedback triage is pending, do not continue to materialization and do not route directly to `architect` from raw feedback labels.
- Use Step 6 to decide whether the next safe route is chat clarification, `brainstorm`, `design-discovery`, or `architect`.

## Step 2. Run Architect Draft or Revision

Invoke `architect` when:

- no executable `plan.md` exists
- latest fresh `review.md` routes back to `architect`
- latest fresh `materialize.md` routes back to `architect`
- developer review feedback triage resolved to `plan_revision`
- completed `brainstorm` or `design-discovery` locked missing decisions and next safe route is `architect`
- user requested plan changes or answered a question that changes the plan contract

Controller requirements:

- Reuse the live `architect` role agent for the same `task_slug` when compatible; otherwise start a new generic planning sub-agent and attach `architect`.
- Pass a handoff packet with exact `task-slug`, `plan_path`, `review_wiki_root`, verified inputs, missing-input notes, latest review/developer feedback path when revising, locked request summary when available, and write scope under `./plans/{task-slug}/`.
- Require exactly one result: `result = wrote_plan` with `written_paths`, or `result = blocking_packet` with user-input fields.
- After every architect pass, re-check `plan_path` and recompute `plan_signature`.
- If the architect returned a blocking packet, ask the user directly in chat and route the answer back to the next architect pass.
- Apply the wait policy and classify failures with `contracts.md`.
- Allow one safe retry only when the controller materially changed the handoff. Do not retry unchanged handoffs or retry while a previous architect pass is still progressing.

## Step 3. Run Cold Review

- Invoke a fresh `plan-review` reviewer only when executable `plan.md` exists and current `review.md` is missing or stale.
- Do not reuse a prior reviewer agent by default.
- Pass exact `task-slug`, `plan_path`, `review_wiki_root`, current `plan_signature`, and required output path `./plans/_orchestrator/review/{task-slug}/review.md`.
- Limit reviewer write scope to the required review artifact.
- Require `review.md` YAML frontmatter with at least `plan_path`, `task_slug`, `plan_signature`, `outcome`, `next_action`, `finding_signature`, `requires_user_decision`, `issue_codes`, and `affected_phase_paths`.
- After the reviewer finishes, reread `review.md` from disk.
- Apply the wait policy and classify failures with `contracts.md`.

## Step 4. Route Review Findings

- If fresh review outcome is `blocked`, send findings to the next `architect` pass.
- If outcome is `ready-with-findings`, continue to developer review gate and include findings as visible review cards.
- If review says `requires_user_decision = true`, `next_action = developer_review`, or legacy `next_action = user_gate`, continue to developer review gate and surface the decision in the browser package.
- If outcome is `ready`, continue to developer review gate.
- If the same `finding_signature` repeats against the same `plan_signature` after one architect revision attempt, stop and report `no_progress`.

## Step 5. Developer Review Gate

Follow [developer-review.md](developer-review.md). Always require explicit browser-based developer review before materialization.

## Step 6. Triage Developer Review Feedback

Follow [developer-review.md](developer-review.md). Triage submitted non-approved browser feedback before choosing the next role pass.

## Step 7. Capture Developer Review Learnings

Follow [developer-review-learning.md](developer-review-learning.md). Capture reusable learning after the submitted round is preserved and either approved or triaged.

## Step 8. Materialize Tests

- Invoke `plan-materialize` only after submitted developer review approval of current `plan_signature`.
- Invoke it only when current `materialize.md` is missing or stale.
- Reuse the live `materializer` role agent for the same `task_slug` when compatible; otherwise start a new generic planning sub-agent and attach `plan-materialize`.
- Pass exact `task-slug`, `plan_path`, and current `plan_signature`.
- Let it create or update source-tree tests and plan-local `materialize.md`.
- Require `materialize.md` YAML frontmatter with at least `plan_path`, `task_slug`, `plan_signature`, `outcome`, `gate_status`, `blocker_type`, `blocker_code`, `next_action`, `resume_from`, `materialize_signature`, `requires_user_decision`, `blocked_clause_ids`, and `affected_phase_paths`.
- After the materializer finishes, reread `materialize.md` from disk.
- Apply the wait policy and classify failures with `contracts.md`.

## Step 9. Route Materialize Outcomes

- `outcome = completed` and `gate_status = passed`: orchestration can complete.
- `outcome = completed` and `gate_status = failed`: stop and tell the user materialization finished but the targeted gate did not pass.
- `outcome = blocked` and `blocker_type = external_setup`: stop and tell the user which prerequisite must be added first.
- `outcome = blocked` and `blocker_type = plan_ambiguity`: route blocker back to `architect`, rerun review, regenerate developer review UI, and require fresh approval before another materialize pass.
- `outcome = blocked` and `blocker_type = user_policy`: ask the user directly in chat. If the answer changes the plan contract, route to `architect`; if it only chooses between already planned policy variants, rerun `plan-materialize` against the same signature.
- If the same `materialize_signature` repeats against the same `plan_signature` after one architect or user intervention attempt, stop and report `no_progress`.

## Step 10. Completion

The orchestration is `done` only when all of the following are true:

- executable plan artifacts exist
- fresh `review.md` exists for current `plan_signature`
- latest fresh review is ready enough to proceed
- developer review feedback explicitly approved current `plan_signature`
- fresh `materialize.md` exists for current `plan_signature`
- latest fresh materialization result is `completed` with `gate_status = passed`
