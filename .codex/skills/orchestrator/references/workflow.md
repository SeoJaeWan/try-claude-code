# Orchestrator Workflow

## Table of Contents

- Step 0. Normalize target and verify prerequisites
- Step 1. Build the current orchestration picture
- Step 2. Run architect draft or revision
- Step 3. Run cold review
- Step 4. Route review findings
- Step 5. Completion

Follow `contracts.md` for freshness, handoff, wait, failure, chat, and output rules.

## Step 0. Normalize Target and Verify Prerequisites

- Derive one canonical `task-slug`.
- Resolve the planning `plan_wiki_root` to `./.codex/plan-wiki/sync/current`.
- If `./.codex/plan-wiki/sync/current` is missing, stop and route to `plan-wiki-setup` instead of attempting per-run staging inside this skill.
- Confirm the linked local `architect` and `plan-review` capabilities are present before routing to them.
- Do not invoke `brainstorm`. If the latest context or referenced artifacts do not lock request scope, UI direction when relevant, and required/excluded execution areas, stop with `missing_upstream_lock`.
- Derive the default plan directory as `./plans/{task-slug}/`.
- If the current run explicitly targets an existing executable plan file, resolve that file as `plan_path`.
- Collect task-local plan or prerequisite paths referenced by the user request, current selected plan, latest fresh review artifact, or directly referenced upstream decision artifact when they affect the next role pass.
- Resolve each referenced path literally before spawning a planning sub-agent.
- Build `authoritative_existing_inputs` from verified present paths only.
- If a verified upstream decision artifact already locks ambiguity for the next architect pass, treat that artifact as authoritative upstream input.
- Build `known_missing_inputs` from referenced but missing paths only as controller-owned notes.
- If the next architect pass depends on local upstream plan artifacts and no authoritative input remains after verification, stop and report the blocker.

## Step 1. Build the Current Orchestration Picture

- If no executable plan file exists for the selected `task-slug`, route first to an `architect` pass.
- If one or more executable plan files exist, select the target `plan_path` from the current request, latest artifact, or deterministic path order. Review one plan file at a time.
- Compute current `plan_signature` for the selected plan file and determine whether `review.md` is fresh.
- Do not reconstruct hidden stage from old chat text when artifacts disagree.
- If multiple plan files were just written, run Step 3 for each file that lacks a fresh review.

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
- If outcome is `ready-with-findings`, treat the plan as planning-complete with noted non-blocking findings.
- If outcome is `ready`, treat the plan as planning-complete.
- If the same `finding_signature` repeats against the same `plan_signature` after one architect revision attempt, stop and report `no_progress`.

## Step 5. Completion

The orchestration is `planning_complete` only when all selected executable plan files have fresh `review.md` artifacts whose outcome is `ready` or `ready-with-findings`.

Report:

- written or reviewed plan file paths
- review artifact path
- final review outcome for each plan
- any remaining non-blocking findings
