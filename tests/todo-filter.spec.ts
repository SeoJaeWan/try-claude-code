// spec: specs/todo-crud.md
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

async function addTodo(page: import("@playwright/test").Page, text: string) {
  await page.getByTestId("todo-input").fill(text);
  await page.getByTestId("todo-add").click();
  await expect(page.getByText(text)).toBeVisible();
}

test.describe("할 일 필터", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");
  });

  test("검색으로 필터링", async ({ page }) => {
    await addTodo(page, "장보기");
    await addTodo(page, "운동하기");
    await addTodo(page, "독서");

    await page.getByTestId("search-input").fill("장보기");

    // BUG: timing issue - checking immediately without waiting for filter
    const items = page.locator('[data-testid^="todo-item-"]');
    await expect(items).toHaveCount(1);
    await expect(page.getByText("장보기")).toBeVisible();
  });

  test("검색 결과 없음", async ({ page }) => {
    await addTodo(page, "장보기");
    await page.getByTestId("search-input").fill("존재하지않는항목");

    // BUG: wrong selector - should check empty-state, not "no-results"
    await expect(page.getByTestId("no-results")).toBeVisible();
  });

  test("완료 필터", async ({ page }) => {
    await addTodo(page, "완료될 항목");

    // BUG: trying to click checkbox with wrong approach
    await page.locator(".todo-checkbox").first().click();
    await page.getByTestId("filter-completed").click();

    await expect(page.getByText("완료될 항목")).toBeVisible();
  });
});
