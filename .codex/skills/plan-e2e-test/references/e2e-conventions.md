# E2E Test Conventions Reference

Inline reference for `plan-e2e-test`. Use this to turn plan constraints into executable Playwright browser-integration contracts for bounded feature surfaces.

---

## Playwright Best Practices

### Locator Strategy (priority order)

1. **`data-testid`** (preferred): `page.getByTestId('login-button')`
2. **Role-based**: `page.getByRole('button', { name: '로그인' })`
3. **Label-based**: `page.getByLabel('이메일')`
4. **Placeholder-based**: `page.getByPlaceholder('이메일을 입력하세요')`
5. **Text-based** (last resort): `page.getByText('환영합니다')`

Avoid CSS selectors and XPath. They are brittle and break on styling changes.

### data-testid Strategy

- Apply `data-testid` to all interactive elements (buttons, inputs, links, toggles)
- Apply `data-testid` to key display elements referenced in assertions (messages, status indicators, counters)
- Use kebab-case naming: `login-button`, `email-input`, `error-message`
- Use hierarchical naming for nested contexts: `modal-confirm-button`, `sidebar-nav-link`
- Document all `data-testid` values in `manifest.md` as a contract for implementation

### Assertions

- Use Playwright's built-in expect assertions with auto-retry:
  - `await expect(locator).toBeVisible()`
  - `await expect(locator).toHaveText('expected')`
  - `await expect(locator).toContainText('partial')`
  - `await expect(page).toHaveURL('/expected-path')`
  - `await expect(locator).toHaveCount(3)`
  - `await expect(locator).toBeEnabled()` / `toBeDisabled()`
  - `await expect(locator).toHaveValue('input-value')`
- Do not use `page.waitForTimeout()` - rely on auto-waiting
- Use `page.waitForURL()` for navigation assertions
- Use `page.waitForResponse()` when asserting after API calls

### Test Isolation

- Each test must be independently runnable
- Use `test.beforeEach` for shared setup (e.g., navigation to page)
- Do not share state between tests via variables or global state
- Use Playwright fixtures for reusable test setup
- Clean up test data in `test.afterEach` when needed

---

## Test File Structure

### File Naming Convention

- Group by domain/feature: `e2e/{domain}/{feature}.spec.ts`
- Use descriptive names: `login.spec.ts`, `create-post.spec.ts`, `settings-profile.spec.ts`
- One file per major user flow or page

### Test Block Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('{페이지/기능명}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/target-page');
  });

  test('[C-XXX-001] {Korean spec description for happy path}', async ({ page }) => {
    // Arrange - set up preconditions if needed

    // Act - perform user interactions
    await page.getByTestId('action-element').click();

    // Assert - verify expected outcome
    await expect(page.getByTestId('result-element')).toBeVisible();
  });

  test('[C-XXX-001] {Korean spec description for error path}', async ({ page }) => {
    // Arrange

    // Act
    await page.getByTestId('submit-button').click();

    // Assert
    await expect(page.getByTestId('error-message')).toBeVisible();
  });
});
```

### Page Object Pattern

Use page objects when a page has 3+ interactions to reduce duplication:

```typescript
// pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

---

## Deterministic Test Authoring (Without Live Browser)

Since tests are authored at planning time without running a live browser:

1. **Require resolved browser contracts first**: `plan.md` must explicitly define route, user state, action, visible outcome, and locator/testability contracts before E2E authoring starts
2. **Derive locators from resolved contracts**: Use the planned UI structure and `data-testid` names
3. **Derive URLs from resolved routes**: Use the route definitions in `plan.md`
4. **Derive expected text from resolved outcomes**: Use the planned labels, messages, and content
5. **Assume standard Playwright behavior**: Auto-waiting, built-in assertions, navigation events
6. **Do not document missing contracts as assumptions**: If a locator, route, state, action, or visible result is not finalized, stop and return a blocking issue instead of generating tests
7. **Do not author cross-route journeys here**: Redirect chains, session persistence, and post-implementation regression journeys belong to `playwright-guard`

The `data-testid Registry` in `manifest.md` becomes the binding contract: implementation must apply these attributes exactly as specified.

---

## Common Interaction Patterns

### Form Submission

```typescript
await page.getByTestId('name-input').fill('value');
await page.getByTestId('submit-button').click();
await expect(page.getByTestId('success-message')).toBeVisible();
```

### Navigation

```typescript
await page.getByTestId('nav-link').click();
await expect(page).toHaveURL('/target');
```

### Modal/Dialog

```typescript
await page.getByTestId('open-modal-button').click();
await expect(page.getByTestId('modal')).toBeVisible();
await page.getByTestId('modal-confirm-button').click();
await expect(page.getByTestId('modal')).not.toBeVisible();
```

### List/Table

```typescript
await expect(page.getByTestId('list-item')).toHaveCount(3);
await page.getByTestId('list-item').first().click();
```

### Loading State

```typescript
await page.getByTestId('submit-button').click();
await expect(page.getByTestId('loading-spinner')).toBeVisible();
await expect(page.getByTestId('result')).toBeVisible();
```

---

## Anti-patterns to Avoid

- **No `page.waitForTimeout()`**: Use auto-waiting or explicit wait conditions
- **No CSS selectors**: Use `data-testid` or role-based locators
- **No test interdependence**: Each test runs independently
- **No implementation-coupled selectors**: Do not use class names, component internals, or generated IDs
- **No flaky assertions**: Avoid timing-sensitive checks; use Playwright's retry-able assertions
- **No test modification after freeze**: If E2E fails, fix implementation, not tests
