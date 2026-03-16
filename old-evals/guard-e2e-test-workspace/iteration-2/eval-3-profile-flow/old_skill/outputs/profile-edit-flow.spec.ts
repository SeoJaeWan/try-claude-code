import { test, expect } from "@playwright/test";

// 쿠키 배너가 버튼 클릭을 가로막지 않도록 사전에 동의 처리
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

// 공통 헬퍼: 회원가입 → 대시보드 진입
async function signupAndGoToDashboard(page: import("@playwright/test").Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill(name);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL("/dashboard");
}

test.describe("[Guard] 로그인 → 프로필 수정 → 대시보드 반영 → 데이터 유지 여정", () => {
  test("[JOURNEY-PROFILE-001] 로그인 후 이름·스킬 수정 저장 시 대시보드 인사말에 즉시 반영된다", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `guard-profile-happy-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "원래이름", email);

    // 대시보드 인사말이 원래 이름을 표시하는지 확인
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 원래이름님");

    // Step 1: 프로필 페이지 진입
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("원래이름");

    // Step 2: 프로필 수정 모드 진입
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();

    // Step 3: 이름 변경
    await page.getByTestId("profile-name").fill("수정된이름");

    // Step 4: 스킬 선택 — MultiSelect 드롭다운 열기
    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-TypeScript").click();
    await page.getByTestId("multiselect-option-React").click();
    // 드롭다운 외부 클릭으로 닫기
    await page.getByTestId("profile-name").click();

    // Step 5: 저장
    await page.getByTestId("profile-save").click();

    // Assert: 저장 성공 메시지 표시
    await expect(page.getByTestId("profile-saved")).toBeVisible();
    await expect(page.getByTestId("profile-saved")).toContainText("프로필이 저장되었습니다");

    // Assert: view 모드로 전환되고 변경된 이름 표시
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("수정된이름");

    // Step 6: 대시보드로 이동 → 인사말에 새 이름 반영 확인
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 수정된이름님");
  });

  test("[JOURNEY-PROFILE-001] 프로필 수정 저장 후 프로필 재진입 시 변경 데이터가 유지된다", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `guard-profile-persist-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "초기이름", email);

    // Step 1: 프로필 수정
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("저장후확인이름");

    // 스킬 선택
    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-JavaScript").click();
    await page.getByTestId("multiselect-option-Next.js").click();
    await page.getByTestId("profile-name").click(); // 드롭다운 닫기

    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Step 2: 대시보드를 거쳐 프로필 재진입
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");

    // Assert: 수정한 이름이 유지된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("저장후확인이름");

    // Assert: 선택한 스킬 칩이 수정 모드에서 유지된다
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-JavaScript")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-Next.js")).toBeVisible();
  });

  test("[JOURNEY-PROFILE-001] 프로필 수정 후 페이지 새로고침 시 변경 데이터가 유지된다", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `guard-profile-reload-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "새로고침전이름", email);

    // Step 1: 프로필 수정
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("새로고침후이름");

    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-Go").click();
    await page.getByTestId("profile-name").click();

    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Step 2: 페이지 새로고침
    await page.reload();
    await expect(page).toHaveURL("/profile");

    // Assert: 새로고침 후 변경된 이름이 유지된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("새로고침후이름");

    // Step 3: 대시보드 새로고침 후 인사말도 새 이름 반영
    await page.goto("/dashboard");
    await page.reload();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 새로고침후이름님");
  });

  test("[JOURNEY-PROFILE-001] 프로필 수정 취소 시 이름·스킬 변경이 반영되지 않는다 (데이터 불변 분기)", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `guard-profile-cancel-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "취소전이름", email);

    // Step 1: 프로필 수정 모드 진입 후 변경
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("절대저장안됨");

    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-Rust").click();
    await page.getByTestId("profile-name").click();

    // Step 2: 저장하지 않고 취소
    await page.getByTestId("profile-cancel").click();

    // Assert: view 모드로 전환되고 원래 이름이 표시된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("취소전이름");

    // Assert: 대시보드 인사말도 원래 이름 그대로
    await page.goto("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 취소전이름님");
  });

  test("[JOURNEY-PROFILE-001] 비인증 상태에서 프로필 페이지 직접 접근 시 로그인 페이지로 리다이렉트된다", async ({
    page,
  }) => {
    // Arrange: 로그인하지 않은 상태 (initScript로 cookie-consent만 설정됨)

    // Act: 보호된 프로필 라우트에 직접 접근
    await page.goto("/profile");

    // Assert: 로그인 페이지로 리다이렉트
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-PROFILE-001] 이름 비워두고 저장 시 에러가 표시되고 원래 이름이 유지된다", async ({
    page,
  }) => {
    // Branch flow: 빈 이름으로 저장 시도 — 유효성 오류가 발생하고 데이터가 변경되지 않는다
    const email = `guard-profile-validation-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "유효성검사이름", email);

    // Step 1: 프로필 수정 모드 진입
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();

    // Step 2: 이름을 비워두고 저장 시도
    await page.getByTestId("profile-name").fill("");
    await page.getByTestId("profile-save").click();

    // Assert: 에러 메시지가 표시되고 수정 모드가 유지된다
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "이름을 입력해주세요" })).toBeVisible();

    // Assert: 프로필 저장 성공 메시지가 나타나지 않는다
    await expect(page.getByTestId("profile-saved")).not.toBeVisible();
  });
});
