import { test, expect } from "@playwright/test";

// This is a seed file that serves as a template for generated tests.
// The generator skill references this file to understand the base test structure.

test.describe("Seed Template", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("example test", async ({ page }) => {
    await expect(page).toHaveTitle(/TestApp/);
  });
});
