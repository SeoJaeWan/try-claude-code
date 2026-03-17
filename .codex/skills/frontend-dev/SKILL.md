---
name: frontend-dev
description: Implement frontend logic after scope is fixed. Use when a request involves React, Next.js, Expo, hooks, state transitions, form logic, cache or query wiring, API integration, validation logic, or extracting business logic out of UI components. Trigger for work in app, hooks, contexts, stores, queries, and related frontend tests when visual structure is already defined or belongs to ui-publish.
---

<Skill_Guide>
<Purpose>
Implement frontend behavior and integration without owning visual layout decisions.
</Purpose>

<Instructions>
# frontend-dev

Use this skill for frontend logic phases owned by `frontend-developer`.

## Inputs to inspect

1. The active request and latest conversation context
2. `plans/{task-name}/plan.md` or the assigned track plan when a plan exists
3. `codemaps/frontend.md` when present
4. Relevant files already touched by the feature
5. Active `tcf` help for command discovery, scaffold shape, and validation rules

## Workflow

### Step 0. Confirm the boundary

- Keep UI layout, typography, spacing, and presentational component creation in `ui-publish`.
- Own hooks, state, event handling, API wiring, optimistic updates, validation logic, and business rules.
- If a request mixes logic and layout, split the work or defer the visual part.

### Step 1. Read the implementation contract

- Read the assigned plan before editing when a plan exists.
- Treat frozen plan test artifacts as contracts. Implement to satisfy them; do not rewrite them unless the user explicitly changes the contract.
- Read only the minimum local context needed to execute the assigned logic.

### Step 2. Resolve the active `tcf` contract

- Run `tcf --help` only when command discovery is needed.
- Then inspect only the relevant command-scoped help.
- Treat `tcf` output as the current source of truth for naming, file placement, scaffolding, and validation.
- Do not guess conventions from stale examples.

### Step 3. Implement logic

- Prefer extracting business logic from components into hooks or nearby logic modules.
- Keep data-fetching, mutations, cache invalidation, and validation close to the owning feature.
- Preserve existing project patterns for query libraries, stores, routing, and form state.
- Make the smallest defensible change and avoid unrelated visual churn.

### Step 4. Handle tests

- If the plan includes `tests/`, copy or implement the planned test artifacts in the correct source-tree location before running verification.
- If the plan includes `e2e/`, treat those files as frozen feature contracts.
- Fix implementation when tests fail; do not weaken planned expectations to force green.

### Step 5. Validate

- Run the relevant project tests for the affected frontend scope.
- Run `tcf validate-file` on every created or modified frontend file.
- Fix reported violations and re-run validation until clean.

## Guardrails

- Do not create new visual component systems when the task is logic-only.
- Do not add API calls, auth, or domain logic to presentational-only `ui-publish` output without an explicit handoff.
- Do not skip `tcf` validation.
- Do not change frozen plan artifacts just to match implementation.

## Output contract

- Return changed files, executed validations, and any unresolved risks.
- Call out when the request should be split with `ui-publish` before continuing.
</Instructions>
</Skill_Guide>
