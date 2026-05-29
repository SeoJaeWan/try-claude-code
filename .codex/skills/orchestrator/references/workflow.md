# Orchestrator Workflow

## Table of Contents

- Step 0. Normalize target and verify prerequisites
- Step 1. Build the current orchestration picture
- Step 2. Run plan-maker draft or revision
- Step 3. Run TDD contract authoring
- Step 4. Run cold review
- Step 5. Route review findings
- Step 6. Planning docs gate
- Step 7. Triage planning docs feedback
- Step 8. Capture planning docs learning
- Step 9. Completion

Follow `contracts.md` for freshness, handoff, wait, failure, chat, and output rules.

## Step 0. Normalize Target and Verify Prerequisites

- Derive one canonical `task-slug`.
- Resolve the planning `plan_wiki_root` to `./.codex/plan-wiki/source/wiki`.
- If `./.codex/plan-wiki/source/wiki` is missing, stop and route to `plan-wiki-setup` instead of attempting per-run staging inside this skill.
- Before invoking any planning role, run `git -C .codex/plan-wiki/source pull --ff-only` once to refresh the plan wiki source clone.
- If the fast-forward pull fails, stop before routing to planning roles and route to the `plan-wiki-setup` sync/repair unit. Report the failing command output, nested repo branch status, and `plan_wiki_sync_required`; do not ask planning sub-agents to fetch, pull, or repair the plan wiki source clone.
- Do not merge, rebase, reset, clean, stash, or push the plan wiki source clone inside orchestrator. That repair belongs to `plan-wiki-setup`.
- If `./.codex/dev-wiki/config.json` exists, treat this workspace as dev wiki opted in for orchestration context.
- Resolve the dev wiki source clone to `./.codex/dev-wiki/source` and the project wiki root from `config.json` as `./.codex/dev-wiki/source/{project}`.
- If dev wiki is opted in but the source clone or project folder is missing, stop before routing to planning roles and route to `dev-wiki-setup`; do not create or infer a dev wiki project from orchestrator.
- Before invoking any planning role, run `git -C .codex/dev-wiki/source pull --ff-only` once to refresh the dev wiki source clone from GitHub, matching the plan wiki freshness pattern.
- If the dev wiki fast-forward pull fails, stop before routing to planning roles and route to the `dev-wiki-setup` sync/repair unit. Report the failing command output, nested repo branch status, and `dev_wiki_sync_required`; do not ask planning sub-agents to fetch, pull, or repair the dev wiki source clone.
- Do not merge, rebase, reset, clean, stash, or push the dev wiki source clone inside orchestrator. That repair belongs to `dev-wiki-setup`.
- Add verified dev wiki context paths, when present, to planning role handoffs so roles can read current project conventions, architecture notes, workflows, and graph artifacts without rediscovering the nested repo.
- Confirm the linked local `plan-maker`, `plan-tdd`, and `plan-review` capabilities are present before routing to them.
- Do not invoke `brainstorm`. If the latest context or referenced artifacts do not lock request scope, UI direction when relevant, and required/excluded execution areas, stop with `missing_upstream_lock`.
- If a directly referenced or latest relevant brainstorm artifact exists, read its `artifact_status` before invoking `plan-maker`.
  - Continue only when the artifact is `ready_for_planning` or the current user request explicitly targets an already-approved executable plan.
  - Stop with `missing_upstream_lock` when the artifact is `needs_diagnostic_inventory`, `needs_locked_ui_direction`, `needs_test_strategy_lock`, `needs_execution_environment_lock`, `needs_scope_lock`, or another non-ready `needs_*` state.
  - Stop with `missing_upstream_lock` when the artifact is `superseded` and no verified successor artifact is present.
  - When the artifact's `planning-ready 판정표` has any `blocking` row, use that row's `다음 조치` as the next safe route instead of invoking `plan-maker`.
- Derive the default plan directory as `./plans/{task-slug}/`.
- If the current run explicitly targets an existing executable plan file, resolve that file as `plan_path`.
- Collect task-local plan or prerequisite paths referenced by the user request, current selected plan, latest fresh review artifact, or directly referenced upstream decision artifact when they affect the next role pass.
- Resolve each referenced path literally before spawning a planning sub-agent.
- Build `authoritative_existing_inputs` from verified present paths only.
- If a verified upstream decision artifact already locks ambiguity for the next plan-maker pass, treat that artifact as authoritative upstream input.
- If the locked upstream input makes Figma or another external source the authority for implementation or validation, verify the named inventory manifest and snapshot files exist before adding them to `authoritative_existing_inputs`; otherwise stop with `tool_data_blocker`.
- Build `known_missing_inputs` from referenced but missing paths only as controller-owned notes.
- If the next plan-maker pass depends on local upstream plan artifacts and no authoritative input remains after verification, stop and report the blocker.

## Step 1. Build the Current Orchestration Picture

- If no executable plan file exists for the selected `task-slug`, route first to a `plan-maker` pass.
- If one or more executable plan files exist, select the target `plan_path` from the current request, latest artifact, or deterministic path order. Review one plan file at a time.
- Compute current `plan_signature` for the selected plan file and determine whether `tdd.md` and `review.md` are fresh.
- Do not reconstruct hidden stage from old chat text when artifacts disagree.
- If multiple plan files were just written, run Step 3 for each file that lacks a fresh TDD artifact.
- If all selected plan files have fresh acceptable review artifacts, inspect planning docs artifacts for the current `plan_signature` before deciding completion.

## Step 2. Run Plan Maker Draft or Revision

Invoke `plan-maker` when:

- no executable plan file exists for the selected `task-slug`
- latest fresh `review.md` routes back to `plan-maker`
- user requested plan changes or answered a question that changes the plan contract

Controller requirements:

- Reuse the live `plan-maker` role agent for the same `task_slug` when compatible; otherwise start a new generic planning sub-agent and attach `plan-maker`.
- Pass a handoff packet with exact `task-slug`, optional `plan_path`, `plan_wiki_root`, verified dev wiki context paths when available, verified inputs, missing-input notes, latest review path when revising, locked request summary when available, and write scope under `./plans/{task-slug}/`.
- When Figma inventory is required, include only controller-verified `figma-inventory` manifest and snapshot paths in `authoritative_existing_inputs`.
- Require exactly one result: `result = wrote_plan` with `written_paths`, or `result = blocking_packet` with user-input fields.
- After every plan-maker pass, re-check written plan files and recompute `plan_signature` for each selected review target.
- If the plan-maker returned a blocking packet with `needs_user_input = true`, ask the user directly in chat and stop. The user's answer should be handled upstream or by a later plan-maker pass.
- If the plan-maker returned `needs_user_input = false` for missing tool data, stop with `tool_data_blocker`.
- Apply the wait policy and classify failures with `contracts.md`.
- Allow one safe retry only when the controller materially changed the handoff. Do not retry unchanged handoffs or retry while a previous plan-maker pass is still progressing.

## Step 3. Run TDD Contract Authoring

- Invoke `plan-tdd` when an executable implementation-scope plan exists and current `tdd.md` is missing or stale for that plan file.
- Pass exact `task-slug`, `plan_path`, `plan_wiki_root`, current `plan_signature`, and required output path `./plans/{task-slug}/tdd.md`.
- Limit the TDD pass to source-tree tests and `tdd.md`; it must not edit production code.
- Require `tdd.md` YAML frontmatter with at least `plan_path`, `task_slug`, `plan_signature`, `outcome`, `gate_status`, `blocker_type`, `blocker_code`, `next_action`, `resume_from`, `tdd_signature`, `requires_user_decision`, `blocked_clause_ids`, and `affected_phase_paths`.
- Require the TDD report to expose plan-review-readable rows for plan row/scenario to test mapping, manual smoke gates, and TDD blockers. These rows are what the planning docs UI uses to show whether a phase's plan clauses became verifiable contracts.
- If `plan-tdd` returns `blocker_type = plan_contract`, route the blocker to the next `plan-maker` pass before `plan-review`.
- If `plan-tdd` returns `blocker_type = external_setup`, stop with `tdd_gate_blocker` and report the missing setup or runner contract; do not hide it behind browser approval.
- If `plan-tdd` completes with `gate_status = failed` because newly written red contracts fail as expected before implementation, continue to Step 4. Red contracts are valid planning evidence when expected red reasons are recorded.
- Apply the wait policy and classify failures with `contracts.md`.

## Step 4. Run Cold Review

- Invoke a fresh `plan-review` reviewer only when an executable plan file exists and current `review.md` is missing or stale for that plan file.
- Do not reuse a prior reviewer agent by default.
- Pass exact `task-slug`, `plan_path`, `plan_wiki_root`, current `plan_signature`, current `tdd.md` path, and required output path `./plans/_orchestrator/review/{task-slug}/review.md`.
- Limit reviewer write scope to the required review artifact.
- Require `review.md` YAML frontmatter with at least `plan_path`, `task_slug`, `plan_signature`, `outcome`, `next_action`, `finding_signature`, `requires_user_decision`, `issue_codes`, and `affected_plan_paths`.
- After the reviewer finishes, reread `review.md` from disk.
- Apply the wait policy and classify failures with `contracts.md`.

## Step 5. Route Review Findings

- If fresh review outcome is `blocked`, send findings to the next `plan-maker` pass.
- If outcome is `ready-with-findings`, route to Step 6 with noted non-blocking findings.
- If outcome is `ready`, route to Step 6.
- If the same `finding_signature` repeats against the same `plan_signature` after one plan-maker revision attempt, stop and report `no_progress`.

## Step 6. Planning Docs Gate

- Follow `references/planning-docs.md` Step 5.
- Generate or refresh `./plans/{task-slug}/planning-docs/` for the current `plan_signature`.
- The package must expose `review_items[]` for Overview and every required Phase target. If the plan has implementation scope but does not provide reviewable Phase targets, route to `plan-maker` for plan revision instead of presenting a flattened review.
- Start or reuse the shared planning docs browser server through the documented launcher and report the printed `planning_docs_url` to the user.
- Stop with `planning_docs_gate_blocker` while waiting for the user to submit the planning docs and say `review complete`.
- When the user says `review complete`, read `feedback.json` and continue only if the submitted feedback matches the current `task_slug`, `plan_signature`, and review item signatures.

## Step 7. Triage Planning Docs Feedback

- Follow `references/planning-docs.md` Step 6.
- If every required review item is approved with current signature evidence and no active `needs-change` or `question` comment remains, continue to Step 8.
- If any required review item is not approved or any active non-approved comment remains, preserve or update `review-history.json`, classify the feedback, and route according to `references/planning-docs.md`.
- Feedback that changes plan meaning routes to `plan-maker`; after revision, rerun Step 3, Step 4, and Step 6 for the new `plan_signature`.
- Feedback that only needs an answer must be answered in chat, then the same-signature review package must require browser re-submit.

## Step 8. Capture Planning Docs Learning

- Follow `references/planning-docs-learning.md` after a submitted planning docs round has been preserved and either approved or triaged.
- Treat learning capture as non-blocking unless it corrupts authoritative planning docs artifacts.
- Run this step before resetting `feedback.json`, regenerating the package, changing `plan_signature`, or invoking the next role when feasible.

## Step 9. Completion

The orchestration is `planning_complete` only when all selected executable plan files have fresh `tdd.md` and `review.md` artifacts whose outcomes are acceptable for the current `plan_signature`, and each implementation-scope plan has explicit current planning docs approval.

For implementation-scope plans, `planning_complete` means the plan and TDD contract were approved together. The final report must explicitly state that implementation should follow the approved `plan.md` and `tdd.md`, including any manual smoke gates that cannot be automated.

Report:

- written or reviewed plan file paths
- TDD artifact path and gate status
- review artifact path
- final review outcome for each plan
- planning docs artifact path and approval state for each implementation-scope plan
- implementation readiness for each implementation-scope plan
- any remaining non-blocking findings
