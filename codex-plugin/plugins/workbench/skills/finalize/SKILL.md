---
name: finalize
description: Validate a selected integrated Git change with risk-driven failure, concurrency, and load checks, obtain an independent review, and produce a final report. Invoke only as `$workbench:finalize`; use when the user asks to "통합 결과를 최종 검증해", "독립 리뷰해", or "최종 보고서를 만들어".
---

# Finalize

Evaluate one selected immutable Git change as a complete product change, independent of how it was planned or implemented.

Read [references/finalization-report.md](references/finalization-report.md) before testing or reviewing.

## Procedure

1. Require an exact `base_commit`, `head_sha`, repository identity, Git common dir, target worktree, and clean status. Accept optional requirements, acceptance criteria, decisions, test evidence, task results, and user-provided Artifact references as supporting evidence.
2. Verify the target worktree, branch, HEAD, ancestry, and complete `base_commit..head_sha` diff. Block on ambiguous or moving inputs.
3. Reconstruct missing product expectations from the user request, repository instructions, tests, and changed interfaces. Label material gaps and do not treat absent evidence as a pass.
4. Derive applicable failure, concurrency, lifecycle, consistency, and load scenarios from the actual risk model. Use bounded local or repository-approved environments and record unperformed checks.
5. Obtain an independent review from a separate reviewer agent or genuinely fresh context using requirements, the raw diff, and test evidence without the implementer's conclusions.
6. Triage findings by severity and disposition. Do not patch implementation silently during final review.
7. Produce the final report, optionally update only explicitly authorized documentation paths, and recheck branch, HEAD, diff, and clean status.
8. Return the result and stop.

Do NOT assemble unrelated branches, modify implementation code, merge or rebase into a user branch, push, publish, open a PR, hand off, delete worktrees or branches, clean user changes, or perform work outside this final review.
