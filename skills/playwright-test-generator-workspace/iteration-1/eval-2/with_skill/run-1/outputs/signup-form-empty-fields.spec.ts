// spec: specs/signup-form-plan.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Signup Form Tests', () => {
  test('Validation Error - Empty Required Fields', async ({ page }) => {
    // 1. Navigate to the signup page
    await page.goto('/signup');

    // 2. Leave all fields empty (no action needed)

    // 3. Click the signup/submit button
    await page.getByRole('button', { name: '회원가입' }).click();

    // Verify: Validation error messages appear for required fields
    await expect(page.getByText('이름을 입력해주세요')).toBeVisible();
    await expect(page.getByText('이메일을 입력해주세요')).toBeVisible();
    await expect(page.getByText('비밀번호를 입력해주세요')).toBeVisible();
  });
});
