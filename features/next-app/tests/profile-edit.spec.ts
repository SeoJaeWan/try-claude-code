// spec: specs/profile-forms.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/signup");
  await page.getByTestId("signup-name").fill("테스트유저");
  await page.getByTestId("signup-email").fill(`test-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("프로필 수정", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/profile");
  });

  test("프로필 정보 수정", async ({ page }) => {
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();

    await page.getByTestId("profile-name").clear();
    await page.getByTestId("profile-name").fill("수정된이름");
    await page.getByTestId("profile-bio").fill("안녕하세요");

    await page.getByTestId("profile-save").click();

    // BUG: checking for dynamic content that changes
    await expect(page.getByTestId("profile-saved")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("수정된이름");
  });

  test("멀티셀렉트 기술 스택", async ({ page }) => {
    await page.getByTestId("profile-edit-btn").click();

    await page.getByTestId("profile-skills-toggle").click();
    await page.getByTestId("multiselect-option-JavaScript").click();
    await page.getByTestId("multiselect-option-React").click();

    await expect(page.getByTestId("multiselect-chip-JavaScript")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-React")).toBeVisible();
  });
});
