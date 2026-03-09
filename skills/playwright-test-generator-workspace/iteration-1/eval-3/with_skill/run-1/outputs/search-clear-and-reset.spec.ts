// spec: specs/README.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Search/Filter Functionality', () => {
  test('Filter reset / clear search restores original content', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Locate the search input field
    const searchInput = page.getByRole('searchbox').or(page.getByLabel(/search/i)).or(page.getByPlaceholder(/search|filter|검색/i));
    await expect(searchInput).toBeVisible();

    // 3. Type a search term to filter content
    await searchInput.fill('Next.js');

    // 4. Clear the search field
    await searchInput.clear();

    // 5. Verify that all original content is restored
    await expect(
      page.getByRole('heading', { name: /to get started/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Templates' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deploy Now' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Documentation' })).toBeVisible();
  });
});
