// spec: specs/navigation.md
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

test.describe("네비게이션", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("네비게이션 바 링크 전환", async ({ page }) => {
    // BUG: using old link selector
    await page.locator('a[href="/todos"]').click();
    await expect(page).toHaveURL(/\/todos/);

    await page.locator('a[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test("모바일 햄버거 메뉴", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // BUG: wrong selector for hamburger button
    await page.getByTestId("menu-button").click();
    await expect(page.getByTestId("mobile-menu")).toBeVisible();
  });

  test("브레드크럼 표시", async ({ page }) => {
    await page.goto("http://localhost:3000/todos");
    // BUG: checking for exact text that might differ
    await expect(page.getByTestId("breadcrumbs")).toContainText("Home > Todos");
  });
});
