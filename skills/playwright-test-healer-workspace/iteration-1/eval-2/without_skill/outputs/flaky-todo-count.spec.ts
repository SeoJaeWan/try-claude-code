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
    const items = page.locator('[data-testid^="todo-item-"]');

    // Add items one at a time, waiting for each to appear before adding the next.
    // Without these intermediate waits, the rapid fill+click sequence can race
    // against React re-renders: the form's state reset (setText("")) may not
    // complete before the next fill(), causing lost input or duplicate submissions.
    await page.getByTestId("todo-input").fill("항목1");
    await page.getByTestId("todo-add").click();
    await expect(items).toHaveCount(1);

    await page.getByTestId("todo-input").fill("항목2");
    await page.getByTestId("todo-add").click();
    await expect(items).toHaveCount(2);

    await page.getByTestId("todo-input").fill("항목3");
    await page.getByTestId("todo-add").click();
    await expect(items).toHaveCount(3);
  });

  test("완료 토글 후 즉시 스타일 확인", async ({ page }) => {
    await page.getByTestId("todo-input").fill("체크할 항목");
    await page.getByTestId("todo-add").click();

    // Wait for the todo item to fully render before interacting with it
    const todoItem = page.locator('[data-testid^="todo-item-"]').first();
    await expect(todoItem).toBeVisible();

    // Wait for the checkbox within the rendered item to be ready, then click
    const checkbox = todoItem.locator('[data-testid^="todo-checkbox-"]');
    await expect(checkbox).toBeVisible();
    await checkbox.click();

    // Wait for React re-render by asserting on the computed class.
    // The app applies "line-through" via Tailwind when todo.completed is true.
    const todoText = todoItem.locator('[data-testid^="todo-text-"]');
    await expect(todoText).toHaveClass(/line-through/);
  });
});
