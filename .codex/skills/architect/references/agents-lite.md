# Execution Agents Catalog (Architect)

Minimal routing source for planning.
Use this file as the canonical `owner_agent` catalog.
For detailed planning rules, quality gates, and UI test-phase policy, read the resolved `review_wiki_root` registry and listed core docs. Use `./.codex/review-wiki/sync/current` as the planning root.

## Canonical Execution Agents

| owner_agent          | Related skill examples | CLI contract source | Role                                                      |
| -------------------- | ---------------------- | ------------------- | --------------------------------------------------------- |
| `frontend-developer` | `frontend-dev`         | `frontend`          | frontend UI, integration, hooks, state, and API work      |
| `backend-developer`  | `backend-dev`          | `backend`           | API, DB, auth, server logic                               |
| `general-developer`  | `general-dev`          | `N/A`               | infrastructure, DevOps, CI/CD, deploy, and root tooling   |
| `visual-comparator`  | `visual-compare`       | `N/A`               | reference-based visual comparison, diff artifact capture, and mismatch reporting |

## Planning Skills (run by architect)

- `plan-unit-test`: generates unit/logic test files as plan artifacts (`plans/{task}/tests/`)
- `plan-e2e-test`: generates frozen feature-level E2E plan artifacts with the runner chosen from the environment (`plans/{task}/e2e/`)

## Post-implementation Verification Agents

- `visual-comparator`: runs `visual-compare` after UI implementation when a plan must compare the current UI against an external visual reference and leave repo-local capture, diff, and report artifacts for a later fix phase

## Named Planning Agents

- `plan-reviewer`: named custom agent that wraps the `plan-review` skill for cold review handoff after `architect` writes a finished executable plan
- `plan-materializer`: named custom agent that wraps the `plan-materialize` skill for source-tree test materialization before implementation begins

These planning agents are handoff utilities, not valid `owner_agent` values inside phase detail files.

## Catalog Rule

- Only list execution agents or skills that actually exist in this repository.
- Do not document hypothetical utility skills here.
- Do not use named planning agents such as `plan-reviewer` or `plan-materializer` as phase `owner_agent` values.
- Architect should inspect the corresponding CLI help before finalizing implementation routing for `frontend-developer` or `backend-developer`.
- For `general-developer`, inspect the minimum repo-local validation or tooling contract instead of a nonexistent dedicated CLI.
- Use `visual-comparator` only for compare/report phases that produce repo-local evidence artifacts; any product-code fix belongs in a later `frontend-developer` phase.
