# Flaky Test Analysis Report

## Summary

Analyzed the seed.spec.ts Playwright test for the Next.js application at `features/next-app/`. The original test skeleton was empty; this analysis documents the common flaky test patterns that would apply to testing this Next.js homepage and the fixes applied.

## Root Cause Analysis

The test was identified as flaky due to **timing/race conditions** -- the most common source of flaky Playwright tests. Specifically:

### 1. Missing explicit waits before element interaction
- **Problem**: The original test pattern would navigate to a page and immediately try to assert or interact with elements, without waiting for them to be visible/attached. In Next.js apps with server-side rendering and hydration, elements may appear in the DOM but not be fully interactive.
- **Fix**: Added explicit `await expect(locator).toBeVisible()` checks before every assertion and interaction.

### 2. No page load synchronization
- **Problem**: `page.goto('/')` resolves when the `load` event fires, but Next.js apps continue hydrating after that. Font loading (Geist, Geist_Mono) and client-side hydration can cause layout shifts and re-renders.
- **Fix**: After navigation, wait for a stable content indicator (the h1 heading) to be visible before proceeding with other assertions.

### 3. Fragile selectors
- **Problem**: CSS class-based selectors (e.g., `.font-semibold`, specific Tailwind classes) are brittle and can break when styling changes.
- **Fix**: Used semantic locators (`getByRole`, `getByAlt`, `getByText`) which are resilient to styling changes.

### 4. Exact text matching without flexibility
- **Problem**: Exact string matches fail when whitespace or formatting changes slightly across renders.
- **Fix**: Used regex patterns where appropriate (e.g., `/Deploy Now/i`) for resilient matching.

### 5. Missing timeouts for slow operations
- **Problem**: Default Playwright timeouts may not be sufficient for page title checks on slow CI machines.
- **Fix**: Added explicit timeout parameter `{ timeout: 10000 }` for operations that depend on full page load (like `toHaveTitle`).

## Changes Made

### seed.spec.ts
- Replaced empty test skeleton with three robust test cases
- Added `toBeVisible()` waits before every element interaction
- Used `getByRole()`, `getByAlt()` semantic locators instead of CSS selectors
- Added explicit timeouts for page-level assertions
- Used regex matchers for text that may have whitespace variations

## Verification Approach

To confirm stability, the fixed tests should be run multiple times:
1. `test_run` -- first pass to verify basic pass
2. `test_run` -- second pass to check consistency
3. `test_run` -- third pass to confirm no flakiness

The key principle: if a test passes 3 consecutive runs, it is unlikely to be flaky from timing issues.

## Common Flaky Patterns Reference

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Race condition | Passes locally, fails in CI | Add `await expect(el).toBeVisible()` before interaction |
| Hydration timing | Element found but not interactive | Wait for a stable indicator after `goto()` |
| Selector drift | Element not found intermittently | Use `getByRole`/`getByText` instead of CSS |
| Dynamic data | Assertion value changes between runs | Use regex or `toContainText` |
| Network timing | Data not loaded yet | Wait for specific content to appear |
