// spec: specs/todo-crud.md
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

async function addTodo(page: import("@playwright/test").Page, text: string) {
  await page.getByTestId("todo-input").fill(text);
  await page.getByTestId("todo-add").click();
  await expect(page.getByText(text)).toBeVisible();
}

test.describe("할 일 필터", () => {
  // Pre-accept cookie consent to prevent the cookie banner overlay from blocking interactions
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie-consent", "true");
    });
    await loginAsTestUser(page);
    await page.goto("/todos");
  });

  test("검색으로 필터링", async ({ page }) => {
    await addTodo(page, "장보기");
    await addTodo(page, "운동하기");
    await addTodo(page, "독서");

    await page.getByTestId("search-input").fill("장보기");

    // FIX: Use async expect().toHaveCount() to wait for filter to apply
    const items = page.locator('[data-testid^="todo-item-"]');
    await expect(items).toHaveCount(1);
    await expect(page.getByText("장보기")).toBeVisible();
  });

  test("검색 결과 없음", async ({ page }) => {
    await addTodo(page, "장보기");
    await page.getByTestId("search-input").fill("존재하지않는항목");

    await expect(page.getByTestId("empty-state")).toBeVisible();
  });

  test("완료 필터", async ({ page }) => {
    await addTodo(page, "완료될 항목");

    await page.locator('[data-testid^="todo-checkbox-"]').first().click();
    await page.getByTestId("filter-completed").click();

    await expect(page.getByText("완료될 항목")).toBeVisible();
  });
});
