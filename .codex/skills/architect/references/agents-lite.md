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
| `visual-comparator`  | `visual-compare`       | `visual-compare`    | pixel-level comparison for external image/URL references using agent-browser + pixelmatch; captures element screenshots, diff artifacts, and report-only evidence |
| `figma-parity-auditor` | `figma-parity`      | `figma-parity`      | Figma-native parity audit for Figma URL references using Figma MCP and agent-browser DOM introspection; reports structured token, component, structure, typography, spacing, and effect deltas |

## Planning Skills (run by architect)

- `plan-unit-test`: generates unit/logic test files as plan artifacts (`plans/{task}/tests/`)
- `plan-e2e-test`: generates frozen feature-level E2E plan artifacts with the runner chosen from the environment (`plans/{task}/e2e/`)

## Post-implementation Verification Agents

- `visual-comparator`: runs `visual-compare` after UI implementation when a plan must compare the current UI against an external image, screenshot set, or live URL reference and leave repo-local capture, diff, and report artifacts for a later fix phase
- `figma-parity-auditor`: runs `figma-parity` after UI implementation when a plan must compare the current UI against a Figma URL reference and leave repo-local parity report artifacts for a later fix phase

## Planning Handoff Roles

- `plan-review`: orchestration reviewer role normally executed through a generic sub-agent with the `plan-review` skill attached after `architect` writes a finished executable plan
- `plan-materialize`: orchestration materializer role normally executed through a generic sub-agent with the `plan-materialize` skill attached for source-tree test materialization before implementation begins

These planning roles are handoff utilities, not valid `owner_agent` values inside phase detail files.

## Catalog Rule

- Only list execution agents or skills that actually exist in this repository.
- Do not document hypothetical utility skills here.
- Do not use planning handoff roles such as `plan-review` or `plan-materialize` as phase `owner_agent` values.
- Architect should inspect the corresponding CLI help before finalizing implementation routing for `frontend-developer` or `backend-developer`.
- For `general-developer`, inspect the minimum repo-local validation or tooling contract instead of a nonexistent dedicated CLI.
- Follow the active review wiki execution-routing and test/review handoff core docs for when these agents may be assigned.
