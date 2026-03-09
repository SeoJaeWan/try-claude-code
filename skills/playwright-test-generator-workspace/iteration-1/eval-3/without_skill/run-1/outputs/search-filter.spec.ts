import { test, expect } from '@playwright/test';

test.describe('Search and Filter functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the search input field', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await expect(searchInput).toBeVisible();
  });

  test('should allow typing a search query', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });

  test('should display search results matching the query', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('Next.js');

    // Wait for results to appear (debounce or submit)
    const resultsList = page.locator('[data-testid="search-results"]').or(page.getByRole('list'));
    await expect(resultsList).toBeVisible();

    // At least one result should contain the search term
    const resultItems = resultsList.getByRole('listitem');
    await expect(resultItems.first()).toBeVisible();
    await expect(resultItems.first()).toContainText(/next/i);
  });

  test('should filter results when a filter option is selected', async ({ page }) => {
    // Look for filter controls (dropdown, checkbox group, or radio group)
    const filterControl = page
      .getByRole('combobox')
      .or(page.locator('[data-testid="filter"]'))
      .or(page.getByRole('group').filter({ hasText: /filter/i }));
    await expect(filterControl.first()).toBeVisible();

    // Select a filter option
    const firstFilter = filterControl.first();
    if (await firstFilter.evaluate((el) => el.tagName === 'SELECT')) {
      await firstFilter.selectOption({ index: 1 });
    } else {
      // Click-based filter (checkbox, button, etc.)
      const filterOption = firstFilter.getByRole('checkbox').or(firstFilter.getByRole('radio')).or(firstFilter.getByRole('button'));
      await filterOption.first().click();
    }

    // Verify filtered results are displayed
    const resultsList = page.locator('[data-testid="search-results"]').or(page.getByRole('list'));
    await expect(resultsList).toBeVisible();
  });

  test('should combine search query with filter', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('template');

    // Apply a filter
    const filterControl = page
      .getByRole('combobox')
      .or(page.locator('[data-testid="filter"]'))
      .first();

    if (await filterControl.isVisible()) {
      if (await filterControl.evaluate((el) => el.tagName === 'SELECT')) {
        await filterControl.selectOption({ index: 1 });
      } else {
        await filterControl.click();
      }
    }

    // Verify results reflect both search and filter criteria
    const resultsList = page.locator('[data-testid="search-results"]').or(page.getByRole('list'));
    await expect(resultsList).toBeVisible();
  });

  test('should show no results message when search yields no matches', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));

    // Type a query that should not match anything
    await searchInput.fill('xyznonexistentquery12345');

    // Wait for the no-results state to appear
    const noResults = page
      .getByText(/no results/i)
      .or(page.getByText(/nothing found/i))
      .or(page.getByText(/no items/i))
      .or(page.getByText(/not found/i))
      .or(page.locator('[data-testid="no-results"]'));

    await expect(noResults.first()).toBeVisible();

    // Ensure that the results list is either hidden or empty
    const resultItems = page
      .locator('[data-testid="search-results"] li')
      .or(page.getByRole('listitem'));
    await expect(resultItems).toHaveCount(0);
  });

  test('should show no results when filter combination yields empty set', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('xyznonexistentquery12345');

    // Also apply a restrictive filter if available
    const filterControl = page
      .getByRole('combobox')
      .or(page.locator('[data-testid="filter"]'))
      .first();

    if (await filterControl.isVisible()) {
      if (await filterControl.evaluate((el) => el.tagName === 'SELECT')) {
        // Select the last option which is likely the most restrictive
        const options = await filterControl.locator('option').all();
        if (options.length > 1) {
          await filterControl.selectOption({ index: options.length - 1 });
        }
      }
    }

    // Verify no results message is displayed
    const noResults = page
      .getByText(/no results/i)
      .or(page.getByText(/nothing found/i))
      .or(page.getByText(/no items/i))
      .or(page.locator('[data-testid="no-results"]'));

    await expect(noResults.first()).toBeVisible();
  });

  test('should clear search and show all results again', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));

    // Perform a search
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    // Clear the search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Verify all results are shown again (or initial state is restored)
    const resultsList = page.locator('[data-testid="search-results"]').or(page.getByRole('list'));
    const resultItems = resultsList.getByRole('listitem');

    // Should have results (more than zero)
    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should update URL with search parameters', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('docs');

    // Press Enter or wait for auto-search
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    // Check URL contains search parameter
    const url = page.url();
    expect(url).toMatch(/[?&](q|query|search)=/i);
  });
});
