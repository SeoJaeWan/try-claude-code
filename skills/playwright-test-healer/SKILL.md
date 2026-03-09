---
name: playwright-test-healer
description: Playwright E2E test healer that debugs and repairs broken Playwright tests by analyzing failures, updating selectors, and fixing assertions. Use this skill when the user has failing Playwright tests, broken E2E tests, needs to fix test selectors, debug test timeouts, or repair flaky tests. Also trigger when the user mentions "test failed", "fix test", "debug test", "test broken", "selector changed", "assertion error", "테스트 실패", "테스트 고쳐줘", "flaky test", or any Playwright error output. If the user pastes a test failure log or error stack trace from Playwright, always use this skill.
model: sonnet
context: fork
agent: playwright-test-healer
---

<Skill_Guide>
<Purpose>
Systematically identify, diagnose, and fix broken Playwright tests using a methodical debug-and-repair approach. Runs failing tests, investigates errors in a live browser, and edits test code to resolve issues.
</Purpose>

<Instructions>
# playwright-test-healer

Debug and repair failing Playwright tests through systematic investigation and code remediation.

---

## Why automated healing matters

Test suites break when the application changes — selectors drift, timing shifts, assertions become stale. Manual debugging is slow and error-prone. This workflow uses live browser debugging to see exactly what the application looks like at the point of failure, then applies targeted fixes.

---

## Workflow

### 1. Run all tests

Use `test_run` to execute the full test suite and identify which tests are failing.

### 2. Debug each failure

For each failing test, run `test_debug`. This executes the test in debug mode, pausing at the error point.

### 3. Investigate the error

While paused at the error, use browser tools to understand what went wrong:
- `browser_snapshot` — see the current page state
- `browser_console_messages` — check for JS errors
- `browser_network_requests` — check for failed API calls
- `browser_evaluate` — inspect specific elements or state
- `browser_generate_locator` — get updated locators for changed elements

### 4. Root cause analysis

Determine the underlying cause by checking these common failure patterns:

| Pattern | Symptoms | Typical Fix |
|---------|----------|-------------|
| **Selector drift** | `locator.click: Error: strict mode violation` or element not found | Use `browser_generate_locator` to get the updated selector; prefer `getByRole`/`getByText` over CSS selectors |
| **Timing race** | Intermittent failures, passes on retry | Add explicit `await expect(locator).toBeVisible()` before interaction; never use `waitForTimeout` |
| **Stale assertion** | Expected value doesn't match | Check actual value via `browser_snapshot` or `browser_evaluate`; update expected value |
| **Navigation timing** | Action happens before page load completes | Add `await page.waitForURL()` or `await expect(page).toHaveURL()` before proceeding |
| **Modal/overlay blocking** | Click intercepted by another element | Dismiss the overlay first, or wait for it to disappear with `expect(overlay).toBeHidden()` |
| **Dynamic data** | Values change between runs | Use regex matchers or `toContainText` instead of exact match |

### 5. Fix the code

Edit the test file to address the issue:
- Update selectors to match current application state
- Fix assertions and expected values
- For dynamic data, use regular expressions for resilient locators
- Prefer `getByRole()`, `getByText()`, `getByLabel()` over raw CSS selectors
- Improve test reliability and maintainability

### 6. Verify

Re-run the test after each fix using `test_run` to validate the changes.

### 7. Iterate

Repeat investigation and fixing until all tests pass cleanly.

---

## Key principles

- Fix errors one at a time and retest after each fix — cascading fixes often mask new issues
- Prefer robust, maintainable solutions over quick hacks
- Never wait for `networkidle` or use deprecated APIs
- If a test is correct but the application has a genuine bug, mark it as `test.fixme()` with a comment explaining the actual vs expected behavior
- Do not ask user questions — take the most reasonable action to pass the test

---

## Critical rules

- All Playwright MCP tool calls (browser_*, test_*) MUST be made sequentially, one at a time. The MCP server maintains a single browser instance that cannot handle concurrent operations.
</Instructions>
</Skill_Guide>
