---
name: finalize
description: Validate the clean integrated result with failure, concurrency, and load checks, obtain an independent review, and produce the final maintenance report. Invoke only as `$workbench:finalize`. Use when the user explicitly asks to "통합 결과를 최종 검증해", "독립 리뷰와 보고서를 만들어", or names this selector.
---

# Finalize

Perform stages 9–11 on the final integration task's clean task-scoped worktree, never on unintegrated implementation branches.

Read [references/finalization-report.md](references/finalization-report.md) before testing or reviewing.

## Entry gate

- Require a ready Shape Report, its persisted Shape Dev Wiki reference, a ready Execution Plan, its persisted Prepare Dev Wiki reference, all Task Results, `base_commit`, and `integrated_head_sha` for the same `run_id` and Git common dir.
- Require the current directory to be the final integration packet's recorded task-scoped worktree, on its exact branch and integrated head, with a clean status.
- Recheck that every required task and integration task completed successfully.
- If integration is incomplete, return `INTEGRATION_REQUIRED`; do not assemble fragments here.

## Stage 9: Failure, concurrency, and load validation

- Derive scenarios from the actual risk model, invariants, acceptance criteria, and changed surfaces.
- Test relevant timeouts, retries, partial failures, duplicate actions, race conditions, ordering, cancellation, resource exhaustion, or load. Do not perform meaningless synthetic load for a change with no such exposure.
- Protect real users and production systems. Use test fixtures, bounded local resources, and repository-approved environments.
- Record what ran, parameters, result, and limitations. Never imply an unrun test passed.

## Stage 10: Independent review

- Use a separate reviewer agent or genuinely fresh context from the implementer.
- Give the reviewer the Shape criteria, Execution Plan, raw integrated diff, and test evidence. Do not prime it with the implementer's justification or conclusions.
- Ask it to inspect correctness, security, performance, concurrency, failure handling, maintainability, architecture consistency, and test coverage.
- Triage findings by severity and disposition. If code changes are required, return a new task to Prepare/Execute rather than patching implementation silently in Finalize.

## Stage 11: Documentation and report

- Produce a concise Markdown report using the reference schema: summary, Shape and Prepare Wiki references, decisions, changes, verification, independent findings, limitations, task commits, integrated head, and handoff state.
- If Prepare set `documentation_policy: chat_only`, return the report in the conversation and do not create a gratuitous repository file.
- If declared project documentation paths are in scope, update only those paths, run relevant checks, and create the pre-authorized finalization commit. Distinguish `integrated_head_sha` from `final_head_sha`.
- Update an existing README or requested report.md only when Prepare declared that path; otherwise keep the Final Report in chat.
- Preserve clickable official sources from Shape and add sources for new decision-relevant claims discovered during execution.

## Output and handoff

Return `FINALIZED`, `CHANGES_REQUIRED`, `INTEGRATION_REQUIRED`, or `BLOCKED`. A successful validation includes the final report, remaining risks, final branch, `integrated_head_sha`, optional `final_head_sha`, and unperformed checks. An entry-gate failure uses the minimal blocked-result schema and marks unavailable fields explicitly.

Do NOT merge/rebase into Local, push, publish, open a PR, hand off the task, delete task worktrees/branches, clean user changes, or invoke another Workbench skill automatically. Report Local branch drift and let the user choose the delivery action.
Do NOT automatically invoke another Workbench skill.
