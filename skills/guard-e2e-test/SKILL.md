---
name: guard-e2e-test
description: 여러 route/state를 관통하는 full-flow E2E Playwright 테스트를 생성하는 스킬. agent-browser를 통해 실제 브라우저에서 전체 사용자 여정을 탐색하고, route 전환/상태 유지/인증 흐름 등 cross-page 동작을 검증하는 .spec.ts를 생성하여 실제 테스트 디렉토리에 배치한다. plan-e2e-test(기능/화면 단위 integration test)와 달리, 여러 페이지를 관통하는 전체 사용자 여정의 회귀를 방어하는 용도이다. "회원가입부터 대시보드까지 플로우 테스트", "전체 사용자 여정 E2E", "로그인→결제→완료 플로우 회귀 테스트" 등의 요청 시 사용한다.
model: opus
context: fork
agent: playwright-guard
---

<Skill_Guide>
<Purpose>
Generate full-flow E2E Playwright tests that traverse multiple routes/states.
Complementary to plan-e2e-test (per-feature/screen integration tests).
</Purpose>

<Instructions>
# guard-e2e-test

Full-flow E2E test workflow that traverses entire user journeys across routes.

---

## Documentation References

**Read first:**

- `references/e2e-conventions.md` — Locator strategy, assertion patterns, anti-patterns
- `references/agent-browser-patterns.md` — agent-browser command patterns and token optimization guide

**Detect project conventions:**

- `playwright.config.ts` (or `.js`) — Existing Playwright configuration
- Existing `.spec.ts` files — Directory patterns, naming, Page Object usage

---

## Role Separation: plan-e2e-test vs guard-e2e-test

| Aspect             | plan-e2e-test                          | guard-e2e-test                                           |
| ------------------ | -------------------------------------- | -------------------------------------------------------- |
| **Scope**          | Per-feature/screen (vertical slice)    | Cross-route/state traversal (horizontal flow)            |
| **Verifies**       | Component + state + API integration    | Route transitions, state persistence, auth flows         |
| **Timing**         | Planning phase (pre-implementation)    | Post-implementation                                      |
| **Browser**        | Not required (frozen artifact)         | Live exploration via agent-browser                       |
| **Output**         | `plans/{task}/e2e/`                    | Actual test directory                                    |
| **Mutability**     | Frozen (no modifications)              | Living test (can be improved)                            |
| **Purpose**        | Lock feature contract for development  | Defend entire user journey against regressions           |

**Example comparison:**

- **plan-e2e-test**: On `/signup` screen — password rule errors, password confirmation mismatch, loading/error display after submit
- **guard-e2e-test**: `/signup` entry → signup success → `/dashboard` redirect → login state persists → logout

---

## Input Format

User journey context is received via injection.

### Required Fields

| Field          | Description              | Example                                |
| -------------- | ------------------------ | -------------------------------------- |
| **journey_id** | Journey identifier       | `JOURNEY-AUTH-001`                     |
| **summary**    | One-line journey summary | "Signup through dashboard entry"       |
| **flow_steps** | Route transition chain   | `/signup → /verify-email → /dashboard` |
| **app_url**    | Target app URL           | `http://localhost:3000`                |

### Optional Fields

| Field                    | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **preconditions**        | Required state before journey start (login, seed data)    |
| **state_checkpoints**    | State to verify at each step (auth token, session)        |
| **related_features**     | Features included in this journey                         |
| **critical_transitions** | Particularly important route transition points            |

---

## Implementation Steps

1. **Journey analysis** — Design the flow from injected journey context
    - Parse route transition chain from `flow_steps`
    - Identify state transitions between steps (auth, session, data)
    - Assess impact scope on journey failure
    - Derive branch paths (redirect on failure, unauthenticated access, etc.)

2. **Detect project conventions**
    - Check `playwright.config.ts`
    - Inspect existing `.spec.ts` file structure (directory patterns, naming)
    - Check Page Object usage and `data-testid` patterns
    - Identify test directory path (e.g., `tests/e2e/`, `e2e/`)
    - If no existing conventions, apply defaults from `references/e2e-conventions.md`

3. **Browser exploration (agent-browser)** — Walk through the entire journey live
    - Navigate to journey start point at `app_url` → snapshot → understand page structure
    - Execute each route transition from `flow_steps` in order
    - **Snapshot at each route transition** → capture URL changes and page state
    - **Verify state continuity**: confirm auth tokens, session, user data persist across route transitions
    - Collect: route patterns, transition triggers (buttons/links), verification points per page, state transitions
    - For non-interactive elements (welcome messages, status indicators), use full snapshot or evaluate

4. **Generate tests** — Write `.spec.ts` from collected information
    - File placement: `{test-dir}/guard/{journey-domain}/{journey-scenario}.spec.ts`
    - Prefix `test.describe` with `[Guard]`
    - Include `journey_id` in test names: `[JOURNEY-AUTH-001]`
    - Korean descriptions, AAA pattern (Arrange/Act/Assert)
    - Minimum scenarios per journey:
        - **Happy flow**: Entire journey passes end-to-end
        - **State persistence**: Auth/session/data survives route transitions
        - **Branch flow**: Proper redirects on failure/unauthenticated access

5. **Verify tests** — `pnpm exec playwright test {generated-file}`
    - Locator failures → re-explore with agent-browser and fix
    - Route transition failures → verify actual app behavior, fix or mark `test.fixme()`

6. **Commit changes**

---

## Test Code Structure

Full-flow tests traverse multiple routes sequentially.
Each route transition is a logical step; state continuity is the key verification point.

```typescript
import {test, expect} from "@playwright/test";

test.describe("[Guard] Signup → Dashboard → Logout journey", () => {
    test("[JOURNEY-AUTH-001] Full flow from signup to logout works", async ({page}) => {
        // Step 1: Enter /signup
        await page.goto("/signup");
        await page.getByTestId("email-input").fill("newuser@example.com");
        await page.getByTestId("password-input").fill("SecurePass123!");
        await page.getByTestId("signup-button").click();

        // Step 2: Signup success → redirect to /dashboard
        await expect(page).toHaveURL("/dashboard");
        await expect(page.getByTestId("welcome-message")).toBeVisible();

        // Step 3: Login state persists after reload
        await page.reload();
        await expect(page).toHaveURL("/dashboard");
        await expect(page.getByTestId("user-menu")).toBeVisible();

        // Step 4: Logout
        await page.getByTestId("user-menu").click();
        await page.getByTestId("logout-button").click();
        await expect(page).toHaveURL("/login");
    });

    test("[JOURNEY-AUTH-001] Unauthenticated /dashboard access redirects to /login", async ({page}) => {
        // Branch flow: access protected route without auth
        await page.goto("/dashboard");
        await expect(page).toHaveURL("/login");
    });
});
```

---

## Guardrails

### Must follow

- Never write tests speculatively without agent-browser exploration first
- Never modify existing plan-e2e-test artifacts (the `plans/` directory)
- Never modify existing tests outside the `guard/` directory
- Never write single-screen/feature-scoped tests (that is plan-e2e-test's domain)

### Must not use

- `page.waitForTimeout()` — use auto-waiting instead
- CSS selectors or XPath — use `data-testid` or role-based locators
- Shared state between tests — each test runs independently
- Implementation-coupled selectors (class names, generated IDs)
</Instructions>
</Skill_Guide>
