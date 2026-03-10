import { test, expect } from "@playwright/test";
import path from "path";

const BASE_URL = "http://localhost:3000";

// Helper: Sign up and log in
async function signupAndLogin(page) {
  const uniqueEmail = `profile-test-${Date.now()}@example.com`;
  await page.goto(`${BASE_URL}/signup`);
  await page.getByLabel("이름").fill("테스트유저");
  await page.getByLabel("이메일").fill(uniqueEmail);
  await page.getByLabel("비밀번호", { exact: true }).fill("password123");
  await page.getByLabel("비밀번호 확인").fill("password123");
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForURL("**/dashboard");
  return uniqueEmail;
}

test.describe("프로필 및 복잡한 폼 (Profile Forms)", () => {
  let userEmail: string;

  test.beforeEach(async ({ page }) => {
    userEmail = await signupAndLogin(page);
    await page.goto(`${BASE_URL}/profile`);
  });

  test.describe("1. 프로필 조회 및 수정", () => {
    test("1.1 프로필 조회", async ({ page }) => {
      // Verify profile info is displayed
      await expect(page.getByText("테스트유저")).toBeVisible();
      await expect(page.getByText(userEmail)).toBeVisible();
    });

    test("1.2 프로필 수정", async ({ page }) => {
      await page.getByRole("button", { name: "프로필 수정" }).click();

      // Change name
      const nameInput = page.getByLabel("이름");
      await nameInput.clear();
      await nameInput.fill("수정된이름");

      // Fill bio
      const bioInput = page.getByLabel(/자기소개/);
      await bioInput.fill("안녕하세요");

      // Save
      await page.getByRole("button", { name: "저장" }).click();

      // Verify success message
      await expect(
        page.getByText("프로필이 저장되었습니다")
      ).toBeVisible();

      // Verify updated info
      await expect(page.getByText("수정된이름")).toBeVisible();
      await expect(page.getByText("안녕하세요")).toBeVisible();
    });
  });

  test.describe("2. 파일 업로드", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "프로필 수정" }).click();
    });

    test("2.1 유효한 이미지 업로드", async ({ page }) => {
      const fileInput = page.locator("input[type='file']");

      // Create a fake JPG file buffer
      const buffer = Buffer.from("fake-image-content");
      await fileInput.setInputFiles({
        name: "avatar.jpg",
        mimeType: "image/jpeg",
        buffer,
      });

      // Verify file name is displayed
      await expect(page.getByText(/선택됨.*avatar\.jpg/)).toBeVisible();
    });

    test("2.2 허용되지 않는 파일 형식", async ({ page }) => {
      const fileInput = page.locator("input[type='file']");

      const buffer = Buffer.from("text content");
      await fileInput.setInputFiles({
        name: "document.txt",
        mimeType: "text/plain",
        buffer,
      });

      await expect(
        page.getByText("허용되지 않는 파일 형식입니다")
      ).toBeVisible();
    });
  });

  test.describe("3. 날짜 선택기", () => {
    test("3.1 생년월일 입력", async ({ page }) => {
      await page.getByRole("button", { name: "프로필 수정" }).click();

      const dateInput = page.getByLabel(/생년월일/);
      await dateInput.fill("1990-01-15");

      await page.getByRole("button", { name: "저장" }).click();

      // Verify saved date is displayed
      await expect(page.getByText(/1990/)).toBeVisible();
    });
  });

  test.describe("4. 멀티셀렉트 드롭다운", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "프로필 수정" }).click();
    });

    test("4.1 기술 스택 선택", async ({ page }) => {
      // Open dropdown
      const dropdown = page.getByText(/기술 스택/).or(
        page.locator("[data-testid='tech-stack']")
      );
      await dropdown.click();

      // Select JavaScript and React
      await page.getByRole("option", { name: "JavaScript" }).or(
        page.getByLabel("JavaScript")
      ).click();
      await page.getByRole("option", { name: "React" }).or(
        page.getByLabel("React")
      ).click();

      // Verify chips are displayed
      await expect(page.getByText("JavaScript")).toBeVisible();
      await expect(page.getByText("React")).toBeVisible();
      await expect(page.getByText("2개 선택됨")).toBeVisible();
    });

    test("4.2 선택 해제", async ({ page }) => {
      // Open dropdown and select items first
      const dropdown = page.getByText(/기술 스택/).or(
        page.locator("[data-testid='tech-stack']")
      );
      await dropdown.click();

      await page.getByRole("option", { name: "JavaScript" }).or(
        page.getByLabel("JavaScript")
      ).click();

      // Verify chip appears
      await expect(page.getByText("JavaScript")).toBeVisible();

      // Click X button on chip to deselect
      const chip = page.locator("[data-testid='chip-JavaScript'], .chip:has-text('JavaScript')").or(
        page.getByText("JavaScript").locator("..").getByRole("button")
      );
      await chip.click();

      // Verify removed
      await expect(
        page.locator(".chip:has-text('JavaScript'), [data-testid='chip-JavaScript']").first()
      ).not.toBeVisible();
    });

    test("4.3 전체 선택 후 드롭다운 닫기", async ({ page }) => {
      // Open dropdown
      const dropdown = page.getByText(/기술 스택/).or(
        page.locator("[data-testid='tech-stack']")
      );
      await dropdown.click();

      // Select an item
      await page.getByRole("option", { name: "JavaScript" }).or(
        page.getByLabel("JavaScript")
      ).click();

      // Click outside to close dropdown
      await page.locator("body").click({ position: { x: 10, y: 10 } });

      // Dropdown should be closed but selection maintained
      const dropdownOptions = page.getByRole("option").first();
      await expect(dropdownOptions).not.toBeVisible();

      // Selection should still be visible as chip
      await expect(page.getByText("JavaScript")).toBeVisible();
    });
  });
});
