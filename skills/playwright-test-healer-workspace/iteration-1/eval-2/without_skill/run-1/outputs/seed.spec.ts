import { test, expect } from '@playwright/test';

test.describe('Next.js Homepage', () => {
  test('should display the homepage content correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded before interacting
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify main heading text
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'To get started, edit the page.tsx file.'
    );

    // Verify the Next.js logo is visible
    await expect(page.getByAlt('Next.js logo')).toBeVisible();

    // Verify navigation links are present and visible before clicking
    const templatesLink = page.getByRole('link', { name: 'Templates' });
    await expect(templatesLink).toBeVisible();

    const learningLink = page.getByRole('link', { name: 'Learning' });
    await expect(learningLink).toBeVisible();

    // Verify call-to-action buttons
    const deployLink = page.getByRole('link', { name: /Deploy Now/i });
    await expect(deployLink).toBeVisible();

    const docsLink = page.getByRole('link', { name: /Documentation/i });
    await expect(docsLink).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');

    // Use toHaveTitle with a timeout to handle slow page loads
    await expect(page).toHaveTitle('Create Next App', { timeout: 10000 });
  });

  test('should have correct link targets', async ({ page }) => {
    await page.goto('/');

    // Wait for the page content to be fully rendered
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check deploy link opens in new tab
    const deployLink = page.getByRole('link', { name: /Deploy Now/i });
    await expect(deployLink).toBeVisible();
    await expect(deployLink).toHaveAttribute('target', '_blank');

    // Check documentation link opens in new tab
    const docsLink = page.getByRole('link', { name: /Documentation/i });
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute('target', '_blank');
  });
});
