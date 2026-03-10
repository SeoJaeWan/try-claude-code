// spec: specs/todo-crud.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

// Helper: signup and login before tests
async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/signup");
  await page.getByTestId("signup-name").fill("테스트유저");
  await page.getByTestId("signup-email").fill(`test-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("할 일 추가", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");
  });

  test("유효한 할 일 추가", async ({ page }) => {
    // BUG: wrong selector - should be "todo-input" not "task-input"
    await page.getByTestId("task-input").fill("테스트 할 일 항목");
    await page.getByTestId("todo-add").click();

    await expect(page.getByText("테스트 할 일 항목")).toBeVisible();
  });

  test("빈 입력 유효성 검증", async ({ page }) => {
    await page.getByTestId("todo-add").click();

    // BUG: wrong expected text
    await expect(page.getByText("할일을 입력하세요")).toBeVisible();
  });
});
