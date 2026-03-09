// spec: specs/signup-form-plan.md
// seed: seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Signup Form Tests', () => {
  test('Validation Error - Invalid Email Format', async ({ page }) => {
    // 1. Navigate to the signup page
    await page.goto('/signup');

    // 2. Fill in the name field with "홍길동"
    await page.getByLabel('이름').fill('홍길동');

    // 3. Fill in the email field with "invalid-email"
    await page.getByLabel('이메일').fill('invalid-email');

    // 4. Fill in the password field with "Password123!"
    await page.getByLabel('비밀번호', { exact: true }).fill('Password123!');

    // 5. Fill in the confirm password field with "Password123!"
    await page.getByLabel('비밀번호 확인').fill('Password123!');

    // 6. Click the signup/submit button
    await page.getByRole('button', { name: '회원가입' }).click();

    // Verify: Email validation error message appears
    await expect(page.getByText('올바른 이메일 형식을 입력해주세요')).toBeVisible();
  });
});
