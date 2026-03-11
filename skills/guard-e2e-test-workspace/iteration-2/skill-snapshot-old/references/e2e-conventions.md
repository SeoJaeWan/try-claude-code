# E2E Test Conventions Reference

Test authoring rules for guard-e2e-test. Shares the same Playwright-based rules as plan-e2e-test,
with additional rules specific to full-flow journey tests.

---

## Locator Strategy (priority order)

1. **`data-testid`** (preferred): `page.getByTestId('login-button')`
2. **Role-based**: `page.getByRole('button', { name: 'Login' })`
3. **Label-based**: `page.getByLabel('Email')`
4. **Placeholder-based**: `page.getByPlaceholder('Enter your email')`
5. **Text-based** (last resort): `page.getByText('Welcome')`

CSS selectors and XPath are prohibited — they break on styling changes.

---

## data-testid Strategy

- Reuse existing `data-testid` attributes discovered during exploration
- Use role-based locators when no testid exists on the element
- When new testids are needed, include a "testid additions required" list in the completion report
- kebab-case naming: `login-button`, `error-message`

---

## Assertions

Use Playwright's built-in auto-retry assertions:

```typescript
await expect(locator).toBeVisible();
await expect(locator).toHaveText('expected');
await expect(locator).toContainText('partial');
await expect(page).toHaveURL('/expected-path');
await expect(locator).toHaveCount(3);
await expect(locator).toBeEnabled();
await expect(locator).toHaveValue('input-value');
```

- `page.waitForTimeout()` prohibited — use auto-waiting
- `page.waitForURL()` — use for route transition verification (critical for guard tests)
- `page.waitForResponse()` — use for post-API-call verification

---

## Test Isolation

- Each test must be independently runnable
- Use `test.beforeEach` for shared setup (journey start point navigation, etc.)
- No shared variables or global state between tests
- Use `test.afterEach` for data cleanup when needed

---

## Guard-Specific Rules

### File Placement

```
{test-dir}/guard/{journey-domain}/{journey-scenario}.spec.ts
```

- Place under `guard/` subdirectory to clearly separate from plan-e2e-test artifacts
- Domain subdirectory follows existing project patterns

### Test Naming

```typescript
test.describe('[Guard] Signup → Dashboard → Logout journey', () => {
  test('[JOURNEY-AUTH-001] Full flow from signup to logout works', ...);
  test('[JOURNEY-AUTH-001] Unauthenticated access to protected route redirects to login', ...);
});
```

- `test.describe` prefixed with `[Guard]` + journey summary (include route chain)
- Individual `test` includes `journey_id`
- Korean descriptions for test intent

### Minimum Scenarios Per Journey

| Type                 | Description                                                    | Required |
|---|---|---|
| Happy flow           | Proves the entire journey passes end-to-end                    | Required |
| State persistence    | Proves auth/session/data survives route transitions            | Required |
| Branch flow          | Proves proper redirect/block on failure or unauthenticated access | Optional |

---

## Full-Flow Interaction Patterns

### Route Transition Chain
```typescript
// Core of journey tests: traverse multiple routes sequentially
await page.goto('/signup');
await page.getByTestId('signup-button').click();
await expect(page).toHaveURL('/dashboard');  // route transition assertion
```

### State Continuity Verification
```typescript
// Verify state persists after route transition
await page.goto('/dashboard');
await expect(page.getByTestId('user-menu')).toBeVisible();
await page.reload();  // does it survive a reload?
await expect(page).toHaveURL('/dashboard');
await expect(page.getByTestId('user-menu')).toBeVisible();
```

### Authentication Flow
```typescript
// Login → access protected page → logout → re-access blocked
await page.goto('/login');
// ... login steps ...
await expect(page).toHaveURL('/dashboard');

await page.getByTestId('logout-button').click();
await expect(page).toHaveURL('/login');

await page.goto('/dashboard');
await expect(page).toHaveURL('/login');  // unauthenticated redirect
```

### Multi-Step Form Flow
```typescript
// Step 1 → Step 2 → Step 3 → completion page
await page.goto('/onboarding/step-1');
// ... step 1 input ...
await page.getByTestId('next-button').click();
await expect(page).toHaveURL('/onboarding/step-2');
// ... step 2 input ...
await page.getByTestId('next-button').click();
await expect(page).toHaveURL('/onboarding/complete');
```

---

## Anti-patterns

- **`page.waitForTimeout()`** — use auto-waiting or explicit wait conditions
- **CSS selectors** — use `data-testid` or role-based locators
- **Inter-test dependencies** — each test runs independently
- **Implementation-coupled selectors** — no class names, component internals, or generated IDs
- **Flaky assertions** — no timing-dependent checks; use retry-able assertions
- **Single-screen tests** — per-screen/feature tests belong to plan-e2e-test
