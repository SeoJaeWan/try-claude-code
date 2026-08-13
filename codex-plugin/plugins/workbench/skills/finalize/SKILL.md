---
name: finalize
description: Validate the clean integrated result with failure, concurrency, and load checks, obtain an independent review, and produce the final maintenance report from complete inline workflow results or Local Work Memory Artifact references. Invoke only as `$workbench:finalize`.
---

# Finalize

Perform stages 9–11 on the final integration task's clean task-scoped worktree, never on unintegrated implementation branches.

Read [references/finalization-report.md](references/finalization-report.md) before testing or reviewing.

## Entry gate

- Require a complete ready Shape Report, complete ready Execution Plan, all required Task Results, `base_commit`, and `integrated_head_sha` for the same `run_id`, repository, plan revision, and Git common dir.
- Accept complete workflow results directly from the current context or user input. When the user supplies Local Work Memory Artifact references instead, use the Local Work Memory MCP to resolve their canonical content.
- Do not require any workflow result to have been persisted. A persistence result or Artifact reference is never a Finalize prerequisite.
- Require the current directory to be the final integration packet's recorded task-scoped worktree, on its exact branch and integrated head, with a clean status.
- Recheck that every required implementation and integration task completed successfully and belongs to the exact Execution Plan.
- If integration is incomplete, return `INTEGRATION_REQUIRED`; do not assemble fragments here.

## Stage 9: Failure, concurrency, and load validation

- Derive scenarios from the actual risk model, invariants, acceptance criteria, and changed surfaces.
- Test relevant timeouts, retries, partial failures, duplicate actions, race conditions, ordering, cancellation, resource exhaustion, or load. Do not perform meaningless synthetic load for a change with no such exposure.
- Protect real users and production systems. Use test fixtures, bounded local resources, and repository-approved environments.
- Record what ran, parameters, result, and limitations. Never imply an unrun test passed. A required or acceptance-critical unperformed check blocks `FINALIZED`.

## Stage 10: Independent review

- Use a separate reviewer agent or genuinely fresh context from the implementer.
- Give the reviewer the Shape criteria, Execution Plan, raw integrated diff, and test evidence. Do not prime it with the implementer's justification or conclusions.
- Ask it to inspect correctness, security, performance, concurrency, failure handling, maintainability, architecture consistency, and test coverage.
- Triage findings by severity and disposition. If code changes are required, return a new shaped or prepared task rather than patching implementation silently in Finalize.

## Stage 11: Documentation and report

- Produce a concise Markdown report using the reference schema.
- If Prepare set `documentation_policy: chat_only`, return the report in the conversation and do not create a repository file.
- If declared project documentation paths are in scope, update only validated repository-relative paths, run relevant checks, and create a finalization commit only when the plan explicitly authorizes it.
- Recheck the final branch, HEAD, diff, and clean status before returning success.

## Output and handoff

Return `FINALIZED`, `CHANGES_REQUIRED`, `INTEGRATION_REQUIRED`, or `BLOCKED`. Include the final report, remaining risks, final branch, `integrated_head_sha`, optional `final_head_sha`, and unperformed checks.

Do NOT merge/rebase into Local, push, publish, open a PR, hand off the task, delete task worktrees/branches, clean user changes, or invoke another Workbench skill automatically.

Do NOT automatically invoke another Workbench skill.
