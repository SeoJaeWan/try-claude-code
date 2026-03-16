import { test, expect } from "@playwright/test";

const guideUrl = `file:///${process.cwd().replace(/\\/g, "/")}/../../profiles/publisher/personal/v1/guide.html`;

test.describe("publisher profile guide html", () => {
  test("기본 진입 시 summary와 component 규칙 그룹을 볼 수 있다", async ({ page }) => {
    await page.goto(guideUrl);

    await expect(page.getByTestId("publisher-guide-page")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-summary")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-nav")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-command-component")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-group-component-guide")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-group-component-contracts")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-group-component-normalization")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-group-component-validators")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-group-component-render")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-group-component-examples")).toBeVisible();
  });

  test("nav로 uiState section으로 이동해도 read-only affordance만 유지된다", async ({ page }) => {
    await page.goto(guideUrl);

    await page.getByTestId("publisher-guide-nav-item-uiState").click();

    await expect(page).toHaveURL(/#uiState/);
    await expect(page.getByTestId("publisher-guide-command-uiState")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-readonly-badge")).toBeVisible();
    await expect(page.getByTestId("publisher-guide-edit-action")).toHaveCount(0);
    await expect(page.getByTestId("publisher-guide-save-action")).toHaveCount(0);
    await expect(page.getByTestId("publisher-guide-version-action")).toHaveCount(0);
  });
});
