// spec: features/next-app/specs/auth-flow.md
// seed: features/next-app/tests/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("회원가입 폼 테스트 - 유효성 검증", () => {
  test("유효한 회원가입", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 이름: "테스트사용자" 입력
    await page.getByTestId("signup-name").fill("테스트사용자");

    // 3. 이메일: "test@example.com" 입력
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.getByTestId("signup-email").fill(uniqueEmail);

    // 4. 비밀번호: "password123" 입력
    await page.getByTestId("signup-password").fill("password123");

    // 5. 비밀번호 확인: "password123" 입력
    await page.getByTestId("signup-confirm-password").fill("password123");

    // 6. "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 7. 회원가입 성공 후 /dashboard로 리다이렉트 확인
    await expect(page).toHaveURL("**/dashboard");
  });

  test("이메일 형식 오류", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 이름: "테스트사용자" 입력
    await page.getByTestId("signup-name").fill("테스트사용자");

    // 3. 이메일: "invalid-email" 입력
    await page.getByTestId("signup-email").fill("invalid-email");

    // 4. 비밀번호: "password123" 입력
    await page.getByTestId("signup-password").fill("password123");

    // 5. 비밀번호 확인: "password123" 입력
    await page.getByTestId("signup-confirm-password").fill("password123");

    // 6. "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 7. 이메일 형식 오류 메시지 확인
    await expect(page.getByText("올바른 이메일 형식이 아닙니다")).toBeVisible();
  });

  test("비밀번호 불일치", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 이름: "테스트사용자" 입력
    await page.getByTestId("signup-name").fill("테스트사용자");

    // 3. 이메일: "test2@example.com" 입력
    const uniqueEmail = `test2-${Date.now()}@example.com`;
    await page.getByTestId("signup-email").fill(uniqueEmail);

    // 4. 비밀번호: "password123" 입력
    await page.getByTestId("signup-password").fill("password123");

    // 5. 비밀번호 확인: "different456" 입력
    await page.getByTestId("signup-confirm-password").fill("different456");

    // 6. "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 7. 비밀번호 불일치 에러 메시지 확인
    await expect(page.getByText("비밀번호가 일치하지 않습니다")).toBeVisible();
  });

  test("필수 필드 빈 값", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 모든 필드를 비운 채 "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 3. 필수 필드 에러 메시지 확인
    await expect(page.getByText(/필수|필수 필드|입력해주세요/)).toBeVisible();
  });
});
