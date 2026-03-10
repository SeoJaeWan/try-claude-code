// spec: specs/todo-crud.md
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

test.describe("할 일 카운트", () => {
  // Pre-accept cookie consent to prevent the cookie banner overlay from blocking interactions
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie-consent", "true");
    });
    await loginAsTestUser(page);
    await page.goto("/todos");
  });

  test("빠른 추가 후 카운트 확인", async ({ page }) => {
    // Add multiple items
    await page.getByTestId("todo-input").fill("항목1");
    await page.getByTestId("todo-add").click();
    await page.getByTestId("todo-input").fill("항목2");
    await page.getByTestId("todo-add").click();
    await page.getByTestId("todo-input").fill("항목3");
    await page.getByTestId("todo-add").click();

    // FIX: Use await expect().toHaveCount() instead of synchronous count()
    // to properly wait for React to finish re-rendering before asserting
    const items = page.locator('[data-testid^="todo-item-"]');
    await expect(items).toHaveCount(3);
  });

  test("완료 토글 후 즉시 스타일 확인", async ({ page }) => {
    await page.getByTestId("todo-input").fill("체크할 항목");
    await page.getByTestId("todo-add").click();

    // Wait for the todo item to appear before clicking the checkbox
    await expect(page.getByText("체크할 항목")).toBeVisible();
    await page.locator('[data-testid^="todo-checkbox-"]').first().click();

    // FIX: Wait for React re-render by checking the text decoration class.
    // The app applies "line-through" via Tailwind class on the text element.
    const todoText = page.locator('[data-testid^="todo-text-"]').first();
    await expect(todoText).toHaveClass(/line-through/);
  });
});
