import { test, expect, type Page } from "@playwright/test";

const seededUser = {
  id: "profile-seed-user",
  email: "profile-seed@example.com",
  name: "테스트 사용자",
  bio: "기존 자기소개",
  skills: ["React", "TypeScript"],
  birthDate: "1995-04-12",
  avatarFileName: "avatar.png",
};

async function openProfileSurface(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem("cookie-consent", "true");
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("auth_login_at", String(Date.now()));
  }, seededUser);

  await page.goto("/profile");
}

test.describe("profile edit hook surface", () => {
  test("[C-PROFILE-001][C-PROFILE-002][C-PROFILE-005] edit 진입 후 cancel하면 기존 view 값으로 복귀한다", async ({
    page,
  }) => {
    // Arrange
    await openProfileSurface(page);

    // Act
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("변경된 이름");
    await page.getByTestId("profile-cancel").click();

    // Assert
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("테스트 사용자");
  });

  test("[C-PROFILE-003][C-PROFILE-005] 이름이 비어 있으면 저장을 막고 validation을 노출한다", async ({ page }) => {
    // Arrange
    await openProfileSurface(page);
    await page.getByTestId("profile-edit-btn").click();

    // Act
    await page.getByTestId("profile-name").fill("");
    await page.getByTestId("profile-save").click();

    // Assert
    await expect(page.getByTestId("profile-name-error")).toBeVisible();
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByTestId("profile-saved")).toHaveCount(0);
  });

  test("[C-PROFILE-004][C-PROFILE-005] 유효한 저장이면 성공 배너와 최신 표시값을 노출한다", async ({ page }) => {
    // Arrange
    await openProfileSurface(page);
    await page.getByTestId("profile-edit-btn").click();

    // Act
    await page.getByTestId("profile-name").fill("새 이름");
    await page.getByTestId("profile-save").click();

    // Assert
    await expect(page.getByTestId("profile-saved")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("새 이름");
  });
});
