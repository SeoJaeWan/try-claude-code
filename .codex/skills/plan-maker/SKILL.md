---
name: plan-maker
description: Codex entry skill for request-traceable implementation planning. Use when a request has already locked blocking product policy, UX, contract, schema, validation, state, permission, UI-direction, and required execution-agent boundaries, and Codex must produce one or more self-contained executable plan files under `./plans` following the active plan wiki plan artifact contract.
---

# Plan Maker

Create decision-complete implementation plans as self-contained executable plan files under `./plans`. Keep `SKILL.md` as the entrypoint and load detailed policy from references and the active plan wiki.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for purpose, inputs, output contract, execution modes, and Korean-first output requirements.
2. [references/workflow.md](references/workflow.md) for the full planning workflow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable planning constraints.
4. The active plan wiki generated index at [../../plan-wiki/source/wiki/generated/index.json](../../plan-wiki/source/wiki/generated/index.json) when present, to discover matching pattern documents from frontmatter and links.
5. [references/plan-template-sequential.md](references/plan-template-sequential.md) before writing new plan artifacts.

Read these references only when the corresponding scope is active:

- [references/visual-parity-contract.md](references/visual-parity-contract.md) when visual comparison acceptance is in scope.
- [references/git.md](references/git.md) when branch naming affects the plan header.
- [references/phase-template-detail.md](references/phase-template-detail.md) only when narrowly reviewing or migrating a legacy phase-detail plan.

## Controller Rules

- Planning only: do not write implementation code or source-tree tests.
- Treat plan wiki registry stage-core guidance as mandatory when the planning root is available; discover optional patterns from generated indexes, frontmatter, and markdown links rather than registry taxonomy.
- Resolve blocking ambiguity before writing plan artifacts; stop with a clear missing-decision packet when product scope, UI direction, or execution-agent boundary is not locked enough for planning.
- Write visible plan prose in Korean-first language; keep English for exact identifiers, paths, commands, schema keys, agent names, and user- or source-defined metadata values.
- Follow the active plan wiki plan artifact contract for self-contained plan files; do not duplicate that contract in chat or skill-local prose.
