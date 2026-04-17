# E2E Conventions Reference

Use this when `plan-materialize` handles frontend user-visible boundaries.

## Scope rules

- Materialize only the selected surface or journey E2E owned by the plan
- Materialize cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or other full-flow coverage only when those journeys are explicitly selected by the plan
- E2E is the default only for frontend user-visible clauses explicitly selected by the plan
- Presentation-only changes may skip E2E only with an explicit skip reason
- Do not add plan-external user journeys, generic state sweeps, or extra regression paths

## Runner rules

- Reuse the existing project runner only
- Typical signals:
    - `playwright.config.*` for browser/web
    - `.maestro/` for React Native / Expo mobile
- If no E2E setup exists, stop immediately

## Update strategy

- Default: `modify-first, create-if-new-owner`
- Search order for existing surface ownership:
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

Only when one surface must be split across multiple specs, add a registry file next to the specs:

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

### Playwright

- Prefer `data-testid`
- Then role, label, placeholder, text as a last resort
- Use deterministic assertions only
- No hardcoded waits

### Maestro

- Prefer `testID` via `id:`
- Use visible text only when that text is the explicit product contract
- Keep flows short and deterministic

## Coverage expectations

- Cover only the interaction paths, validation/error paths, and boundary states explicitly selected by the plan or implied by its declared risk patterns
- When one spec can close multiple selected clauses on the same surface, prefer updating that owner spec instead of scattering coverage
- Do not promote manual QA ideas into E2E assertions unless the plan names them as contract

## Prohibited

- Plan-external cross-route regression journeys
- CSS/XPath selectors when stable test ids exist
- Duplicating an existing surface spec instead of updating it
- Using `plans/` as the source of truth for surface ownership
- Adding empty/loading/success/error variants just because they are common UI states when the plan did not select them
