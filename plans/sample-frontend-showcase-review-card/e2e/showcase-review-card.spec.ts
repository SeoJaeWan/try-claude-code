import { test, expect } from "@playwright/test";

test.describe("showcase review card section", () => {
  test("[C-REVIEW-001][C-REVIEW-002] /showcase에서 review card section과 grid가 보인다", async ({ page }) => {
    // Arrange
    await page.goto("/showcase");

    // Assert
    await expect(page.getByTestId("showcase-review-section")).toBeVisible();
    await expect(page.getByTestId("showcase-review-grid")).toBeVisible();
    await expect(page.getByTestId("review-card")).toHaveCount(3);
  });

  test("[C-REVIEW-003] 각 review card는 avatar, author, rating, body, date locator를 노출한다", async ({ page }) => {
    // Arrange
    await page.goto("/showcase");
    const firstCard = page.getByTestId("review-card").first();

    // Assert
    await expect(firstCard.getByTestId("review-card-avatar")).toBeVisible();
    await expect(firstCard.getByTestId("review-card-author")).toBeVisible();
    await expect(firstCard.getByTestId("review-card-rating")).toBeVisible();
    await expect(firstCard.getByTestId("review-card-body")).toBeVisible();
    await expect(firstCard.getByTestId("review-card-date")).toBeVisible();
  });
});
