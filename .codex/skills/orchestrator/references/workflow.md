# Orchestrator Workflow

## Table of Contents

- Step 0. Normalize target and verify prerequisites
- Step 1. Build the current orchestration picture
- Step 2. Run architect draft or revision
- Step 3. Run cold review
- Step 4. Route review findings
- Step 5. Developer review gate
- Step 6. Triage developer review feedback
- Step 7. Capture developer review learning
- Step 8. Completion

Follow `contracts.md` for freshness, handoff, wait, failure, chat, and output rules.

## Step 0. Normalize Target and Verify Prerequisites

- Derive one canonical `task-slug`.
- Resolve the planning `plan_wiki_root` to `./.codex/plan-wiki/sync/current`.
- If `./.codex/plan-wiki/sync/current` is missing, stop and route to `plan-wiki-setup` instead of attempting per-run staging inside this skill.
- Confirm the linked local `architect` and `plan-review` capabilities are present before routing to them.
- Do not invoke `brainstorm`. If the latest context or referenced artifacts do not lock request scope, UI direction when relevant, and required/excluded execution areas, stop with `missing_upstream_lock`.
- If a directly referenced or latest relevant brainstorm artifact exists, read its `artifact_status` before invoking `architect`.
  - Continue only when the artifact is `ready_for_planning` or the current user request explicitly targets an already-approved executable plan.
  - Stop with `missing_upstream_lock` when the artifact is `needs_diagnostic_inventory`, `needs_locked_ui_direction`, `needs_test_strategy_lock`, `needs_execution_environment_lock`, `needs_scope_lock`, or another non-ready `needs_*` state.
  - Stop with `missing_upstream_lock` when the artifact is `superseded` and no verified successor artifact is present.
  - When the artifact's `planning-ready 판정표` has any `blocking` row, use that row's `다음 조치` as the next safe route instead of invoking `architect`.
- Derive the default plan directory as `./plans/{task-slug}/`.
- If the current run explicitly targets an existing executable plan file, resolve that file as `plan_path`.
- Collect task-local plan or prerequisite paths referenced by the user request, current selected plan, latest fresh review artifact, or directly referenced upstream decision artifact when they affect the next role pass.
- Resolve each referenced path literally before spawning a planning sub-agent.
- Build `authoritative_existing_inputs` from verified present paths only.
- If a verified upstream decision artifact already locks ambiguity for the next architect pass, treat that artifact as authoritative upstream input.
- If the locked upstream input makes Figma or another external source the authority for implementation or validation, verify the named inventory manifest and snapshot files exist before adding them to `authoritative_existing_inputs`; otherwise stop with `tool_data_blocker`.
- Build `known_missing_inputs` from referenced but missing paths only as controller-owned notes.
- If the next architect pass depends on local upstream plan artifacts and no authoritative input remains after verification, stop and report the blocker.

## Step 1. Build the Current Orchestration Picture

- If no executable plan file exists for the selected `task-slug`, route first to an `architect` pass.
- If one or more executable plan files exist, select the target `plan_path` from the current request, latest artifact, or deterministic path order. Review one plan file at a time.
- Compute current `plan_signature` for the selected plan file and determine whether `review.md` is fresh.
- Do not reconstruct hidden stage from old chat text when artifacts disagree.
- If multiple plan files were just written, run Step 3 for each file that lacks a fresh review.
- If all selected plan files have fresh acceptable review artifacts, inspect developer review artifacts for the current `plan_signature` before deciding completion.

## Step 2. Run Architect Draft or Revision

Invoke `architect` when:

- no executable plan file exists for the selected `task-slug`
- latest fresh `review.md` routes back to `architect`
- user requested plan changes or answered a question that changes the plan contract

Controller requirements:

- Reuse the live `architect` role agent for the same `task_slug` when compatible; otherwise start a new generic planning sub-agent and attach `architect`.
- Pass a handoff packet with exact `task-slug`, optional `plan_path`, `plan_wiki_root`, verified inputs, missing-input notes, latest review path when revising, locked request summary when available, and write scope under `./plans/{task-slug}/`.
- When Figma inventory is required, include only controller-verified `figma-inventory` manifest and snapshot paths in `authoritative_existing_inputs`.
- Require exactly one result: `result = wrote_plan` with `written_paths`, or `result = blocking_packet` with user-input fields.
- After every architect pass, re-check written plan files and recompute `plan_signature` for each selected review target.
- If the architect returned a blocking packet with `needs_user_input = true`, ask the user directly in chat and stop. The user's answer should be handled upstream or by a later architect pass.
- If the architect returned `needs_user_input = false` for missing tool data, stop with `tool_data_blocker`.
- Apply the wait policy and classify failures with `contracts.md`.
- Allow one safe retry only when the controller materially changed the handoff. Do not retry unchanged handoffs or retry while a previous architect pass is still progressing.

## Step 3. Run Cold Review

- Invoke a fresh `plan-review` reviewer only when an executable plan file exists and current `review.md` is missing or stale for that plan file.
- Do not reuse a prior reviewer agent by default.
- Pass exact `task-slug`, `plan_path`, `plan_wiki_root`, current `plan_signature`, and required output path `./plans/_orchestrator/review/{task-slug}/review.md`.
- Limit reviewer write scope to the required review artifact.
- Require `review.md` YAML frontmatter with at least `plan_path`, `task_slug`, `plan_signature`, `outcome`, `next_action`, `finding_signature`, `requires_user_decision`, `issue_codes`, and `affected_plan_paths`.
- After the reviewer finishes, reread `review.md` from disk.
- Apply the wait policy and classify failures with `contracts.md`.

## Step 4. Route Review Findings

- If fresh review outcome is `blocked`, send findings to the next `architect` pass.
- If outcome is `ready-with-findings`, route to Step 5 with noted non-blocking findings.
- If outcome is `ready`, route to Step 5.
- If the same `finding_signature` repeats against the same `plan_signature` after one architect revision attempt, stop and report `no_progress`.

## Step 5. Developer Review Gate

- Follow `references/developer-review.md` Step 5.
- Generate or refresh `./plans/{task-slug}/developer-review/` for the current `plan_signature`.
- The package must expose `review_items[]` for Overview and every required Phase target. If the plan has implementation scope but does not provide reviewable Phase targets, route to `architect` for plan revision instead of presenting a flattened review.
- Start or reuse the shared developer review server through the documented launcher and report the printed `developer_review_url` to the user.
- Stop with `developer_review_gate_blocker` while waiting for the user to submit the browser review and say `review complete`.
- When the user says `review complete`, read `feedback.json` and continue only if the submitted feedback matches the current `task_slug`, `plan_signature`, and review item signatures.

## Step 6. Triage Developer Review Feedback

- Follow `references/developer-review.md` Step 6.
- If every required review item is approved with current signature evidence and no active `needs-change` or `question` comment remains, continue to Step 7.
- If any required review item is not approved or any active non-approved comment remains, preserve or update `review-history.json`, classify the feedback, and route according to `references/developer-review.md`.
- Feedback that changes plan meaning routes to `architect`; after revision, rerun Step 3 and Step 5 for the new `plan_signature`.
- Feedback that only needs an answer must be answered in chat, then the same-signature review package must require browser re-submit.

## Step 7. Capture Developer Review Learning

- Follow `references/developer-review-learning.md` after a submitted browser review round has been preserved and either approved or triaged.
- Treat learning capture as non-blocking unless it corrupts authoritative developer review artifacts.
- Run this step before resetting `feedback.json`, regenerating the package, changing `plan_signature`, or invoking the next role when feasible.

## Step 8. Completion

The orchestration is `planning_complete` only when all selected executable plan files have fresh `review.md` artifacts whose outcome is `ready` or `ready-with-findings`, and each implementation-scope plan has explicit current developer review approval.

For implementation-scope plans, `planning_complete` is not the next implementation instruction by itself. The final report must explicitly state that the next required gate is `$plan-tdd` against the approved `plan_path`, and production implementation must wait until the TDD pass has written source-tree tests and `tdd.md` or returned a classified blocker.

Report:

- written or reviewed plan file paths
- review artifact path
- final review outcome for each plan
- developer review artifact path and approval state for each implementation-scope plan
- next required gate for each implementation-scope plan, normally `$plan-tdd`
- any remaining non-blocking findings
