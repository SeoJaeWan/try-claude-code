// spec: specs/navigation.md
// seed: tests/seed.spec.ts

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

test.describe("쿠키 배너 차단", () => {
  test("쿠키 배너가 네비게이션 클릭을 차단", async ({ page }) => {
    // Clear cookie consent to ensure banner appears
    await page.goto("http://localhost:3000");
    await page.evaluate(() => localStorage.removeItem("cookie-consent"));
    await page.reload();

    // BUG: Try to click navigation without dismissing cookie banner overlay
    // The cookie banner covers the entire screen with z-50
    await loginAsTestUser(page);
    await page.getByTestId("nav-todos").click();
    await expect(page).toHaveURL(/\/todos/);
  });

  test("쿠키 배너 뒤의 버튼 클릭", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.evaluate(() => localStorage.removeItem("cookie-consent"));
    await page.reload();

    // BUG: Tries to interact with content behind the overlay
    await page.goto("http://localhost:3000/login");
    await page.getByTestId("login-email").fill("test@example.com");
    await page.getByTestId("login-password").fill("password123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});
