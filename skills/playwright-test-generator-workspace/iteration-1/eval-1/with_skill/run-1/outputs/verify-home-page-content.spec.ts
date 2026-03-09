// spec: specs/README.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Next.js Home Page Verification', () => {
  test('Verify Home Page Content', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/');

    // 2. Verify the Next.js logo image is visible
    await expect(page.getByRole('img', { name: 'Next.js logo' })).toBeVisible();

    // 3. Verify the heading "To get started, edit the page.tsx file." is visible
    await expect(page.getByRole('heading', { name: 'To get started, edit the page.tsx file.' })).toBeVisible();

    // 4. Verify the "Templates" link is visible
    await expect(page.getByRole('link', { name: 'Templates' })).toBeVisible();

    // 5. Verify the "Learning" link is visible
    await expect(page.getByRole('link', { name: 'Learning' })).toBeVisible();

    // 6. Verify the "Deploy Now" link is visible
    await expect(page.getByRole('link', { name: /Deploy Now/ })).toBeVisible();

    // 7. Verify the "Documentation" link is visible
    await expect(page.getByRole('link', { name: 'Documentation' })).toBeVisible();
  });
});
