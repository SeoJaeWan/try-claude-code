// spec: specs/README.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Search/Filter Functionality', () => {
  test('Search with matching results', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Locate the search input field
    const searchInput = page.getByRole('searchbox').or(page.getByLabel(/search/i)).or(page.getByPlaceholder(/search|filter|검색/i));
    await expect(searchInput).toBeVisible();

    // 3. Type a search term that matches content on the page
    await searchInput.fill('Next.js');

    // 4. Verify that matching results are displayed
    const results = page.getByRole('list').or(page.locator('[data-testid="search-results"]'));
    await expect(results).toBeVisible();

    // 5. Verify the search results contain the expected text
    await expect(page.getByText('Next.js')).toBeVisible();
  });
});
