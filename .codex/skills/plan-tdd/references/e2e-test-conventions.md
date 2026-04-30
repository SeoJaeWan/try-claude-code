# E2E Conventions Reference

Use this when `plan-tdd` handles selected frontend browser journeys.

## Scope rules

- Author only the selected UI area (`surface_id`) or journey E2E owned by the plan
- Author cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or other full-flow coverage only when those journeys are explicitly selected by the plan
- E2E is not the default for every frontend user-visible clause. Use E2E only when the plan locks a browser-owned reason under the active plan wiki decision policy.
- Presentation-only changes skip E2E unless the plan explicitly makes browser-rendered presentation the durable acceptance gate
- Do not add plan-external user journeys, generic state sweeps, or extra regression paths

## Runner rules

- Reuse the existing project runner unless the selected plan explicitly locks a first-time E2E runner, command, spec root, and browser/mobile bootstrap contract
- Typical signals:
    - `playwright.config.*` for browser/web
    - `.maestro/` for React Native / Expo mobile
- If no E2E setup exists and the plan does not lock the first-time E2E runner, command, spec root, and bootstrap contract, stop immediately
- If the plan locks first-time Playwright or mobile E2E topology, create the red contract spec in the planned source-tree location and report the missing harness or app route as the expected red reason

## Update strategy

- Default: `modify-first, create-if-new-owner`
- Search order for existing UI-area ownership:
    1. `@journey_id`
    2. `@surface_id`
    3. `@route`
    4. file name, locator contract, nearby page object usage
- Split only when the existing spec becomes materially too large or divergent
- Allow `skip` only when the existing source-tree spec already closes the exact selected user-visible clause
- If the selected clause has no stable owner and local conventions do not expose a stable place to create one, return a blocker instead of inventing a speculative spec

## Metadata comment

Add one of these headers to every E2E spec:

```ts
/**
 * @surface_id profile-edit
 * @route /profile
 * @test_kind e2e-surface
 */
```

The metadata comment is the default durable lookup key.

```ts
/**
 * @journey_id auth-signup-dashboard
 * @route /signup -> /dashboard
 * @test_kind e2e-journey
 */
```

## Split registry

Only when one UI area must be split across multiple specs, add a registry file next to the specs:

```json
{
  "surface_id": "profile-edit",
  "route": "/profile",
  "files": [
    "profile-edit-form.spec.ts",
    "profile-edit-avatar.spec.ts"
  ]
}
```

Registry is an exception path, not the default.

## Authoring rules

- Apply `references/test-authoring-conventions.md` for common naming, language, assertion, and ownership rules
- Keep English for E2E metadata keys, test IDs, routes, file names, selectors, runner APIs, and exact product copy
- Use `test.describe` for the journey or UI area only; keep the condition/action/result in each `test` or table row case name

### Playwright

- Follow the identifier policy locked by the plan.
- Prefer role, label, placeholder, or other user-facing locators when they are stable and express the behavior contract.
- Use `data-testid` when the plan locks it as the stable selector, the UI copy is volatile, or the existing local convention already uses test IDs for that area.
- Avoid CSS/XPath selectors when stable user-facing locators or test IDs exist.
- Keep tests independent; do not rely on another test's login, created data, cookies, localStorage, or sessionStorage.
- Use `storageState`, fixtures, API seed, or mock server state only when the plan locks the state contract and what it proves.
- Use Playwright web-first assertions such as `expect(locator).toBeVisible()` and `expect(page).toHaveURL()` instead of immediate boolean checks for async UI behavior.
- Use deterministic assertions only.
- Do not use `waitForTimeout`; wait through locators, navigation, events, or web-first assertions.
- Make test data parallel-safe when the scenario writes data; use plan-locked unique identifiers or setup/cleanup policy.

### Maestro

- Prefer `testID` via `id:`
- Use visible text only when that text is the explicit product contract
- Keep flows short and deterministic

## Coverage expectations

- Cover only the interaction paths, validation/error paths, and boundary states explicitly selected by the plan or implied by its declared risk patterns
- When one spec can close multiple selected clauses on the same UI area, prefer updating that owner spec instead of scattering coverage
- Do not promote manual QA ideas into E2E assertions unless the plan names them as contract
- Do not move component-local rendering, props/callback, form interaction, or same-screen state checks into E2E when `unit` or `Component Test` can close the selected contract.
- For synchronization clauses, assert the positive user-visible update first, then assert stale/forbidden output is absent when the plan requires it
- Do not duplicate volatile registry contents such as exact counts or full item lists in E2E unless that full list is the selected user-visible contract; prefer representative required entries plus separate behavior tests for lookup/selection rules
- When the full registry or inventory is the selected contract, keep the inventory completeness assertion separate from behavior examples, and still give each behavior row a readable `caseName`

## Prohibited

- Plan-external cross-route regression journeys
- CSS/XPath selectors when stable test ids exist
- Duplicating an existing UI-area spec instead of updating it
- Using `plans/` as the source of truth for UI-area ownership
- Adding empty/loading/success/error variants just because they are common UI states when the plan did not select them
