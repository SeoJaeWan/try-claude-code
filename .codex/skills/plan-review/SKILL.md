---
name: plan-review
description: Artifact-only critical review skill for executable `./plans/**/plan.md` artifacts and linked phase detail files. Use when Codex needs an independent cold review before execution, checking active plan artifact contract compliance, Korean-first visible prose terminology, user-request traceability, blocking ambiguity, topology quality, owner routing, scenario-level technical input/output contracts, UI decision completeness when relevant, verification materialization readiness, and registry-selected review wiki guidance without rewriting the plan.
---

# Plan Review

Cold-review one executable plan and write the required review artifact. Keep `SKILL.md` as the entrypoint; load detailed policy from references and the active review wiki.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for purpose, inputs, output artifact, and mode contract.
2. [references/workflow.md](references/workflow.md) for review wiki routing, plan loading, finding classification, artifact writing, and response flow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable review constraints.
4. [references/review-policy.md](references/review-policy.md) for severity mapping, outcome states, and review artifact shape.
5. [../../review-wiki/sync/current/core/common/용어-정책.md](../../review-wiki/sync/current/core/common/용어-정책.md) before writing human-readable findings.

Read repo-local execution contracts only when the reviewed plan makes concrete routing, validation, comparison, or placement claims that depend on them.

## Controller Rules

- Review-write-only: do not edit plans, source code, tests, wiki files, or helper notes.
- Write exactly one artifact: `./plans/_orchestrator/review/{task-slug}/review.md`.
- Treat the resolved review wiki registry, stage core docs, and selected patterns as mandatory review input.
- Review the current plan files from disk; do not trust stale chat memory or prior review metadata.
- Report findings first, ordered by severity.
- Do not rewrite the plan inside the review skill.
