import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// Helper: Sign up and log in before todo tests
async function signupAndLogin(page) {
  const uniqueEmail = `todo-test-${Date.now()}@example.com`;
  await page.goto(`${BASE_URL}/signup`);
  await page.getByLabel("이름").fill("테스트유저");
  await page.getByLabel("이메일").fill(uniqueEmail);
  await page.getByLabel("비밀번호", { exact: true }).fill("password123");
  await page.getByLabel("비밀번호 확인").fill("password123");
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("할 일 관리 (Todo CRUD)", () => {
  test.beforeEach(async ({ page }) => {
    await signupAndLogin(page);
    await page.goto(`${BASE_URL}/todos`);
  });

  test.describe("1. 할 일 추가", () => {
    test("1.1 유효한 할 일 추가", async ({ page }) => {
      const input = page.getByPlaceholder(/할 일/);
      await input.fill("테스트 할 일 항목");
      await page.getByRole("button", { name: "추가" }).click();

      // Verify the todo appears in the list
      await expect(page.getByText("테스트 할 일 항목")).toBeVisible();
      // Verify the input is cleared
      await expect(input).toHaveValue("");
    });

    test("1.2 빈 입력 유효성 검증", async ({ page }) => {
      await page.getByRole("button", { name: "추가" }).click();

      await expect(page.getByText("할 일을 입력해주세요")).toBeVisible();
    });

    test("1.3 최대 길이 초과", async ({ page }) => {
      const longText = "가".repeat(201);
      const input = page.getByPlaceholder(/할 일/);
      await input.fill(longText);
      await page.getByRole("button", { name: "추가" }).click();

      await expect(
        page.getByText("할 일은 200자 이하여야 합니다")
      ).toBeVisible();
    });
  });

  test.describe("2. 할 일 조회 및 필터", () => {
    test.beforeEach(async ({ page }) => {
      // Add several todos for filter tests
      const todos = ["장보기", "운동하기", "독서"];
      for (const todo of todos) {
        const input = page.getByPlaceholder(/할 일/);
        await input.fill(todo);
        await page.getByRole("button", { name: "추가" }).click();
        await expect(page.getByText(todo)).toBeVisible();
      }
    });

    test("2.1 전체 목록 조회", async ({ page }) => {
      // Click "전체" filter if present
      const allFilter = page.getByRole("button", { name: "전체" });
      if (await allFilter.isVisible()) {
        await allFilter.click();
      }

      await expect(page.getByText("장보기")).toBeVisible();
      await expect(page.getByText("운동하기")).toBeVisible();
      await expect(page.getByText("독서")).toBeVisible();
    });

    test("2.2 검색으로 필터링", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/검색/);
      await searchInput.fill("장보기");

      await expect(page.getByText("장보기")).toBeVisible();
      await expect(page.getByText("운동하기")).not.toBeVisible();
      await expect(page.getByText("독서")).not.toBeVisible();
    });

    test("2.3 검색 결과 없음", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/검색/);
      await searchInput.fill("존재하지않는항목");

      await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
    });
  });

  test.describe("3. 할 일 수정", () => {
    test.beforeEach(async ({ page }) => {
      const input = page.getByPlaceholder(/할 일/);
      await input.fill("원래 할 일");
      await page.getByRole("button", { name: "추가" }).click();
      await expect(page.getByText("원래 할 일")).toBeVisible();
    });

    test("3.1 할 일 텍스트 수정", async ({ page }) => {
      await page.getByRole("button", { name: "수정" }).click();

      const editInput = page.getByRole("textbox").filter({ hasText: "원래 할 일" });
      // Try locating the edit input - it may be an input or textarea in edit mode
      const inputField = page.locator("input[value='원래 할 일'], textarea").first();
      await inputField.clear();
      await inputField.fill("수정된 할 일");
      await page.getByRole("button", { name: "저장" }).click();

      await expect(page.getByText("수정된 할 일")).toBeVisible();
      await expect(page.getByText("원래 할 일")).not.toBeVisible();
    });

    test("3.2 할 일 완료 토글", async ({ page }) => {
      const checkbox = page.getByRole("checkbox").first();
      await checkbox.click();

      // Verify completed state - strikethrough via CSS
      const todoItem = page.getByText("원래 할 일");
      await expect(todoItem).toHaveCSS("text-decoration-line", "line-through");
    });
  });

  test.describe("4. 할 일 삭제", () => {
    test.beforeEach(async ({ page }) => {
      const input = page.getByPlaceholder(/할 일/);
      await input.fill("삭제할 할 일");
      await page.getByRole("button", { name: "추가" }).click();
      await expect(page.getByText("삭제할 할 일")).toBeVisible();
    });

    test("4.1 할 일 삭제", async ({ page }) => {
      page.on("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "삭제" }).click();

      await expect(page.getByText("삭제할 할 일")).not.toBeVisible();
    });

    test("4.2 삭제 취소", async ({ page }) => {
      page.on("dialog", (dialog) => dialog.dismiss());
      await page.getByRole("button", { name: "삭제" }).click();

      await expect(page.getByText("삭제할 할 일")).toBeVisible();
    });
  });

  test.describe("5. 빈 상태", () => {
    test("5.1 할 일 없을 때 빈 상태 UI", async ({ page }) => {
      // Fresh account from beforeEach should have no todos
      await expect(page.getByText("아직 할 일이 없습니다")).toBeVisible();
    });
  });
});
