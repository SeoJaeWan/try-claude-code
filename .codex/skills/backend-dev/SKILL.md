---
name: backend-dev
description: Implement backend application logic after scope is fixed. Use when a request involves APIs, DTOs, entities, repositories, services, authentication, authorization, validation, persistence, server-side business rules, or backend tests. Trigger for work in controllers, services, repositories, modules, database mappings, and related server code when the task belongs to backend-developer ownership.
---

<Skill_Guide>
<Purpose>
Implement backend behavior, persistence, and server contracts without guessing framework conventions.
</Purpose>

<Instructions>
# backend-dev

Use this skill for backend phases owned by `backend-developer`.

## Inputs to inspect

1. The active request and latest conversation context
2. `plans/{task-name}/plan.md` or the assigned track plan when a plan exists
3. `codemaps/backend.md` and `codemaps/database.md` when present
4. Existing related backend modules and contracts
5. Active `tcb` help for command discovery, scaffold shape, and validation rules

## Workflow

### Step 0. Confirm the boundary

- Own API handlers, services, repositories, DTOs, entities, auth, validation, and server-side business logic.
- Keep UI layout and frontend-only state out of this skill.
- Split mixed frontend-backend requests when file ownership or acceptance criteria diverge.

### Step 1. Read the implementation contract

- Read the assigned plan before editing when a plan exists.
- Treat planned unit tests and E2E artifacts as contracts.
- Read only the local backend context needed for the assigned change.

### Step 2. Resolve the active `tcb` contract

- Run `tcb --help` only when command discovery is needed.
- Then inspect only the relevant command-scoped help.
- Treat `tcb` output as the current source of truth for naming, package layout, scaffolding, and validation.
- Do not recreate framework conventions from memory.

### Step 3. Implement backend behavior

- Preserve existing framework and dependency injection patterns.
- Keep request validation, mapping, and persistence explicit.
- Implement proper error responses where relevant:
  - `400` invalid input or validation failure
  - `401` missing or invalid authentication
  - `403` insufficient permission
  - `404` missing resource
  - `409` duplicate or conflicting state
- Make the smallest defensible change and avoid unrelated schema churn.

### Step 4. Handle tests

- If the plan includes `tests/`, implement the planned test artifacts in the correct source-tree location.
- If the plan includes `e2e/`, treat those files as frozen feature contracts.
- Fix implementation when tests fail; do not relax planned expectations to force green.

### Step 5. Validate

- Run the relevant backend tests for the affected scope.
- Run `tcb validate-file` on every created or modified backend file.
- Fix reported violations and re-run validation until clean.

## Guardrails

- Do not skip `tcb` validation.
- Do not move backend rules into ad hoc scripts or frontend code.
- Do not rewrite frozen plan artifacts just to match implementation.
- Do not broaden schema or API changes beyond the accepted scope.

## Output contract

- Return changed files, executed validations, and any unresolved risks.
- Call out contract or migration impacts explicitly.
</Instructions>
</Skill_Guide>
