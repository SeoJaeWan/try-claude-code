// spec: specs/signup-form-plan.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Signup Form Tests', () => {
  test('Validation Error - Weak Password', async ({ page }) => {
    // 1. Navigate to the signup page
    await page.goto('/signup');

    // 2. Fill in the name field with "홍길동"
    await page.getByLabel('이름').fill('홍길동');

    // 3. Fill in the email field with "test@example.com"
    await page.getByLabel('이메일').fill('test@example.com');

    // 4. Fill in the password field with "123"
    await page.getByLabel('비밀번호', { exact: true }).fill('123');

    // 5. Fill in the confirm password field with "123"
    await page.getByLabel('비밀번호 확인').fill('123');

    // 6. Click the signup/submit button
    await page.getByRole('button', { name: '회원가입' }).click();

    // Verify: Weak password error message appears
    await expect(page.getByText('비밀번호는 8자 이상이어야 합니다')).toBeVisible();
  });
});
