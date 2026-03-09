import { test, expect } from '@playwright/test';

test.describe('Next.js App Homepage', () => {
  test('should display the homepage with correct content', async ({ page }) => {
    await page.goto('/');

    // Verify the main heading is visible
    await expect(
      page.getByRole('heading', { name: /to get started, edit the page\.tsx file/i })
    ).toBeVisible();

    // Verify the Next.js logo is present
    await expect(page.getByAltText('Next.js logo')).toBeVisible();

    // Verify navigation links are present
    await expect(page.getByRole('link', { name: /deploy now/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /documentation/i })).toBeVisible();

    // Verify Templates and Learning links in the description
    await expect(page.getByRole('link', { name: /templates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /learning/i })).toBeVisible();
  });

  test('should have correct link targets', async ({ page }) => {
    await page.goto('/');

    // Deploy Now link should point to Vercel
    const deployLink = page.getByRole('link', { name: /deploy now/i });
    await expect(deployLink).toHaveAttribute('href', /vercel\.com\/new/);
    await expect(deployLink).toHaveAttribute('target', '_blank');

    // Documentation link should point to Next.js docs
    const docsLink = page.getByRole('link', { name: /documentation/i });
    await expect(docsLink).toHaveAttribute('href', /nextjs\.org\/docs/);
    await expect(docsLink).toHaveAttribute('target', '_blank');
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/create next app/i);
  });
});
