// spec: specs/README.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Search/Filter Functionality', () => {
  test('Search with no matching results', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Locate the search input field
    const searchInput = page.getByRole('searchbox').or(page.getByLabel(/search/i)).or(page.getByPlaceholder(/search|filter|검색/i));
    await expect(searchInput).toBeVisible();

    // 3. Type a search term that does not match any content
    await searchInput.fill('xyznonexistent123');

    // 4. Verify that a "no results" message or empty state is displayed
    await expect(
      page.getByText(/no results|결과 없음|nothing found|0 results/i)
    ).toBeVisible();

    // 5. Verify no matching items appear in the results area
    const resultItems = page.getByRole('listitem').or(page.locator('[data-testid="search-result-item"]'));
    await expect(resultItems).toHaveCount(0);
  });
});
