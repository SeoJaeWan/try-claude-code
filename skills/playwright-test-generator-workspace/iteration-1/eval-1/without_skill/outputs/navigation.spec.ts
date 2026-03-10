import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// Helper: Sign up and log in
async function signupAndLogin(page) {
  const uniqueEmail = `nav-test-${Date.now()}@example.com`;
  await page.goto(`${BASE_URL}/signup`);
  await page.getByLabel("이름").fill("테스트유저");
  await page.getByLabel("이메일").fill(uniqueEmail);
  await page.getByLabel("비밀번호", { exact: true }).fill("password123");
  await page.getByLabel("비밀번호 확인").fill("password123");
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("네비게이션 (Navigation)", () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page);
  });

  test.describe("1. 클라이언트 사이드 라우팅", () => {
    test("1.1 네비게이션 바 링크 전환", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Click "할 일" nav link
      await page.getByRole("link", { name: "할 일" }).click();
      await expect(page).toHaveURL(/\/todos/);

      // Click "프로필" nav link
      await page.getByRole("link", { name: "프로필" }).click();
      await expect(page).toHaveURL(/\/profile/);
    });

    test("1.2 브라우저 뒤로가기", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.getByRole("link", { name: "할 일" }).click();
      await page.waitForURL("**/todos");
      await page.getByRole("link", { name: "프로필" }).click();
      await page.waitForURL("**/profile");

      // Go back to /todos
      await page.goBack();
      await expect(page).toHaveURL(/\/todos/);

      // Go back to /dashboard
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("1.3 직접 URL 접근 (딥링크)", async ({ page }) => {
      await page.goto(`${BASE_URL}/todos`);

      await expect(page).toHaveURL(/\/todos/);
      // Page should render correctly - check for a known element on the todos page
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("2. 반응형 네비게이션", () => {
    test("2.1 모바일 햄버거 메뉴", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/dashboard`);

      // Click hamburger menu button
      const hamburger = page.getByRole("button", { name: /메뉴|menu/i }).or(
        page.locator("[aria-label*='메뉴'], [aria-label*='menu'], button.hamburger, [data-testid='hamburger']")
      );
      await hamburger.click();

      // Mobile menu should be visible
      const todoLink = page.getByRole("link", { name: "할 일" });
      await expect(todoLink).toBeVisible();

      // Click link - menu should close and navigate
      await todoLink.click();
      await expect(page).toHaveURL(/\/todos/);
    });
  });

  test.describe("3. 브레드크럼", () => {
    test("3.1 브레드크럼 표시", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page.getByText("홈")).toBeVisible();
      await expect(page.getByText("대시보드")).toBeVisible();

      await page.goto(`${BASE_URL}/todos`);
      await expect(page.getByText("홈")).toBeVisible();
      await expect(page.getByText("할 일")).toBeVisible();
    });
  });
});
