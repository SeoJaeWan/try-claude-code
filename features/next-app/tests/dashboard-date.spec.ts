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

test.describe("대시보드 동적 데이터", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("현재 날짜 표시 확인", async ({ page }) => {
    // BUG: Hard-coded date that changes daily
    await expect(page.getByTestId("current-date")).toHaveText("2025. 1. 15.");
  });

  test("알림 시간 표시 확인", async ({ page }) => {
    // Wait for API data to load
    await expect(page.getByTestId("notifications-list")).toBeVisible();

    // BUG: Hard-coded exact timestamp that changes every second
    await expect(page.getByTestId("notification-time-1")).toHaveText(
      "2025. 1. 15. 오전 10:30:00"
    );
  });

  test("통계 카운터 정확성", async ({ page }) => {
    // BUG: Asserts exact count that depends on test execution order
    await expect(page.getByTestId("stat-total")).toContainText("5");
  });
});
