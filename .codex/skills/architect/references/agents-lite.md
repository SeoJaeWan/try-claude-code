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

## E2E Testing (separate Playwright agents)

- `playwright-test-planner`: E2E test plan creation
- `playwright-test-generator`: E2E test code generation
- `playwright-test-healer`: E2E test auto-repair

## E2E Routing Rules

- For UI/user-flow changes, include explicit phases for:
  - `playwright-test-planner` -> `playwright-test-generator`
- Use `playwright-test-healer` only as a conditional failure path (not default).
- Keep E2E phases separated from UI implementation phases for traceability.

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
11. For UI/user-flow scope, E2E phases must be explicitly represented in plan order.
