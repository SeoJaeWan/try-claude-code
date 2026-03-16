// spec: specs/navigation.md
// seed: tests/seed.spec.ts

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

test.describe("쿠키 배너 차단", () => {
  test("쿠키 배너가 네비게이션 클릭을 차단", async ({ page }) => {
    // Clear cookie consent to ensure banner appears
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cookie-consent"));
    await page.reload();

    // FIX: Dismiss the cookie banner before interacting with the page.
    // The banner uses z-50 and covers the full viewport, blocking all clicks.
    const cookieBanner = page.getByTestId("cookie-banner");
    if (await cookieBanner.isVisible()) {
      await page.getByTestId("cookie-accept").click();
      await expect(cookieBanner).toBeHidden();
    }

    await loginAsTestUser(page);
    await page.getByTestId("nav-todos").click();
    await expect(page).toHaveURL(/\/todos/);
  });

  test("쿠키 배너 뒤의 버튼 클릭", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cookie-consent"));
    await page.reload();

    // FIX: Dismiss the cookie banner before interacting with content behind it.
    // Without this, clicks on login inputs are intercepted by the overlay.
    const cookieBanner = page.getByTestId("cookie-banner");
    if (await cookieBanner.isVisible()) {
      await page.getByTestId("cookie-accept").click();
      await expect(cookieBanner).toBeHidden();
    }

    await page.goto("/login");
    await page.getByTestId("login-email").fill("test@example.com");
    await page.getByTestId("login-password").fill("password123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});
