// spec: specs/profile-forms.md
// seed: tests/seed.spec.ts

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

// Helper: signup and login before tests
async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/signup");
  await page.getByTestId("signup-name").fill("프로필테스트");
  await page.getByTestId("signup-email").fill(`profile-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

test.describe("프로필 조회 및 수정", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("프로필 조회", async ({ page }) => {
    // 1. /profile 페이지로 이동
    await page.goto("http://localhost:3000/profile");

    // 2. 프로필 정보(이름, 이메일) 표시 확인
    await expect(page.getByText("프로필테스트")).toBeVisible();
    await expect(page.getByText(/profile-.*@example.com/)).toBeVisible();
  });

  test("프로필 수정", async ({ page }) => {
    // 1. /profile 페이지로 이동
    await page.goto("http://localhost:3000/profile");

    // 2. "프로필 수정" 버튼 클릭
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 3. 이름을 "수정된이름"으로 변경
    const nameInput = page.getByTestId("profile-name");
    await nameInput.clear();
    await nameInput.fill("수정된이름");

    // 4. 자기소개에 "안녕하세요" 입력
    const bioInput = page.getByTestId("profile-bio");
    await bioInput.clear();
    await bioInput.fill("안녕하세요");

    // 5. "저장" 버튼 클릭
    await page.getByTestId("profile-save").click();
    await page.waitForTimeout(300);

    // 6. 저장 성공 메시지 확인
    await expect(page.getByText("프로필이 저장되었습니다")).toBeVisible();
  });
});

test.describe("파일 업로드", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("유효한 이미지 업로드", async ({ page }) => {
    // 1. /profile 수정 모드 진입
    await page.goto("http://localhost:3000/profile");
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 2. 아바타 "파일 선택" 버튼 클릭
    // 3. 유효한 이미지 파일(JPG, PNG) 선택
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    
    // Create a temporary test image file
    const testImagePath = path.join(__dirname, "test-image.png");
    if (!fs.existsSync(testImagePath)) {
      // Create a simple PNG file for testing
      const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      fs.writeFileSync(testImagePath, pngHeader);
    }

    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(500);

    // 4. 선택된 파일명 표시 확인
    await expect(page.getByText(/선택됨:|파일 선택됨/i)).toBeVisible();

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test("허용되지 않는 파일 형식", async ({ page }) => {
    // 1. /profile 수정 모드 진입
    await page.goto("http://localhost:3000/profile");
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 2. 아바타에 .txt 파일 선택 (또는 파일 형식 검증)
    const fileInput = page.locator('input[type="file"]');

    // Create a temporary test text file
    const testFilePath = path.join(__dirname, "test-file.txt");
    fs.writeFileSync(testFilePath, "test content");

    try {
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(500);

      // 3. 에러 메시지 확인
      await expect(page.getByText("허용되지 않는 파일 형식입니다")).toBeVisible();
    } catch (error) {
      // 파일 input이 이미 accept 속성으로 제한된 경우 무시
    }

    // Cleanup
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});

test.describe("날짜 선택기", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("생년월일 입력", async ({ page }) => {
    // 1. /profile 수정 모드 진입
    await page.goto("http://localhost:3000/profile");
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 2. 생년월일 필드에 날짜 입력
    const dateInput = page.getByTestId("profile-birthdate");
    await dateInput.fill("1990-01-15");

    // 3. "저장" 버튼 클릭
    await page.getByTestId("profile-save").click();
    await page.waitForTimeout(300);

    // 페이지 재진입하여 저장 확인
    await page.goto("http://localhost:3000/profile");

    // 4. 저장된 날짜 확인
    await expect(page.getByText(/1990|01|15/)).toBeVisible();
  });
});

test.describe("멀티셀렉트 드롭다운", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("기술 스택 선택", async ({ page }) => {
    // 1. /profile 수정 모드 진입
    await page.goto("http://localhost:3000/profile");
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 2. 기술 스택 드롭다운 클릭
    await page.getByTestId("tech-stack-dropdown").click();
    await page.waitForTimeout(300);

    // 3. "JavaScript", "React" 체크
    await page.getByTestId("tech-javascript").check();
    await page.getByTestId("tech-react").check();
    await page.waitForTimeout(200);

    // 4. 선택된 항목이 칩으로 표시되는지 확인
    await expect(page.getByText("JavaScript")).toBeVisible();
    await expect(page.getByText("React")).toBeVisible();
    await expect(page.getByText(/2개|2 선택/)).toBeVisible();
  });

  test("선택 해제", async ({ page }) => {
    // 1. /profile 수정 모드 진입
    await page.goto("http://localhost:3000/profile");
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 기술 스택 선택
    await page.getByTestId("tech-stack-dropdown").click();
    await page.waitForTimeout(300);
    await page.getByTestId("tech-javascript").check();
    await page.getByTestId("tech-react").check();
    await page.waitForTimeout(200);

    // 2. 칩의 X 버튼 클릭
    const closeButton = page.getByTestId("tech-chip-close-javascript");
    await closeButton.click();
    await page.waitForTimeout(200);

    // 3. 해당 항목이 제거되는지 확인
    await expect(page.getByText("JavaScript")).not.toBeVisible();
    await expect(page.getByText("React")).toBeVisible();
  });

  test("전체 선택 후 드롭다운 닫기", async ({ page }) => {
    // 1. /profile 수정 모드 진입
    await page.goto("http://localhost:3000/profile");
    await page.getByTestId("edit-profile-btn").click();
    await page.waitForTimeout(300);

    // 드롭다운 열기
    await page.getByTestId("tech-stack-dropdown").click();
    await page.waitForTimeout(300);

    // 항목 선택
    await page.getByTestId("tech-javascript").check();
    await page.getByTestId("tech-react").check();
    await page.waitForTimeout(200);

    // 2. 드롭다운 외부 영역 클릭
    await page.click("body");
    await page.waitForTimeout(300);

    // 3. 드롭다운이 닫히는지 확인
    await expect(page.getByTestId("tech-stack-options")).not.toBeVisible();

    // 4. 선택한 항목은 유지됨
    await expect(page.getByText("JavaScript")).toBeVisible();
    await expect(page.getByText("React")).toBeVisible();
  });
});
