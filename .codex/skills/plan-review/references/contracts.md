# Plan Review Contracts

## Purpose

Provide an independent, read-only review of an executable plan file and its current TDD report before execution. The review checks whether the plan can be executed without hidden decisions, whether it follows the active plan wiki plan artifact contract, and whether `tdd.md` faithfully turns selected plan clauses into tests, commands, blockers, or manual smoke gates without silent loss.

## Inputs to inspect

1. Latest user request and conversation context.
2. Target executable plan file under `./plans/**`.
3. Current `tdd.md` adjacent to the target plan when implementation scope applies.
4. Optional locked request, UI direction, or orchestrator handoff from the latest conversation.
5. Resolved planning plan wiki root:
   - orchestrated mode: use the provided `plan_wiki_root`.
   - direct mode: use `./.codex/plan-wiki/source/wiki`.
6. `registry.json`, stage core docs for `review`, and selected pattern files whose `적용 조건` match the reviewed plan.
7. Architect templates and local references only as needed to verify the plan contract.
8. Repo-local execution contracts only when the plan makes a concrete routing, command, validation, or placement claim.
9. Directly referenced local prerequisite plans only for one-hop prerequisite parity.
10. Controller-verified Figma inventory manifest and snapshot artifacts only when the plan depends on Figma inventory, classification, or plan-local `figma-contract` artifacts.

## Execution modes

- `orchestrated`: an orchestrator handoff provides `task_slug`, `plan_path`, and `plan_wiki_root`.
- `direct`: no orchestrator handoff exists; resolve the plan wiki root through the project-local source clone at `./.codex/plan-wiki/source/wiki`.

In orchestrated mode, treat provided `task_slug`, `plan_path`, `plan_wiki_root`, optional `plan_signature`, and optional `tdd_path` as authoritative. If they are missing or contradictory, block instead of inventing replacements.

## Output contract

Write exactly:

```text
./plans/_orchestrator/review/{task-slug}/review.md
```

The artifact must include YAML frontmatter, reviewed plan path, outcome, findings by severity, assumptions or unknowns, and an execution-readiness note. Use Korean-first prose for human-readable findings and keep schema keys, paths, commands, identifiers, and exact quoted text literal.
