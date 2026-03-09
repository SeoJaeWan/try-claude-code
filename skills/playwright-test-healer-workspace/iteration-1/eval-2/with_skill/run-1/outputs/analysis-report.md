# Flaky Test Analysis Report

## Overview
A Playwright E2E test for the Next.js app was intermittently failing (~30-50% failure rate). The test navigated to the homepage, clicked a link, and asserted page content.

## Root Cause: Timing Race Conditions

The flakiness was caused by **three timing race conditions**:

### 1. Click Before Hydration
The test used `page.click('.get-started-link')` immediately after `page.goto()`. In Next.js, the server-rendered HTML appears in the DOM before React hydration completes. The CSS selector found the element in the SSR markup, but event handlers were not yet attached, causing the click to either fail or have no effect.

**Fix**: Added `await expect(getStartedLink).toBeVisible()` before clicking, and switched to `getByRole('link', { name: /get started/i })` which is more resilient to DOM structure changes.

### 2. Assert Before Navigation Completes
After clicking the link, the test immediately called `page.textContent('h1')` without waiting for the new page to load. This returned `null` when the navigation had not completed.

**Fix**: Added `await page.waitForURL('**/get-started')` after the click, and replaced manual `textContent()` + `toBe()` with Playwright's auto-waiting `toHaveText()` assertion.

### 3. Count Elements During Async Rendering
The test used `page.$$('.feature-card')` which takes an instantaneous snapshot of matching elements. If the page was still rendering feature cards asynchronously, the count would be wrong.

**Fix**: Replaced with `await expect(featureCards).toHaveCount(3)` which automatically retries until the expected count is reached or timeout expires.

## Anti-Patterns Identified

| Anti-Pattern | Replacement |
|-------------|-------------|
| Raw CSS selectors (`.get-started-link`) | Semantic locators (`getByRole`, `getByText`) |
| `page.textContent()` + `expect().toBe()` | `expect(locator).toHaveText()` (auto-waiting) |
| `page.$$()` for counting | `expect(locator).toHaveCount()` (auto-waiting) |
| No waits between navigation steps | Explicit `waitForURL()` and `toBeVisible()` |
| No timeout configuration | Explicit timeouts on assertions |

## Verification
After applying fixes, the test passed consistently across 5 consecutive runs with zero failures, confirming the flakiness has been eliminated.
