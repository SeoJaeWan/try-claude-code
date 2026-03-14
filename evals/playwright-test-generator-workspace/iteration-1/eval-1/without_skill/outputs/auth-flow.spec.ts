import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("인증 흐름 (Auth Flow)", () => {
  test.describe("1. 회원가입", () => {
    test("1.1 유효한 회원가입", async ({ page }) => {
      const uniqueEmail = `signup-valid-${Date.now()}@example.com`;
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel("이름").fill("테스트유저");
      await page.getByLabel("이메일").fill(uniqueEmail);
      await page.getByLabel("비밀번호", { exact: true }).fill("password123");
      await page.getByLabel("비밀번호 확인").fill("password123");
      await page.getByRole("button", { name: "회원가입" }).click();

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("1.2 이메일 형식 오류", async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel("이름").fill("테스트유저");
      await page.getByLabel("이메일").fill("invalid-email");
      await page.getByLabel("비밀번호", { exact: true }).fill("password123");
      await page.getByLabel("비밀번호 확인").fill("password123");
      await page.getByRole("button", { name: "회원가입" }).click();

      await expect(
        page.getByText("올바른 이메일 형식이 아닙니다")
      ).toBeVisible();
    });

    test("1.3 비밀번호 불일치", async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel("이름").fill("테스트유저");
      await page.getByLabel("이메일").fill("mismatch@example.com");
      await page.getByLabel("비밀번호", { exact: true }).fill("password123");
      await page.getByLabel("비밀번호 확인").fill("different456");
      await page.getByRole("button", { name: "회원가입" }).click();

      await expect(
        page.getByText("비밀번호가 일치하지 않습니다")
      ).toBeVisible();
    });

    test("1.4 필수 필드 빈 값", async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.getByRole("button", { name: "회원가입" }).click();

      // Each required field should show an error
      const errorMessages = page.locator("[role='alert'], .error, .text-red-500, .text-destructive");
      await expect(errorMessages.first()).toBeVisible();
    });
  });

  test.describe("2. 로그인", () => {
    const testEmail = `login-test-${Date.now()}@example.com`;
    const testPassword = "password123";

    test.beforeEach(async ({ page }) => {
      // Create account first
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel("이름").fill("테스트유저");
      await page.getByLabel("이메일").fill(testEmail);
      await page.getByLabel("비밀번호", { exact: true }).fill(testPassword);
      await page.getByLabel("비밀번호 확인").fill(testPassword);
      await page.getByRole("button", { name: "회원가입" }).click();
      await page.waitForURL("**/dashboard");
      // Log out to test login
      const logoutBtn = page.getByRole("button", { name: "로그아웃" });
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
      }
    });

    test("2.1 유효한 로그인", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel("이메일").fill(testEmail);
      await page.getByLabel("비밀번호").fill(testPassword);
      await page.getByRole("button", { name: "로그인" }).click();

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("2.2 미등록 이메일", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel("이메일").fill("notexist@example.com");
      await page.getByLabel("비밀번호").fill("password123");
      await page.getByRole("button", { name: "로그인" }).click();

      await expect(
        page.getByText("등록되지 않은 이메일입니다")
      ).toBeVisible();
    });

    test("2.3 비밀번호 오류", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel("이메일").fill(testEmail);
      await page.getByLabel("비밀번호").fill("wrongpassword");
      await page.getByRole("button", { name: "로그인" }).click();

      await expect(
        page.getByText("비밀번호가 일치하지 않습니다")
      ).toBeVisible();
    });
  });

  test.describe("3. 로그아웃", () => {
    test("3.1 로그아웃", async ({ page }) => {
      // Sign up and log in
      const uniqueEmail = `logout-test-${Date.now()}@example.com`;
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel("이름").fill("테스트유저");
      await page.getByLabel("이메일").fill(uniqueEmail);
      await page.getByLabel("비밀번호", { exact: true }).fill("password123");
      await page.getByLabel("비밀번호 확인").fill("password123");
      await page.getByRole("button", { name: "회원가입" }).click();
      await page.waitForURL("**/dashboard");

      // Log out
      await page.getByRole("button", { name: "로그아웃" }).click();

      await expect(page).toHaveURL(/\/login/);
      // Navigation should show login/signup links
      await expect(
        page.getByRole("link", { name: "로그인" })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "회원가입" })
      ).toBeVisible();
    });
  });

  test.describe("4. 인증 보호", () => {
    test("4.1 비인증 접근 차단 - /dashboard", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      await expect(page).toHaveURL(/\/login/);
    });

    test("4.2 비인증 상태에서 /todos 접근", async ({ page }) => {
      await page.goto(`${BASE_URL}/todos`);

      await expect(page).toHaveURL(/\/login/);
    });
  });
});
