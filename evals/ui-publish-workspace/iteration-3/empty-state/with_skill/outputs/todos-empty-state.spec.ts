import { test, expect } from "@playwright/test";

async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("테스트유저");
  await page.getByTestId("signup-email").fill(`empty-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("할 일 empty state", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie-consent", "true");
      localStorage.removeItem("todos");
    });

    await loginAsTestUser(page);
  });

  test("[C-EMPTY-001][C-EMPTY-003] 할 일이 없으면 기본 empty state가 노출된다", async ({ page }) => {
    // Arrange
    await page.goto("/todos");

    // Act
    const emptyState = page.getByTestId("empty-state");

    // Assert
    await expect(emptyState).toBeVisible();
    await expect(page.getByTestId("empty-state-title")).toHaveText("아직 할 일이 없습니다");
    await expect(page.getByTestId("empty-state-description")).toHaveText(
      "위 입력란에서 새로운 할 일을 추가해보세요",
    );
  });

  test("[C-EMPTY-002][C-EMPTY-003] 검색 결과가 없으면 필터 전용 empty state가 노출된다", async ({ page }) => {
    // Arrange
    await page.goto("/todos");
    await page.getByTestId("todo-input").fill("장보기");
    await page.getByTestId("todo-add").click();
    await expect(page.getByText("장보기")).toBeVisible();

    // Act
    await page.getByTestId("search-input").fill("존재하지않음");

    // Assert
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByTestId("empty-state-title")).toHaveText("검색 결과가 없습니다");
    await expect(page.getByTestId("empty-state-description")).toHaveText(
      "다른 검색어나 필터를 시도해보세요",
    );
  });
});
