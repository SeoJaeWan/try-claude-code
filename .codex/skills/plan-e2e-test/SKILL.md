---
name: plan-e2e-test
description: Codex skill for generating contract-first feature-level browser integration Playwright test code as plan artifacts, but only after frontend browser contracts are fully resolved in plan.md. Called by architect after plan.md creation for UI feature/screen scope.
---

<Skill_Guide>
<Purpose>
Generate deterministic Playwright browser integration test files (`.spec.ts`) as plan artifacts during the planning phase. These tests define frozen feature/screen contracts that implementation must satisfy. No live browser exploration is required. Full-flow journey and regression guard tests are handled later by `playwright-guard`, not by this skill.
</Purpose>

<Instructions>
# plan-e2e-test

Generate Playwright `.spec.ts` files mapped to `plan.md` constraint IDs. These tests become frozen plan artifacts that define the browser-integration contract for a bounded feature surface. Implementation must pass these tests; tests are not modified to match implementation.

**Strict AI TDD**: Browser integration test code is frozen at planning time. If tests fail, fix the implementation, NOT the tests.

**Precondition**: Do not generate any E2E test code unless `plan.md` already resolves all frontend browser contracts:

- `route contract`
- `user state contract`
- `action contract`
- `visible outcome contract`
- `locator/testability contract`

---

## Inputs to inspect

1. `./plans/{task-name}/plan.md` - constraint IDs (`[C-...]`), feature-level user interactions, and UI scope
2. `./.codex/skills/plan-e2e-test/references/e2e-conventions.md` - E2E test writing rules
3. `./.codex/skills/plan-e2e-test/references/constraint-coverage.md` - E2E coverage rules
4. Local Playwright config and existing E2E tests - use this to detect conventions before generating files

---

## Workflow

### Step 0. Verify browser contracts first

Read `plan.md` and confirm all five frontend browser contracts are explicitly resolved.

Rules:

- If any contract is missing, ambiguous, or deferred, stop immediately.
- Do not infer missing browser contracts from guesswork.
- Do not "fill the gap" with speculative routes, states, actions, outcomes, or test IDs.
- Return the missing contracts as blocking issues to `architect`; do not generate partial E2E artifacts.

### Step 0.5. Detect Playwright conventions

- Inspect the repository for existing Playwright configuration (`playwright.config.ts`, `playwright.config.js`)
- Check for existing E2E test files (`*.spec.ts`, `e2e/` directory)
- Mirror the project's current Playwright version, base URL patterns, and test conventions
- If no Playwright setup exists, generate tests assuming standard Playwright defaults
- Identify existing page objects, fixtures, or helper utilities to reuse

### Step 1. Extract browser integration targets from `plan.md`

- Parse all constraint IDs (`[C-...]`) from `plan.md` that involve user-facing behavior
- Identify bounded browser-integration targets: form validation, submit gating, loading/success/error states, CRUD interactions inside one screen or feature shell, and visible API/module integration on that surface
- Map each target to the constraints it verifies
- Use only flows whose route, user state, action, visible outcome, and locator/testability contracts are explicitly resolved
- Skip constraints that are purely internal logic (covered by `plan-unit-test`)
- Exclude multi-route journeys, cross-page auth/session handoffs, persistence-after-reload flows, and post-implementation regression guards; record these under `Deferred to playwright-guard` in `manifest.md`

### Step 2. Read reference documents

- Read `./references/e2e-conventions.md` (E2E writing rules)
- Read `./references/constraint-coverage.md` (E2E coverage rules)

### Step 3. Design test scenarios per browser integration target

For each target, derive the browser integration scenarios:

- **Interaction path**: the intended feature interaction succeeds within the bounded surface
- **Validation/error path**: user sees appropriate error feedback for invalid input or failed operations
- **Edge state path**: empty states, boundary inputs, loading, disabled controls, concurrent actions visible to the user
- **Feature-local navigation path**: tabs, drawers, modals, or sub-routes that stay inside the same feature shell

Rules:

- Focus on what the user sees and interacts with, not internal state
- Each scenario must trace back to at least one constraint ID
- Use deterministic assertions (no flaky timing-dependent checks)
- Design tests that can run without live browser exploration at authoring time
- Do not author scenarios for flows whose browser contracts are not fully resolved
- Do not author full-flow journey assertions that cross major routes or application states; those belong to `playwright-guard`

### Step 4. Generate `.spec.ts` files

For each testable target, generate a Playwright test file following these rules:

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

test.describe('프로필 설정 폼', () => {
  test('[C-PROFILE-001] 표시 이름이 비어 있으면 오류 메시지를 표시한다', async ({ page }) => {
    // Arrange
    await page.goto('/settings/profile');

    // Act
    await page.getByTestId('display-name-input').fill('');
    await page.getByTestId('save-button').click();

    // Assert
    await expect(page.getByTestId('display-name-error')).toBeVisible();
    await expect(page.getByTestId('display-name-error')).toContainText('표시 이름');
  });

  test('[C-PROFILE-002] 저장 중에는 버튼을 비활성화하고 성공 배너를 표시한다', async ({ page }) => {
    // Arrange
    await page.goto('/settings/profile');

    // Act
    await page.getByTestId('display-name-input').fill('새 이름');
    await page.getByTestId('save-button').click();

    // Assert
    await expect(page.getByTestId('save-button')).toBeDisabled();
    await expect(page.getByTestId('profile-save-success')).toBeVisible();
  });
});
```

### Step 5. Save test files as plan artifacts

Save generated browser integration tests to `./plans/{task-name}/e2e/` with logical grouping:

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
| `settings/profile.spec.ts` | Profile settings form | [C-PROFILE-001], [C-PROFILE-002] | interaction, validation, local-navigation |
| ... | ... | ... | ... |

## data-testid Registry

| data-testid | Element | Page/Component |
|-------------|---------|----------------|
| `email-input` | Email input field | Login page |
| `login-button` | Submit button | Login page |
| ... | ... | ... |

## Deferred to `playwright-guard`

| Journey / Flow | Reason |
|----------------|--------|
| `signup -> dashboard redirect` | Cross-route full journey owned by post-implementation guard phase |
| ... | ... |

## Coverage

- Total in-scope browser-integration constraints: N
- Constraints with interaction-path coverage: N
- Constraints with error/validation coverage: N
- Deferred full-flow guard constraints: N
- Browser-integration coverage: 100%
```

The `data-testid Registry` serves as a contract between browser integration tests and implementation. Implementation must apply these exact `data-testid` attributes.

### Step 7. Verify constraint coverage

- Every in-scope browser-integration constraint ID in `plan.md` must map to >= 1 Playwright test
- Every in-scope constraint must include at least an interaction-path scenario
- Validation/error scenarios must exist for constraints involving user input
- Constraints intentionally deferred to `playwright-guard` must be listed in `manifest.md` and excluded from the `plan-e2e-test` coverage denominator
- If coverage < 100%, add missing tests before completing
- Do not mark complete until in-scope coverage is 100%

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
- **Constraint coverage 100%**: Mandatory for all in-scope browser-integration constraints before completion
- **data-testid preferred**: Use `data-testid` attributes as the primary locator strategy
- **Test isolation**: Each test must be independently runnable with no shared state
- **No speculative browser contract authoring**: Missing route/state/action/outcome/locator contracts are blocking errors, not assumptions
- **No full-flow journey authoring**: Cross-route or post-implementation regression coverage belongs to `playwright-guard`
</Instructions>
</Skill_Guide>
