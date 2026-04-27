---
name: architect
description: Codex entry skill for request-traceable implementation planning. Use when a request needs one or more executable plan artifacts under `./plans` after resolving blocking product policy, UX, contract, schema, validation, state, permission, and any upstream UI-direction ambiguity handled by `brainstorm` or `design-discovery`, with a top-level execution-contract `plan.md` written in Korean-first visible prose that keeps English for code/tool/schema identifiers only, keeps the user's request items visible, groups work by concrete boundaries, exposes public contracts before execution order, and links per-phase technical detail files for later `plan-review` and `plan-materialize`, plus registry-backed review wiki core/pattern guidance.
---

# Architect

Create decision-complete implementation plans as executable `./plans/**/plan.md` artifacts with linked phase detail files. Keep `SKILL.md` as the entrypoint and load detailed policy from references.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for purpose, inputs, output contract, execution modes, and Korean-first output requirements.
2. [references/workflow.md](references/workflow.md) for the Step 0 through Step 7 planning workflow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable planning constraints.
4. [references/terminology-policy.md](references/terminology-policy.md) before drafting visible plan or phase detail prose.
5. [references/plan-template-sequential.md](references/plan-template-sequential.md) and [references/phase-template-detail.md](references/phase-template-detail.md) before writing artifacts.

Read these references only when the corresponding scope is active:

- [references/visual-parity-contract.md](references/visual-parity-contract.md) when visual comparison acceptance is in scope.
- [references/git.md](references/git.md) when branch, commit, or worktree naming affects the plan.
- [references/agents-lite.md](references/agents-lite.md) before assigning `owner_agent`.

## Controller Rules

- Planning only: do not write implementation code or source-tree tests.
- Treat review wiki registry/core/pattern guidance as mandatory when the planning root is available.
- Resolve blocking ambiguity before writing plan artifacts; route unresolved product or UI direction to `brainstorm` or `design-discovery`.
- Write visible plan prose in Korean-first language; keep English for exact identifiers, paths, commands, schema keys, agent names, and canonical taxonomy IDs.
- Treat `plan.md` as the top-level execution contract shared by AI agents and the review pipeline, and push phase-local execution detail into linked phase detail files.
