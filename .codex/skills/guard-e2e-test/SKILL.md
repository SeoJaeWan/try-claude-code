---
name: guard-e2e-test
description: Add post-implementation full-flow Playwright regression guards for cross-route user journeys. Use after frontend or backend implementation is in place and you need live browser exploration plus real `.spec.ts` coverage for auth flows, route transitions, session persistence, or end-to-end regressions that span multiple pages.
---

<Skill_Guide>
<Purpose>
Generate real Playwright regression guards for implemented multi-route user journeys.
Complement `plan-e2e-test`, which freezes bounded feature-level artifacts during planning.
</Purpose>

<Instructions>
# guard-e2e-test

Use this skill only after implementation exists and the target journey can be explored in a running app.

## Inputs to inspect

1. Journey context from the user, plan, bug report, or validation failure
2. `./.codex/skills/guard-e2e-test/references/e2e-conventions.md`
3. `./.codex/skills/guard-e2e-test/references/browser-exploration.md`
4. Local Playwright configuration and existing source-tree tests:
   - `playwright.config.*`
   - existing `*.spec.ts`
   - existing `tests/`, `e2e/`, or repo-specific Playwright layout
5. Relevant plan artifacts when present:
   - `./plans/{task-name}/e2e/manifest.md`
   - `./plans/{task-name}/plan-{track}/e2e/manifest.md`

## Role boundary

- `plan-e2e-test` creates frozen planning artifacts for bounded features or screens.
- `guard-e2e-test` creates living source-tree Playwright tests for cross-route regression defense after implementation.
- Use this skill for journeys such as signup to dashboard, login to checkout to completion, protected-route redirect behavior, or persistence across reloads and route changes.

## Workflow

### Step 0. Confirm the execution surface

- Require a browser/web surface with Playwright available in the repo.
- Require a runnable app or a credible local run path for the journey under test.
- If the task is still planning-only or the UI contract is unresolved, stop and route back to `plan-e2e-test` or `architect`.

### Step 1. Analyze the journey

- Parse the route chain, entry state, critical transitions, and expected end state.
- Identify state checkpoints:
  - auth/session persistence
  - URL transitions
  - visible success/error outcomes
  - teardown state after logout, cancellation, or completion
- Derive the minimum regression scenarios:
  - happy flow
  - persistence or teardown check
  - failure, redirect, or access-control branch when it is product-relevant

### Step 2. Detect repo conventions

- Read `playwright.config.*`.
- Inspect nearby `*.spec.ts` files for naming, directory placement, fixtures, helpers, and Page Object usage.
- Follow existing repo conventions first.
- If the repo has no clear guard layout, prefer a `guard/` subtree under the existing Playwright root instead of touching unrelated test areas.

### Step 3. Explore the implemented flow live

- Prefer Playwright MCP browser tooling when it is available in the session.
- If browser MCP is unavailable, fall back to the repo's browser automation surface or `npx agent-browser`.
- Use live exploration to collect:
  - stable locators
  - actual route changes
  - state continuity evidence
  - visible verification points
- Do not author full-flow tests speculatively without live exploration.

### Step 4. Write the real Playwright guard

- Create or update the source-tree `.spec.ts` file in the detected Playwright test root.
- Use Korean `test.describe` and `test` descriptions when the repo has no stronger convention.
- Prefix guard suites with `[Guard]`.
- Include journey identifiers in test names when available.
- Prefer `data-testid` locators, then role, label, placeholder, and finally visible text.
- Use Page Objects only when the journey gets materially clearer from them.
- Keep the file scoped to the journey under guard. Do not refactor broad unrelated test infrastructure unless required.

### Step 5. Validate

- Run the narrowest credible Playwright command for the generated file first.
- If failures come from stale assumptions, re-explore and adjust the test.
- If failures expose a real app regression, report it clearly and do not hide it by weakening assertions.

### Step 6. Report

- Report the generated test path, validation command, result, covered journey, and any remaining blockers.
- If the test required missing `data-testid` hooks, include a concise list of required additions.

## Output contract

- Source-tree Playwright `.spec.ts` file in the repo's real E2E test area
- No planning artifacts under `plans/`
- Clear note of:
  - journey covered
  - scenarios added
  - validation command run
  - unresolved issues

## Guardrails

- Do not modify frozen `plans/**/e2e/*` artifacts.
- Do not write single-screen feature tests that belong to `plan-e2e-test`.
- Do not use `page.waitForTimeout()` unless the repo already mandates a justified exception.
- Do not prefer CSS or XPath selectors when a stronger locator exists.
- Do not rewrite unrelated existing tests just to fit the new file.
- Do not mask real product failures by replacing assertions with weaker ones.

</Instructions>
</Skill_Guide>
