import { test, expect } from '@playwright/test';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    // Navigate to the app and wait for it to be fully loaded
    await page.goto('http://localhost:3000');

    // Wait for the page to be fully hydrated before interacting
    // Use semantic locator instead of CSS selector for resilience
    const getStartedLink = page.getByRole('link', { name: /get started/i });
    await expect(getStartedLink).toBeVisible({ timeout: 10000 });

    // Click the link after confirming it is visible and interactive
    await getStartedLink.click();

    // Wait for navigation to complete before asserting content
    await page.waitForURL('**/get-started', { timeout: 10000 });

    // Use auto-waiting assertion instead of manual textContent extraction
    // toHaveText() automatically retries until the condition is met or timeout
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Get Started', { timeout: 10000 });

    // Use toHaveCount() which auto-waits for the expected number of elements
    // instead of page.$$() which is a snapshot that races with rendering
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3, { timeout: 10000 });
  });
});
