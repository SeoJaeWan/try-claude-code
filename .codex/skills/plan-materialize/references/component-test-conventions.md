# Component Test Conventions Reference

Use this when `plan-materialize` handles component rendering, props/callback behavior, form interaction, conditional UI, accessibility wiring, or same-screen UI synchronization that does not require a real browser journey.

## Scope rules

- Use Component Test after `unit` and before `E2E`.
- Prefer Component Test for UI behavior that can be closed in a rendered component or screen harness without route/session/browser persistence.
- Do not use Component Test for deterministic pure logic that a `unit` test can own more directly.
- Do not shrink a selected browser journey into Component Test when the plan locks cross-route behavior, auth/session transition, redirect chain, persisted browser state, real focus/pointer semantics, browser layout/timing, or release-critical flow.
- Materialize only selected plan clauses and affected owner tests.

## Runner rules

- Reuse the repository's existing component or rendered-harness convention.
- Typical owners include Testing Library with jsdom, Playwright Component Test, Storybook interaction tests, and existing component `*.test.*` / `*.spec.*` files.
- If multiple component runners exist, use the owner closest to the component or screen boundary named by the plan.
- If no Component Test setup exists and the plan does not lock a first-time runner, return a blocker instead of inventing setup.

## Authoring rules

- Write human-readable `describe`, `it`, `test`, and row names in Korean-first prose unless the repository has an established English-only test style.
- Keep English for component names, props, callbacks, test IDs, runner APIs, routes, and exact product copy.
- Name each test as a concrete behavior example: `{condition}에서 {user action 또는 prop/state change}하면 {observable result}가 나온다`.
- Use user-level interactions through the local test library when possible; call callbacks or handlers directly only when the plan's selected boundary is the callback contract itself.
- Assert the final rendered output, emitted callback, submitted payload, focus state, accessible state, or owner-managed DOM outcome named by the scenario.
- Prefer role/label/accessible state for user-recognizable controls when stable; use `data-testid`/`testID` when the plan locks it as the stable identifier or the local convention already uses it.
- Do not assert decorative CSS, exact layout, or volatile copy unless the plan makes that presentation a durable contract.

## Coverage expectations

- Cover props/callback handoff, form interaction, conditional rendering, error/empty/loading/success states, and same-screen state synchronization only when selected by the plan.
- For same-screen synchronization, drive the selected control and assert every selected recipient on that screen, such as preview, generated code, disabled state, visible error, or emitted payload.
- When the plan defines both allowed and forbidden output, assert the allowed output first and then assert the forbidden/no-op result.
- Reuse or update the existing component owner test when it already owns the boundary.
- Do not scatter one scenario across unit, Component Test, and E2E when one owner closes it at the right boundary.

## Prohibited

- Browser journey assertions for route/session/redirect/persistence in Component Test.
- Duplicate component specs when an existing owner can be updated.
- Snapshot-only coverage for behavior-changing clauses.
- Proxy wrapper markers as the only proof when the plan names a final rendered recipient.
