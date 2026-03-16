// spec: specs/todo-crud.md
// seed: tests/seed.spec.ts

import { test, expect } from "@playwright/test";

// Helper: signup and login before tests
async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/signup");
  await page.getByTestId("signup-name").fill("테스트유저");
  await page.getByTestId("signup-email").fill(`test-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("할 일 추가", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");
  });

  test("유효한 할 일 추가", async ({ page }) => {
    // 1. 할 일 입력란에 "테스트 할 일 항목" 입력
    await page.getByTestId("todo-input").fill("테스트 할 일 항목");

    // 2. "추가" 버튼 클릭
    await page.getByTestId("todo-add").click();

    // 3. 할 일 목록에 "테스트 할 일 항목"이 표시되는지 확인
    await expect(page.getByText("테스트 할 일 항목")).toBeVisible();

    // 4. 입력란이 비워짐을 확인
    await expect(page.getByTestId("todo-input")).toHaveValue("");
  });

  test("빈 입력 유효성 검증", async ({ page }) => {
    // 1. 입력란을 비운 채 "추가" 버튼 클릭
    await page.getByTestId("todo-add").click();

    // 2. 에러 메시지 확인
    await expect(page.getByTestId("todo-input-error")).toBeVisible();
    await expect(page.getByText("할 일을 입력해주세요")).toBeVisible();
  });

  test("최대 길이 초과 검증", async ({ page }) => {
    // 1. 200자 초과 텍스트 입력
    const longText = "a".repeat(201);
    await page.getByTestId("todo-input").fill(longText);

    // 2. "추가" 버튼 클릭
    await page.getByTestId("todo-add").click();

    // 3. 에러 메시지 확인
    await expect(page.getByText("할 일은 200자 이하여야 합니다")).toBeVisible();
  });
});

test.describe("할 일 조회 및 필터", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");

    // 할 일 여러 개 추가
    for (const todo of ["장보기", "운동하기", "독서"]) {
      await page.getByTestId("todo-input").fill(todo);
      await page.getByTestId("todo-add").click();
      await page.waitForTimeout(200);
    }
  });

  test("전체 목록 조회", async ({ page }) => {
    // 1. "전체" 필터 선택 (기본값이면 생략)
    // 2. 모든 할 일이 표시되는지 확인
    await expect(page.getByText("장보기")).toBeVisible();
    await expect(page.getByText("운동하기")).toBeVisible();
    await expect(page.getByText("독서")).toBeVisible();
  });

  test("검색으로 필터링", async ({ page }) => {
    // 1. 검색란에 "장보기" 입력
    await page.getByTestId("todo-search").fill("장보기");
    await page.waitForTimeout(300);

    // 2. 검색 결과 확인
    await expect(page.getByText("장보기")).toBeVisible();
    await expect(page.getByText("운동하기")).not.toBeVisible();
    await expect(page.getByText("독서")).not.toBeVisible();
  });

  test("검색 결과 없음", async ({ page }) => {
    // 1. 검색란에 "존재하지않는항목" 입력
    await page.getByTestId("todo-search").fill("존재하지않는항목");
    await page.waitForTimeout(300);

    // 2. 빈 상태 UI 확인
    await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
  });
});

test.describe("할 일 수정", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");

    // 할 일 추가
    await page.getByTestId("todo-input").fill("원본 할 일");
    await page.getByTestId("todo-add").click();
    await page.waitForTimeout(200);
  });

  test("할 일 텍스트 수정", async ({ page }) => {
    // 1. "수정" 버튼 클릭
    await page.getByTestId("todo-edit").first().click();

    // 2. 텍스트를 "수정된 할 일"로 변경
    const input = page.getByTestId("todo-edit-input").first();
    await input.fill("");
    await input.fill("수정된 할 일");

    // 3. "저장" 버튼 클릭
    await page.getByTestId("todo-save").first().click();
    await page.waitForTimeout(200);

    // 4. 변경된 텍스트 확인
    await expect(page.getByText("수정된 할 일")).toBeVisible();
    await expect(page.getByText("원본 할 일")).not.toBeVisible();
  });

  test("할 일 완료 토글", async ({ page }) => {
    // 1. 체크박스 클릭
    await page.getByTestId("todo-checkbox").first().click();
    await page.waitForTimeout(200);

    // 2. 완료 상태 확인 (취소선)
    const todoItem = page.getByText("원본 할 일").first();
    await expect(todoItem).toHaveClass(/completed|done|line-through/);
  });
});

test.describe("할 일 삭제", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("http://localhost:3000/todos");

    // 할 일 추가
    await page.getByTestId("todo-input").fill("삭제 테스트 항목");
    await page.getByTestId("todo-add").click();
    await page.waitForTimeout(200);
  });

  test("할 일 삭제", async ({ page }) => {
    // 1. "삭제" 버튼 클릭
    await page.getByTestId("todo-delete").first().click();
    await page.waitForTimeout(200);

    // 2. 확인 다이얼로그에서 "예" 클릭
    await page.getByTestId("confirm-delete").click();
    await page.waitForTimeout(200);

    // 3. 목록에서 삭제 확인
    await expect(page.getByText("삭제 테스트 항목")).not.toBeVisible();
  });

  test("삭제 취소", async ({ page }) => {
    // 1. "삭제" 버튼 클릭
    await page.getByTestId("todo-delete").first().click();
    await page.waitForTimeout(200);

    // 2. 확인 다이얼로그에서 "아니오" 클릭
    await page.getByTestId("cancel-delete").click();
    await page.waitForTimeout(200);

    // 3. 할 일이 여전히 목록에 있는지 확인
    await expect(page.getByText("삭제 테스트 항목")).toBeVisible();
  });
});

test.describe("빈 상태", () => {
  test("할 일 없을 때 빈 상태 UI", async ({ page }) => {
    await loginAsTestUser(page);

    // 새 계정이므로 할 일이 없음
    await page.goto("http://localhost:3000/todos");

    // 빈 상태 메시지 확인
    await expect(page.getByText("아직 할 일이 없습니다")).toBeVisible();
  });
});
