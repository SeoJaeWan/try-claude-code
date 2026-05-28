---
name: plan-review
description: Artifact-only critical review skill for self-contained executable plan files under `./plans/**`. Use when Codex needs an independent cold review before execution, checking active plan wiki contract compliance, YAML plan header validity, plan self-containment, Korean-first visible prose terminology, user-request traceability, blocking ambiguity, owner routing, scenario-level contracts, UI decision completeness when relevant, and plan/TDD verification readiness without rewriting the plan.
---

# Plan Review

Cold-review one executable plan file and its current `tdd.md` when present, then write the required review artifact. Keep `SKILL.md` as the entrypoint; load detailed policy from references and the active plan wiki.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for purpose, inputs, output artifact, and mode contract.
2. [references/workflow.md](references/workflow.md) for plan wiki routing, plan loading, finding classification, artifact writing, and response flow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable review constraints.
4. [references/review-policy.md](references/review-policy.md) for severity mapping, outcome states, and review artifact shape.
5. [../../plan-wiki/source/wiki/core/common/용어-정책.md](../../plan-wiki/source/wiki/core/common/용어-정책.md) before writing human-readable findings.

Read repo-local execution contracts only when the reviewed plan makes concrete routing, validation, comparison, or placement claims that depend on them.

## Controller Rules

- Review-write-only: do not edit plans, source code, tests, wiki files, or helper notes.
- Write exactly one artifact: `./plans/_orchestrator/review/{task-slug}/review.md`.
- Treat the resolved plan wiki registry, stage core docs, and selected patterns as mandatory review input.
- Review the current plan file and current `tdd.md` from disk; do not trust stale chat memory or prior review metadata.
- Report findings first, ordered by severity.
- Do not rewrite the plan inside the review skill.
