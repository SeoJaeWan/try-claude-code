---
name: plan-e2e-test
description: Codex skill for generating contract-first Playwright E2E test code as plan artifacts. Called by architect after plan.md creation for UI/user-flow scope.
---

<Skill_Guide>
<Purpose>
Generate deterministic Playwright E2E test files (.spec.ts) as plan artifacts during the planning phase. These tests define frozen user-flow contracts that implementation must satisfy. No live browser exploration is required.
</Purpose>

<Instructions>
# plan-e2e-test

Generate Playwright `.spec.ts` files mapped to `plan.md` constraint IDs. These tests become frozen plan artifacts that define the E2E behavioral contract. Implementation must pass these tests; tests are not modified to match implementation.

**Strict AI TDD**: E2E test code is frozen at planning time. If tests fail, fix the implementation, NOT the tests.

---

## Inputs to inspect

1. `./plans/{task-name}/plan.md` - constraint IDs (`[C-...]`), user flows, and UI scope
2. `./.codex/skills/plan-e2e-test/references/e2e-conventions.md` - E2E test writing rules
3. `./.codex/skills/plan-e2e-test/references/constraint-coverage.md` - E2E coverage rules
4. Local Playwright config and existing E2E tests - use this to detect conventions before generating files

---

## Workflow

### Step 0. Detect Playwright conventions

- Inspect the repository for existing Playwright configuration (`playwright.config.ts`, `playwright.config.js`)
- Check for existing E2E test files (`*.spec.ts`, `e2e/` directory)
- Mirror the project's current Playwright version, base URL patterns, and test conventions
- If no Playwright setup exists, generate tests assuming standard Playwright defaults
- Identify existing page objects, fixtures, or helper utilities to reuse

### Step 1. Extract E2E targets from `plan.md`

- Parse all constraint IDs (`[C-...]`) from `plan.md` that involve user-facing behavior
- Identify testable user flows: page navigation, form submission, CRUD operations, authentication flows, error displays, loading states, responsive behavior
- Map each flow to the constraints it verifies
- Skip constraints that are purely internal logic (covered by `plan-unit-test`)

### Step 2. Read reference documents

- Read `./references/e2e-conventions.md` (E2E writing rules)
- Read `./references/constraint-coverage.md` (E2E coverage rules)

### Step 3. Design test scenarios per user flow

For each user flow, derive the E2E scenarios:

- **Happy path**: complete user journey succeeds end-to-end
- **Validation/error path**: user sees appropriate error feedback for invalid input or failed operations
- **Edge case path**: empty states, boundary inputs, concurrent actions visible to user
- **Navigation path**: correct routing, redirects, back/forward behavior

Rules:

- Focus on what the user sees and interacts with, not internal state
- Each scenario must trace back to at least one constraint ID
- Use deterministic assertions (no flaky timing-dependent checks)
- Design tests that can run without live browser exploration at authoring time

### Step 4. Generate `.spec.ts` files

For each testable flow, generate a Playwright test file following these rules:

- **Korean spec descriptions** in `test.describe` / `test` blocks
- **Constraint ID** in the test name: `test('[C-UI-001] ...', ...)`
- **data-testid locators** preferred over CSS selectors or text content
- **Page Object pattern** when a page has 3+ interactions
- **Test isolation**: each test starts from a clean state
- **Deterministic assertions**: use `expect(locator).toBeVisible()`, `toHaveText()`, `toHaveURL()` etc.
- **No hardcoded waits**: use Playwright auto-waiting, `waitForURL()`, `waitForResponse()` when needed
- **AAA-style structure** with clear arrange/act/assert sections

Example structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('로그인 페이지', () => {
  test('[C-AUTH-001] 유효한 자격 증명으로 로그인하면 대시보드로 이동한다', async ({ page }) => {
    // Arrange
    await page.goto('/login');

    // Act
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('password-input').fill('Password123!');
    await page.getByTestId('login-button').click();

    // Assert
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('welcome-message')).toBeVisible();
  });

  test('[C-AUTH-001] 잘못된 비밀번호로 로그인하면 오류 메시지를 표시한다', async ({ page }) => {
    // Arrange
    await page.goto('/login');

    // Act
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('password-input').fill('wrong');
    await page.getByTestId('login-button').click();

    // Assert
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('비밀번호');
  });
});
```

### Step 5. Save test files as plan artifacts

Save generated E2E tests to `./plans/{task-name}/e2e/` with logical grouping:

```text
plans/{task-name}/e2e/
|- manifest.md
|- auth/login.spec.ts
|- auth/signup.spec.ts
|- dashboard/overview.spec.ts
`- settings/profile.spec.ts
```

The path structure groups tests by domain/feature. These files are the final `.spec.ts` code to be placed in the project's E2E test directory during implementation.

### Step 6. Write `manifest.md`

Create `e2e/manifest.md` with:

```markdown
# E2E Test Manifest

## Files

| Test File | Target Flow | Constraints | Scenario Types |
|-----------|-------------|-------------|----------------|
| `auth/login.spec.ts` | Login flow | [C-AUTH-001], [C-AUTH-002] | happy, validation, navigation |
| ... | ... | ... | ... |

## data-testid Registry

| data-testid | Element | Page/Component |
|-------------|---------|----------------|
| `email-input` | Email input field | Login page |
| `login-button` | Submit button | Login page |
| ... | ... | ... |

## Coverage

- Total UI-facing constraints: N
- Constraints with happy-path coverage: N
- Constraints with error/validation coverage: N
- Coverage: 100%
```

The `data-testid Registry` serves as a contract between E2E tests and implementation. Implementation must apply these exact `data-testid` attributes.

### Step 7. Verify constraint coverage

- Every UI-facing constraint ID in `plan.md` must map to >= 1 E2E test
- Every constraint must include at least a happy-path scenario
- Validation/error scenarios must exist for constraints involving user input
- If coverage < 100%, add missing tests before completing
- Do not mark complete until coverage is 100%

---

## Output contract

- `./plans/{task-name}/e2e/manifest.md`
- `./plans/{task-name}/e2e/{domain}/{scenario}.spec.ts`
- Output language: Korean (test specs)

## Guardrails

- **Test files only**: Do not write implementation or production code
- **No unit tests**: Unit/logic tests are handled by `plan-unit-test` skill
- **Plan artifacts only**: Tests are stored in `plans/`, not in the source tree
- **Frozen at planning time**: E2E tests are behavioral contracts; implementation must satisfy them
- **No live browser required**: Tests are authored deterministically from plan constraints
- **Constraint coverage 100%**: Mandatory for all UI-facing constraints before completion
- **data-testid preferred**: Use `data-testid` attributes as the primary locator strategy
- **Test isolation**: Each test must be independently runnable with no shared state
</Instructions>
</Skill_Guide>
