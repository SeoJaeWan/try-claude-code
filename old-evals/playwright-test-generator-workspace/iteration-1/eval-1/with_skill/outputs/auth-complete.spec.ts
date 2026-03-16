// spec: specs/auth-flow.md
// seed: tests/seed.spec.ts

import { test, expect } from "@playwright/test";

test.describe("회원가입", () => {
  test("유효한 회원가입", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 이름: "테스트유저" 입력
    await page.getByTestId("signup-name").fill("테스트유저");

    // 3. 이메일: "test@example.com" 입력
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.getByTestId("signup-email").fill(uniqueEmail);

    // 4. 비밀번호: "password123" 입력
    await page.getByTestId("signup-password").fill("password123");

    // 5. 비밀번호 확인: "password123" 입력
    await page.getByTestId("signup-confirm-password").fill("password123");

    // 6. "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 회원가입 성공 후 /dashboard로 리다이렉트 확인
    await expect(page).toHaveURL("**/dashboard");
  });

  test("이메일 형식 오류", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 이메일: "invalid-email" 입력
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill("invalid-email");
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");

    // 3. "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 에러 메시지 표시 확인
    await expect(page.getByText("올바른 이메일 형식이 아닙니다")).toBeVisible();
  });

  test("비밀번호 불일치", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2-3. 비밀번호와 확인 비밀번호가 다르게 입력
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill(`test-${Date.now()}@example.com`);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("different456");

    // 4. "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 에러 메시지 표시 확인
    await expect(page.getByText("비밀번호가 일치하지 않습니다")).toBeVisible();
  });

  test("필수 필드 빈 값", async ({ page }) => {
    // 1. /signup 페이지로 이동
    await page.goto("http://localhost:3000/signup");

    // 2. 모든 필드를 비운 채 "회원가입" 버튼 클릭
    await page.getByTestId("signup-submit").click();

    // 각 필드에 대한 에러 메시지 표시 확인
    await expect(page.getByText(/필수|필수 필드|입력해주세요/)).toBeVisible();
  });
});

test.describe("로그인", () => {
  test("유효한 로그인", async ({ page }) => {
    const uniqueEmail = `login-test-${Date.now()}@example.com`;

    // 1. 먼저 회원가입으로 계정 생성
    await page.goto("http://localhost:3000/signup");
    await page.getByTestId("signup-name").fill("로그인테스트");
    await page.getByTestId("signup-email").fill(uniqueEmail);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await page.waitForURL("**/dashboard");

    // 로그아웃
    await page.getByTestId("nav-logout").click();
    await page.waitForURL("**/login");

    // 2. /login 페이지로 이동
    // 3. 등록한 이메일과 비밀번호 입력
    await page.getByTestId("login-email").fill(uniqueEmail);
    await page.getByTestId("login-password").fill("password123");

    // 4. "로그인" 버튼 클릭
    await page.getByTestId("login-submit").click();

    // 로그인 성공 후 /dashboard로 리다이렉트 확인
    await expect(page).toHaveURL("**/dashboard");
  });

  test("미등록 이메일", async ({ page }) => {
    // 1. /login 페이지로 이동
    await page.goto("http://localhost:3000/login");

    // 2. 이메일: "notexist@example.com" 입력
    // 3. 비밀번호: "password123" 입력
    await page.getByTestId("login-email").fill("notexist@example.com");
    await page.getByTestId("login-password").fill("password123");

    // 4. "로그인" 버튼 클릭
    await page.getByTestId("login-submit").click();

    // "등록되지 않은 이메일입니다" 에러 메시지 표시 확인
    await expect(page.getByText("등록되지 않은 이메일입니다")).toBeVisible();
  });

  test("비밀번호 오류", async ({ page }) => {
    const uniqueEmail = `pwd-test-${Date.now()}@example.com`;

    // 1. 먼저 회원가입으로 계정 생성
    await page.goto("http://localhost:3000/signup");
    await page.getByTestId("signup-name").fill("비밀번호테스트");
    await page.getByTestId("signup-email").fill(uniqueEmail);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await page.waitForURL("**/dashboard");

    // 로그아웃
    await page.getByTestId("nav-logout").click();
    await page.waitForURL("**/login");

    // 2. /login 페이지로 이동
    // 3. 등록한 이메일 입력
    await page.getByTestId("login-email").fill(uniqueEmail);

    // 4. 잘못된 비밀번호 입력
    await page.getByTestId("login-password").fill("wrongpassword");

    // 5. "로그인" 버튼 클릭
    await page.getByTestId("login-submit").click();

    // "비밀번호가 일치하지 않습니다" 에러 메시지 표시 확인
    await expect(page.getByText("비밀번호가 일치하지 않습니다")).toBeVisible();
  });
});

test.describe("로그아웃", () => {
  test("로그아웃", async ({ page }) => {
    const uniqueEmail = `logout-test-${Date.now()}@example.com`;

    // 먼저 로그인
    await page.goto("http://localhost:3000/signup");
    await page.getByTestId("signup-name").fill("로그아웃테스트");
    await page.getByTestId("signup-email").fill(uniqueEmail);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await page.waitForURL("**/dashboard");

    // 1. 로그인 상태에서 "로그아웃" 버튼 클릭
    await page.getByTestId("nav-logout").click();

    // 2-3. 리다이렉트 확인 및 네비게이션 확인
    await expect(page).toHaveURL("**/login");
    await expect(page.getByText(/로그인|회원가입/)).toBeVisible();
  });
});

test.describe("인증 보호", () => {
  test("비인증 접근 차단 - /dashboard", async ({ page }) => {
    // 1. 로그아웃 상태에서 /dashboard 직접 접근
    await page.goto("http://localhost:3000/dashboard");

    // 2. /login 페이지로 리다이렉트 확인
    await expect(page).toHaveURL("**/login");
  });

  test("비인증 접근 차단 - /todos", async ({ page }) => {
    // 1. 로그아웃 상태에서 /todos 직접 접근
    await page.goto("http://localhost:3000/todos");

    // 2. /login 페이지로 리다이렉트 확인
    await expect(page).toHaveURL("**/login");
  });
});
