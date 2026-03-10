// spec: specs/auth-flow.md
// seed: seed.spec.ts

import { test, expect } from "@playwright/test";

// Pre-accept cookie consent to prevent the cookie banner overlay from blocking interactions
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

test.describe("로그인", () => {
  test("유효한 로그인", async ({ page }) => {
    // First signup
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill("logintest@example.com");
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await page.waitForURL("**/dashboard");

    // Logout
    await page.getByTestId("nav-logout").click();
    await page.waitForURL("**/login");

    // Login
    await page.getByTestId("login-email").fill("logintest@example.com");
    await page.getByTestId("login-password").fill("password123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 테스트유저님");
  });

  test("미등록 이메일 에러", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("notexist@example.com");
    await page.getByTestId("login-password").fill("password123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });

  test("비밀번호 8자 미만 검증", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("test@example.com");
    await page.getByTestId("login-password").fill("short");
    await page.getByTestId("login-submit").click();

    await expect(page.getByText("비밀번호는 8자 이상이어야 합니다")).toBeVisible();
  });
});
