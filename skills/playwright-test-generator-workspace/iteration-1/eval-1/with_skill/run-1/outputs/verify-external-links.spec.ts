// spec: specs/README.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Next.js Home Page Verification', () => {
  test('Verify External Links', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Verify the "Deploy Now" link points to vercel.com
    await expect(page.getByRole('link', { name: /Deploy Now/ })).toHaveAttribute(
      'href',
      /vercel\.com\/new/
    );

    // 3. Verify the "Documentation" link points to nextjs.org/docs
    await expect(page.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
      'href',
      /nextjs\.org\/docs/
    );

    // 4. Verify the "Templates" link points to vercel.com/templates
    await expect(page.getByRole('link', { name: 'Templates' })).toHaveAttribute(
      'href',
      /vercel\.com\/templates/
    );

    // 5. Verify the "Learning" link points to nextjs.org/learn
    await expect(page.getByRole('link', { name: 'Learning' })).toHaveAttribute(
      'href',
      /nextjs\.org\/learn/
    );
  });
});
