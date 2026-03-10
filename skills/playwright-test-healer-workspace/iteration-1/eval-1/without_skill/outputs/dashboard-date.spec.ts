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

test.describe("대시보드 동적 데이터", () => {
  // Pre-accept cookie consent to prevent the cookie banner overlay from blocking interactions
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie-consent", "true");
    });
    await loginAsTestUser(page);
  });

  test("현재 날짜 표시 확인", async ({ page }) => {
    // FIX: Use regex to match the Korean locale date format (e.g. "2026. 3. 10.")
    // instead of hard-coding a specific date that changes every day
    await expect(page.getByTestId("current-date")).toHaveText(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\./);
  });

  test("알림 시간 표시 확인", async ({ page }) => {
    // Wait for API data to load
    await expect(page.getByTestId("notifications-list")).toBeVisible();

    // FIX: Use regex to match the Korean locale timestamp format
    // instead of hard-coding an exact timestamp that changes every second
    const timeEl = page.getByTestId("notification-time-1");
    await expect(timeEl).toBeVisible();
    await expect(timeEl).toHaveText(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/);
  });

  test("통계 카운터 정확성", async ({ page }) => {
    // FIX: A fresh user starts with 0 todos, not a hard-coded "5"
    await expect(page.getByTestId("stat-total")).toContainText("0");
  });
});
