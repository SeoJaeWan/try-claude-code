import { test, expect } from '@playwright/test';

test.describe('Next.js Homepage', () => {
  test('should display the homepage with correct content', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/Create Next App/);

    // Verify main heading is visible
    await expect(
      page.getByRole('heading', { name: /to get started, edit the page\.tsx file/i })
    ).toBeVisible();

    // Verify the Next.js logo image is present
    await expect(page.getByRole('img', { name: 'Next.js logo' })).toBeVisible();

    // Verify "Deploy Now" link is present and visible
    await expect(
      page.getByRole('link', { name: /Deploy Now/i })
    ).toBeVisible();

    // Verify "Documentation" link is present and visible
    await expect(
      page.getByRole('link', { name: /Documentation/i })
    ).toBeVisible();

    // Verify descriptive text about Templates and Learning center
    await expect(
      page.getByText(/Looking for a starting point/i)
    ).toBeVisible();

    // Verify Templates link
    await expect(
      page.getByRole('link', { name: /Templates/i })
    ).toBeVisible();

    // Verify Learning link
    await expect(
      page.getByRole('link', { name: /Learning/i })
    ).toBeVisible();
  });
});
