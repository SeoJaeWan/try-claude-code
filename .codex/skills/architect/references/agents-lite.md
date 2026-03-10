# Execution Agents Catalog (Architect)

Minimal routing source for planning.
Use this file instead of the legacy centralized agents reference set.

## Canonical Execution Agents

| owner_agent          | Primary skill examples | Role                                                    |
| -------------------- | ---------------------- | ------------------------------------------------------- |
| `frontend-developer` | `frontend-dev`         | frontend logic, integration, hooks, state               |
| `backend-developer`  | `backend-dev`          | API, DB, auth, server logic                             |
| `publisher`          | `ui-publish`           | UI layout and visual structure only (no business logic) |

## Utility Skills (run by owner agent)

- `coding-conventions`: boilerplate generation
- `bug-report`: bug recording on failure
- `activity-log`: task completion logging

## Planning Skills (run by architect)

- `plan-unit-test`: generates unit/logic test files as plan artifacts (`plans/{task}/tests/`)
- `plan-e2e-test`: generates frozen Playwright E2E `.spec.ts` files as plan artifacts (`plans/{task}/e2e/`)

## Planning Rules

1. Every executable block (`Phase n`, `Tn`) must include `owner_agent`.
2. `owner_agent` must map to `./.claude/agents/{owner_agent}.md`.
3. Keep each block owned by exactly one execution agent.
4. When needed, include `primary_skill` in the block to pin a specific skill executed by that agent.
5. Utility skills are bundled in the agent definition — do not dispatch them as standalone phases.
6. Default planning should use only the canonical execution agents above.
7. If user requests direct execution for a small focused task, planning can be skipped.
8. Every executable plan file must include `Branch` header.
9. `planner-lite` skill runs in the main conversation and enforces `Agent(... isolation: "worktree")` on phase dispatch. Merge source branch into `Branch` from plan files (`--no-ff`).
10. For parallel runs, start one `planner-lite` skill session per `plan-{track}.md`.
11. For UI/user-flow scope, `plan-e2e-test` artifacts must be generated during planning (frozen E2E contracts).
