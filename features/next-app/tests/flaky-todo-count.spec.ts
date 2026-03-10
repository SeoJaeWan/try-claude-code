// spec: specs/todo-crud.md
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

test.describe("할 일 카운트", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");
  });

  test("빠른 추가 후 카운트 확인", async ({ page }) => {
    // Add multiple items rapidly
    await page.getByTestId("todo-input").fill("항목1");
    await page.getByTestId("todo-add").click();
    await page.getByTestId("todo-input").fill("항목2");
    await page.getByTestId("todo-add").click();
    await page.getByTestId("todo-input").fill("항목3");
    await page.getByTestId("todo-add").click();

    // BUG: Using synchronous count() instead of async expect().toHaveCount()
    // This creates a race condition - DOM may not have updated yet
    const items = page.locator('[data-testid^="todo-item-"]');
    const count = await items.count();
    expect(count).toBe(3);
  });

  test("완료 토글 후 즉시 스타일 확인", async ({ page }) => {
    await page.getByTestId("todo-input").fill("체크할 항목");
    await page.getByTestId("todo-add").click();

    // BUG: Click checkbox and immediately check style without waiting for re-render
    await page.locator('[data-testid^="todo-checkbox-"]').first().click();
    const todoText = page.locator('[data-testid^="todo-text-"]').first();
    // Race: checking CSS class before React re-renders
    await expect(todoText).toHaveCSS("text-decoration", "line-through");
  });
});
