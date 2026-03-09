import { test, expect } from '@playwright/test';

test.describe('Next.js Home Page', () => {
  test('should display the home page with correct elements after UI redesign', async ({ page }) => {
    await page.goto('/');

    // Verify the Next.js logo is visible (using alt text, resilient to CSS changes)
    await expect(page.getByAltText('Next.js logo')).toBeVisible();

    // Verify the heading text (using getByRole, resilient to selector drift)
    await expect(
      page.getByRole('heading', { name: 'To get started, edit the page.tsx file.' })
    ).toBeVisible();

    // Verify the description paragraph (using getByText, resilient to class changes)
    await expect(
      page.getByText('Looking for a starting point or more instructions?')
    ).toBeVisible();

    // Verify the Templates link (using getByRole with name)
    await expect(
      page.getByRole('link', { name: 'Templates' })
    ).toBeVisible();

    // Verify the Learning link (using getByRole with name)
    await expect(
      page.getByRole('link', { name: 'Learning' })
    ).toBeVisible();

    // Verify the Deploy Now CTA (using getByRole with name)
    const deployLink = page.getByRole('link', { name: 'Deploy Now' });
    await expect(deployLink).toBeVisible();
    await expect(deployLink).toHaveAttribute('href', /vercel\.com\/new/);

    // Verify the Documentation CTA (using getByRole with name)
    const docsLink = page.getByRole('link', { name: 'Documentation' });
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute('href', /nextjs\.org\/docs/);

    // Verify the Vercel logomark in the Deploy button
    await expect(page.getByAltText('Vercel logomark')).toBeVisible();
  });
});
