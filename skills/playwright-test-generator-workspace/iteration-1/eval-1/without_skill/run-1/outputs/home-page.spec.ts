// spec: specs/README.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Next.js Home Page', () => {
  test('should display the home page with correct content', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Verify the Next.js logo is visible
    await expect(page.getByAltText('Next.js logo')).toBeVisible();

    // 3. Verify the main heading text is displayed
    await expect(
      page.getByRole('heading', { name: 'To get started, edit the page.tsx file.' })
    ).toBeVisible();

    // 4. Verify the description paragraph is visible
    await expect(
      page.getByText('Looking for a starting point or more instructions?')
    ).toBeVisible();

    // 5. Verify the Templates link is present and has correct href
    const templatesLink = page.getByRole('link', { name: 'Templates' });
    await expect(templatesLink).toBeVisible();
    await expect(templatesLink).toHaveAttribute(
      'href',
      /vercel\.com\/templates/
    );

    // 6. Verify the Learning link is present and has correct href
    const learningLink = page.getByRole('link', { name: 'Learning' });
    await expect(learningLink).toBeVisible();
    await expect(learningLink).toHaveAttribute('href', /nextjs\.org\/learn/);

    // 7. Verify the Deploy Now button/link is present
    const deployLink = page.getByRole('link', { name: 'Deploy Now' });
    await expect(deployLink).toBeVisible();
    await expect(deployLink).toHaveAttribute('target', '_blank');

    // 8. Verify the Vercel logomark is displayed within Deploy Now link
    await expect(page.getByAltText('Vercel logomark')).toBeVisible();

    // 9. Verify the Documentation link is present
    const docsLink = page.getByRole('link', { name: 'Documentation' });
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute('href', /nextjs\.org\/docs/);
    await expect(docsLink).toHaveAttribute('target', '_blank');
  });

  test('should have correct page metadata', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Verify the page title
    await expect(page).toHaveTitle('Create Next App');
  });

  test('should have accessible link structure', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Verify all external links have rel="noopener noreferrer"
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(externalLinks.nth(i)).toHaveAttribute(
        'rel',
        'noopener noreferrer'
      );
    }

    // 3. Verify the html lang attribute is set
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
