import { test, expect } from "@playwright/test";

test.describe("Signup Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("should display all form fields", async ({ page }) => {
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test("should show validation errors when submitting empty form", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign up|submit|register/i }).click();

    await expect(page.getByText(/name.*(required|empty|enter)/i)).toBeVisible();
    await expect(page.getByText(/email.*(required|empty|enter)/i)).toBeVisible();
    await expect(
      page.getByText(/password.*(required|empty|enter)/i)
    ).toBeVisible();
  });

  test("should show error for invalid email format", async ({ page }) => {
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("invalid-email");
    await page.getByLabel(/^password$/i).fill("Password123!");
    await page.getByLabel(/confirm password/i).fill("Password123!");

    await page.getByRole("button", { name: /sign up|submit|register/i }).click();

    await expect(
      page.getByText(/email.*(invalid|valid|format)/i)
    ).toBeVisible();
  });

  test("should show error when passwords do not match", async ({ page }) => {
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("Password123!");
    await page.getByLabel(/confirm password/i).fill("DifferentPass456!");

    await page.getByRole("button", { name: /sign up|submit|register/i }).click();

    await expect(
      page.getByText(/password.*(match|same|identical)/i)
    ).toBeVisible();
  });

  test("should show error for short password", async ({ page }) => {
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("Ab1!");
    await page.getByLabel(/confirm password/i).fill("Ab1!");

    await page.getByRole("button", { name: /sign up|submit|register/i }).click();

    await expect(
      page.getByText(/password.*(short|minimum|least|characters|long)/i)
    ).toBeVisible();
  });

  test("should show error for name with only whitespace", async ({ page }) => {
    await page.getByLabel(/name/i).fill("   ");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("Password123!");
    await page.getByLabel(/confirm password/i).fill("Password123!");

    await page.getByRole("button", { name: /sign up|submit|register/i }).click();

    await expect(
      page.getByText(/name.*(required|empty|enter|valid)/i)
    ).toBeVisible();
  });

  test("should successfully submit with valid data", async ({ page }) => {
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("newuser@example.com");
    await page.getByLabel(/^password$/i).fill("StrongPassword123!");
    await page.getByLabel(/confirm password/i).fill("StrongPassword123!");

    await page.getByRole("button", { name: /sign up|submit|register/i }).click();

    await expect(
      page.getByText(/success|welcome|account created|thank you/i)
    ).toBeVisible();
  });
});
