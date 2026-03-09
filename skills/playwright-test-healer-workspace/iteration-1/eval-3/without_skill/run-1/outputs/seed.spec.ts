import { test, expect } from '@playwright/test';

test.describe('Next.js Homepage - Post UI Redesign', () => {
  test('should display the homepage content correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify main heading text
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'To get started, edit the page.tsx file.'
    );

    // Verify the Next.js logo is visible
    await expect(page.getByRole('img', { name: 'Next.js logo' })).toBeVisible();

    // Verify navigation links are present and visible
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

  test('should have Vercel logomark in deploy button', async ({ page }) => {
    await page.goto('/');

    // Wait for content
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify the Vercel logo inside the deploy link
    const vercelLogo = page.getByRole('img', { name: 'Vercel logomark' });
    await expect(vercelLogo).toBeVisible();
  });

  test('should display description text with links', async ({ page }) => {
    await page.goto('/');

    // Wait for content
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify description paragraph contains expected text
    await expect(page.getByText('Looking for a starting point')).toBeVisible();

    // Verify Templates link href
    const templatesLink = page.getByRole('link', { name: 'Templates' });
    await expect(templatesLink).toHaveAttribute('href', /vercel\.com\/templates/);

    // Verify Learning link href
    const learningLink = page.getByRole('link', { name: 'Learning' });
    await expect(learningLink).toHaveAttribute('href', /nextjs\.org\/learn/);
  });
});
