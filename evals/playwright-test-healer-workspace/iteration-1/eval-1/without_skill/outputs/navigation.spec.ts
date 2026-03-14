// spec: specs/navigation.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("테스트유저");
  await page.getByTestId("signup-email").fill(`test-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("네비게이션", () => {
  // Pre-accept cookie consent to prevent the cookie banner overlay from blocking interactions
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie-consent", "true");
    });
    await loginAsTestUser(page);
  });

  test("네비게이션 바 링크 전환", async ({ page }) => {
    await page.getByTestId("nav-todos").click();
    await expect(page).toHaveURL(/\/todos/);

    await page.getByTestId("nav-profile").click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test("모바일 햄버거 메뉴", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByTestId("hamburger-menu").click();
    await expect(page.getByTestId("mobile-menu")).toBeVisible();
  });

  test("브레드크럼 표시", async ({ page }) => {
    await page.goto("/todos");
    await expect(page.getByTestId("breadcrumbs")).toContainText("홈");
    await expect(page.getByTestId("breadcrumbs")).toContainText("할 일");
  });
});
