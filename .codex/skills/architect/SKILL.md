---
name: architect
description: Codex entry skill for request-traceable implementation planning. Use when a request needs one or more executable plan artifacts under `./plans` after blocking product policy, UX, contract, schema, validation, state, permission, and UI-direction ambiguity has been resolved into usable upstream decisions, following the active plan wiki plan artifact contract and linked per-phase technical detail files.
---

# Architect

Create decision-complete implementation plans as executable `./plans/**/plan.md` artifacts with linked phase detail files. Keep `SKILL.md` as the entrypoint and load detailed policy from references.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for purpose, inputs, output contract, execution modes, and Korean-first output requirements.
2. [references/workflow.md](references/workflow.md) for the full planning workflow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable planning constraints.
4. [../../plan-wiki/sync/current/core/common/용어-정책.md](../../plan-wiki/sync/current/core/common/용어-정책.md) before drafting visible plan or phase detail prose.
5. [references/plan-template-sequential.md](references/plan-template-sequential.md) and [references/phase-template-detail.md](references/phase-template-detail.md) before writing artifacts.

Read these references only when the corresponding scope is active:

- [references/visual-parity-contract.md](references/visual-parity-contract.md) when visual comparison acceptance is in scope.
- [references/git.md](references/git.md) when branch, commit, or worktree naming affects the plan.

## Controller Rules

- Planning only: do not write implementation code or source-tree tests.
- Treat plan wiki registry/core/pattern guidance as mandatory when the planning root is available.
- Resolve blocking ambiguity before writing plan artifacts; stop with a clear missing-decision packet when product scope or UI direction is not locked enough for planning.
- Write visible plan prose in Korean-first language; keep English for exact identifiers, paths, commands, schema keys, agent names, and canonical taxonomy IDs.
- Follow the active plan wiki plan artifact contract for the split between `plan.md` and linked phase detail files.
