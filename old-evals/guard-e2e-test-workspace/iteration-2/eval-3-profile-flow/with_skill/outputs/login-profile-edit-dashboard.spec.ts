import { test, expect } from "@playwright/test";

// 쿠키 배너가 버튼 클릭을 가로막지 않도록 사전에 동의 처리
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

async function signupAndLogin(
  page: import("@playwright/test").Page,
  name: string,
  email: string
) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill(name);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL("/dashboard");
}

test.describe("[Guard] 로그인 → 프로필 수정 → 저장 → 대시보드 인사말 반영 → 프로필 재진입 데이터 유지 여정", () => {
  test("[JOURNEY-PROFILE-001] 프로필 이름·스킬 수정 후 저장 시 대시보드 인사말에 반영된다", async ({
    page,
  }) => {
    // Arrange: 회원가입 후 대시보드 진입
    const email = `guard-profile-happy-${Date.now()}@example.com`;
    await signupAndLogin(page, "원래이름", email);

    // Step 1: 대시보드 인사말에 원래 이름이 표시된다
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 원래이름님");

    // Step 2: 프로필 페이지 진입
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");
    await expect(page.getByTestId("profile-view")).toBeVisible();

    // Step 3: 프로필 수정 모드 진입
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();

    // Step 4: 이름 수정
    await page.getByTestId("profile-name").clear();
    await page.getByTestId("profile-name").fill("수정된이름");

    // Step 5: 스킬 선택 — 드롭다운 열기
    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();

    // Step 6: JavaScript, TypeScript 선택
    await page.getByTestId("multiselect-option-JavaScript").click();
    await page.getByTestId("multiselect-option-TypeScript").click();

    // Step 7: 드롭다운 닫기 — 이름 입력 필드 클릭으로 dropdown 외부 mousedown 발생
    await page.getByTestId("profile-name").click();
    await expect(page.getByTestId("multiselect-dropdown")).not.toBeVisible();

    // 선택된 스킬 칩이 표시되는지 확인
    await expect(page.getByTestId("multiselect-chip-JavaScript")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-TypeScript")).toBeVisible();

    // Step 8: 저장
    await page.getByTestId("profile-save").click();

    // Step 9: 저장 성공 토스트 표시
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Step 10: 프로필 뷰 모드로 전환 — 수정된 이름 확인
    await expect(page.getByTestId("profile-display-name")).toHaveText("수정된이름");

    // Step 11: 대시보드로 이동하여 인사말이 수정된 이름으로 반영됐는지 확인
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 수정된이름님");
  });

  test("[JOURNEY-PROFILE-001] 프로필 수정 후 재진입해도 변경된 데이터가 유지된다", async ({
    page,
  }) => {
    // Arrange: 회원가입 후 프로필 수정
    const email = `guard-profile-persist-${Date.now()}@example.com`;
    await signupAndLogin(page, "원래이름", email);

    // 프로필 수정
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").clear();
    await page.getByTestId("profile-name").fill("영속이름");
    await page.getByTestId("profile-skills-toggle").click();
    await page.getByTestId("multiselect-option-React").click();
    // 드롭다운 닫기 — 이름 입력 필드 클릭으로 dropdown 외부 mousedown 발생
    await page.getByTestId("profile-name").click();
    await expect(page.getByTestId("multiselect-dropdown")).not.toBeVisible();
    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Act: 다른 페이지로 이동 후 프로필 재진입
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");

    // Assert: 프로필 뷰 모드에서 수정된 이름이 표시된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("영속이름");

    // Assert: 수정 모드 재진입 시 스킬 칩이 유지된다
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-React")).toBeVisible();
  });

  test("[JOURNEY-PROFILE-001] 페이지 새로고침 후 프로필 데이터가 localStorage에서 복원된다", async ({
    page,
  }) => {
    // Arrange: 회원가입 후 프로필 수정 및 저장
    const email = `guard-profile-reload-${Date.now()}@example.com`;
    await signupAndLogin(page, "원래이름", email);

    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").clear();
    await page.getByTestId("profile-name").fill("새로고침이름");
    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Act: 페이지 새로고침
    await page.reload();
    await expect(page).toHaveURL("/profile");

    // Assert: 새로고침 후에도 수정된 이름이 localStorage에서 복원되어 표시된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("새로고침이름");

    // Assert: localStorage의 auth_user에 수정된 이름이 저장되어 있다
    const authUser = await page.evaluate(() => {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    });
    expect(authUser).not.toBeNull();
    expect(authUser.name).toBe("새로고침이름");

    // Assert: 대시보드 인사말도 새로고침 이름을 반영한다
    await page.goto("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 새로고침이름님");
  });

  test("[JOURNEY-PROFILE-001] 프로필 수정 취소 시 원래 이름이 유지되고 대시보드 인사말이 변경되지 않는다", async ({
    page,
  }) => {
    // Arrange: 회원가입 후 프로필 수정 시도
    const email = `guard-profile-cancel-${Date.now()}@example.com`;
    await signupAndLogin(page, "원래이름", email);

    // 대시보드 원래 인사말 확인
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 원래이름님");

    // Act: 프로필에서 이름 수정 후 취소
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").clear();
    await page.getByTestId("profile-name").fill("취소될이름");
    await page.getByTestId("profile-cancel").click();

    // Assert: 뷰 모드로 전환되고 원래 이름이 표시된다 (취소로 인해 변경 없음)
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("원래이름");

    // Assert: 대시보드 인사말도 원래 이름이 유지된다 (취소는 데이터를 변경하지 않는다)
    await page.goto("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 원래이름님");
  });

  test("[JOURNEY-PROFILE-001] 이름 빈칸 저장 시 에러 표시 — 데이터 변경 없이 프로필 폼 유지", async ({
    page,
  }) => {
    // Arrange: 회원가입 후 프로필 수정 시도
    const email = `guard-profile-invalid-${Date.now()}@example.com`;
    await signupAndLogin(page, "원래이름", email);

    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();

    // Act: 이름을 비우고 저장
    await page.getByTestId("profile-name").clear();
    await page.getByTestId("profile-save").click();

    // Assert: 에러 메시지가 표시되고 프로필 폼에 머문다
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByText("이름을 입력해주세요")).toBeVisible();

    // Assert: 저장 성공 토스트가 표시되지 않는다
    await expect(page.getByTestId("profile-saved")).not.toBeVisible();

    // Assert: 대시보드에서 원래 이름이 유지된다
    await page.goto("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 원래이름님");
  });
});
