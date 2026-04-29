# Orchestrator Workflow

## Table of Contents

- Step 0. Normalize target and verify prerequisites
- Step 1. Build the current orchestration picture
- Step 1A. Prepare Figma inventory snapshots
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
- Confirm the linked local request-scope, UI-spec, `architect`, `plan-review`, and `plan-materialize` capabilities are present before routing to them.
- If the current request, selected plan, review finding, or developer feedback requires Figma tree inventory, component-set inventory, Resource/* inventory, platform marker inventory, or Figma-based classification artifacts before planning, confirm `../figma-inventory-snapshot/SKILL.md` is present before routing to `architect`.
- Confirm `./references/developer-review-ui.md`, `./assets/developer-review/index.html`, `../../tools/developer-review-server.mjs`, and `../../tools/start-developer-review-server.mjs` are present before entering the developer review gate.
- Derive the default plan path as `./plans/{task-slug}/plan.md` unless the current run explicitly targets another existing executable plan.
- Collect task-local plan or prerequisite paths referenced by the user request, current selected plan, latest fresh review/materialize artifact, or directly referenced upstream decision artifact when they affect the next role pass.
- Resolve each referenced path literally before spawning a planning sub-agent.
- Build `authoritative_existing_inputs` from verified present paths only.
- If a verified upstream decision artifact already locks ambiguity for the next architect pass, treat that artifact as authoritative upstream input.
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
- Use Step 6 to decide whether the next safe route is chat clarification, request-scope locking, UI direction locking, or `architect`.

## Step 1A. Prepare Figma Inventory Snapshots

Run this step only when the next `architect` pass depends on Figma inventory rather than a simple Figma URL reference.

- Determine the exact `fileKey`, required root nodes, required paths, and required markers from the latest user request, verified upstream artifacts, fresh review findings, or current plan context.
- If the required root nodes or inventory scope are not derivable from verified inputs, route to request-scope locking or ask the user; do not send an open-ended Figma discovery prompt to `architect`.
- If a matching `./.codex/artifacts/figma-inventory/{task-slug}/manifest.json` exists and is fresh under `contracts.md`, add the manifest and referenced snapshot paths to `authoritative_existing_inputs`.
- If no fresh manifest exists, invoke a generic planning sub-agent with `figma-inventory-snapshot` attached.
- Pass exact `task-slug`, `fileKey`, `root_nodes`, `required_paths`, `required_markers`, and output path `./.codex/artifacts/figma-inventory/{task-slug}/`.
- Require exactly one result: `result = wrote_snapshot` with `manifest_path` and `written_paths`, or `result = blocking_packet`.
- After `wrote_snapshot`, read `manifest.json`; verify every referenced snapshot path exists, every required root is `ok` or `ok_by_shards` unless the handoff explicitly accepts `partial_names_only`, `coverageComplete = true`, `truncated = false`, and no required path is missing. If any check fails, classify the pass as `artifact_writeback_failure` or `tool_data_blocker` as appropriate.
- Add the verified `manifest.json` and snapshot paths to the next `architect` handoff as authoritative inputs.
- Do not classify Figma components, write `classification.md`, or infer missing families in this step.

## Step 2. Run Architect Draft or Revision

Invoke `architect` when:

- no executable `plan.md` exists
- latest fresh `review.md` routes back to `architect`
- latest fresh `materialize.md` routes back to `architect`
- developer review feedback triage resolved to `plan_revision`
- completed upstream decision work locked missing decisions and next safe route is `architect`
- user requested plan changes or answered a question that changes the plan contract

Controller requirements:

- Reuse the live `architect` role agent for the same `task_slug` when compatible; otherwise start a new generic planning sub-agent and attach `architect`.
- Pass a handoff packet with exact `task-slug`, `plan_path`, `review_wiki_root`, verified inputs, missing-input notes, latest review/developer feedback path when revising, locked request summary when available, and write scope under `./plans/{task-slug}/`.
- When Figma inventory is required, include the controller-verified `figma-inventory` manifest and snapshot paths in `authoritative_existing_inputs`, and state: use these snapshots as the only authoritative Figma inventory source; preserve their provenance in any Figma-derived contract artifact; do not use Code Connect to infer inventory completeness; do not attempt full-file Figma tree reads; return a `tool_data_blocker` with exact missing root/path if coverage is insufficient.
- Require exactly one result: `result = wrote_plan` with `written_paths`, or `result = blocking_packet` with user-input fields.
- After every architect pass, re-check `plan_path` and recompute `plan_signature`.
- If the architect returned a blocking packet with `needs_user_input = true`, ask the user directly in chat and route the answer back to the next architect pass.
- If the architect returned `needs_user_input = false` for missing Figma inventory coverage, route once through Step 1A when the controller can materially add or refresh snapshot inputs; otherwise stop with `tool_data_blocker`.
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
- `outcome = blocked` and `blocker_type = plan_ambiguity`: route blocker back to `architect`, rerun review, regenerate the developer review data package, and require fresh approval before another materialize pass.
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
