// spec: specs/navigation.md
// seed: tests/seed.spec.ts

import { test, expect } from "@playwright/test";

// Helper: signup and login before tests
async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/signup");
  await page.getByTestId("signup-name").fill("네비게이션테스트");
  await page.getByTestId("signup-email").fill(`nav-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("클라이언트 사이드 라우팅", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("네비게이션 바 링크 전환", async ({ page }) => {
    // 1. /dashboard 페이지에서 시작
    await page.goto("http://localhost:3000/dashboard");

    // 2. "할 일" 네비게이션 링크 클릭
    await page.getByTestId("nav-todos").click();

    // 3. URL이 /todos로 변경되는지 확인
    await expect(page).toHaveURL("**/todos");

    // 4. "프로필" 네비게이션 링크 클릭
    await page.getByTestId("nav-profile").click();

    // 5. URL이 /profile로 변경되는지 확인
    await expect(page).toHaveURL("**/profile");
  });

  test("브라우저 뒤로가기", async ({ page }) => {
    // 1. /dashboard → /todos → /profile 순서로 이동
    await page.goto("http://localhost:3000/dashboard");
    await page.getByTestId("nav-todos").click();
    await expect(page).toHaveURL("**/todos");

    await page.getByTestId("nav-profile").click();
    await expect(page).toHaveURL("**/profile");

    // 2. 브라우저 뒤로가기 버튼 클릭
    await page.goBack();

    // 3. /todos 페이지인지 확인
    await expect(page).toHaveURL("**/todos");

    // 4. 다시 뒤로가기 클릭
    await page.goBack();

    // 5. /dashboard 페이지인지 확인
    await expect(page).toHaveURL("**/dashboard");
  });

  test("직접 URL 접근 (딥링크)", async ({ page }) => {
    // 1. 브라우저에서 직접 http://localhost:3000/todos 입력
    await page.goto("http://localhost:3000/todos");

    // 2. 페이지가 정상 렌더링되는지 확인
    await expect(page).toHaveURL("**/todos");
    await expect(page.getByTestId("nav-todos")).toBeVisible();
  });
});

test.describe("반응형 네비게이션", () => {
  test("모바일 햄버거 메뉴", async ({ page }) => {
    await loginAsTestUser(page);

    // 1. 뷰포트를 모바일 크기(375px)로 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. 햄버거 메뉴 버튼 클릭
    await page.getByTestId("hamburger-menu").click();
    await page.waitForTimeout(300);

    // 3. 모바일 메뉴 표시 확인
    await expect(page.getByTestId("mobile-menu")).toBeVisible();

    // 4. "할 일" 링크 클릭
    await page.getByTestId("mobile-nav-todos").click();

    // 5. 메뉴 닫힘 및 페이지 이동 확인
    await expect(page).toHaveURL("**/todos");
    await expect(page.getByTestId("mobile-menu")).not.toBeVisible();
  });
});

test.describe("브레드크럼", () => {
  test("브레드크럼 표시", async ({ page }) => {
    await loginAsTestUser(page);

    // 1. /dashboard 페이지로 이동
    await page.goto("http://localhost:3000/dashboard");

    // 2. 브레드크럼에 "홈 / 대시보드" 표시 확인
    await expect(page.getByTestId("breadcrumb")).toContainText("홈");
    await expect(page.getByTestId("breadcrumb")).toContainText("대시보드");

    // 3. /todos 페이지로 이동
    await page.getByTestId("nav-todos").click();

    // 4. 브레드크럼에 "홈 / 할 일" 표시 확인
    await expect(page.getByTestId("breadcrumb")).toContainText("홈");
    await expect(page.getByTestId("breadcrumb")).toContainText("할 일");
  });
});
