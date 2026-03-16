import { test, expect } from "@playwright/test";

// 쿠키 배너가 버튼 클릭을 가로막지 않도록 사전에 동의 처리
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

// 공통 헬퍼: 회원가입 → 대시보드 진입
async function signupAndGoToDashboard(
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

test.describe("[Guard] 로그인 → 프로필 수정 (이름·스킬) → 저장 → 대시보드 인사말 반영 → 프로필 재진입 데이터 유지 여정", () => {
  test("[JOURNEY-PROFILE-002] 이름·스킬 수정 저장 후 대시보드 인사말에 새 이름이 즉시 반영된다 (happy flow)", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성 후 대시보드 확인
    const email = `journey-profile-happy-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "원래이름", email);

    // 대시보드 인사말에 원래 이름이 표시됨을 확인
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 원래이름님");

    // Step 1: 프로필 페이지 진입
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("원래이름");

    // Step 2: 프로필 수정 모드 진입
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();

    // Step 3: 이름 수정
    await page.getByTestId("profile-name").fill("수정된이름");

    // Step 4: 스킬 선택 — MultiSelect 드롭다운 열기
    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();

    // Step 5: TypeScript, React 선택
    await page.getByTestId("multiselect-option-TypeScript").click();
    await page.getByTestId("multiselect-option-React").click();

    // Step 6: 이름 필드 클릭으로 드롭다운 닫기
    await page.getByTestId("profile-name").click();
    await expect(page.getByTestId("multiselect-dropdown")).not.toBeVisible();

    // 선택된 스킬 칩 확인
    await expect(page.getByTestId("multiselect-chip-TypeScript")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-React")).toBeVisible();

    // Step 7: 저장
    await page.getByTestId("profile-save").click();

    // Assert: 저장 성공 메시지 표시
    await expect(page.getByTestId("profile-saved")).toBeVisible();
    await expect(page.getByTestId("profile-saved")).toContainText("프로필이 저장되었습니다");

    // Assert: 뷰 모드로 전환되고 수정된 이름 표시
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("수정된이름");

    // Step 8: 대시보드로 이동 → 인사말에 새 이름 반영 확인
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 수정된이름님");
  });

  test("[JOURNEY-PROFILE-002] 프로필 수정 저장 후 대시보드 경유 재진입 시 이름·스킬이 유지된다 (상태 유지 검증)", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `journey-profile-persist-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "초기이름", email);

    // Step 1: 프로필 수정 (이름 + 스킬)
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("영속이름");

    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-JavaScript").click();
    await page.getByTestId("multiselect-option-Next.js").click();
    await page.getByTestId("profile-name").click(); // 드롭다운 닫기

    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Step 2: 대시보드 경유 후 프로필 재진입
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    // 대시보드에서 수정된 이름이 인사말에 반영됐는지 확인
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 영속이름님");

    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");

    // Assert: 뷰 모드에서 수정된 이름이 유지된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("영속이름");

    // Assert: 수정 모드 재진입 시 선택한 스킬 칩이 유지된다
    await page.getByTestId("profile-edit-btn").click();
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-JavaScript")).toBeVisible();
    await expect(page.getByTestId("multiselect-chip-Next.js")).toBeVisible();
  });

  test("[JOURNEY-PROFILE-002] 프로필 수정 후 페이지 새로고침 시 변경 데이터가 localStorage에서 복원된다 (상태 유지 검증)", async ({
    page,
  }) => {
    // Arrange: 회원가입 후 프로필 수정 및 저장
    const email = `journey-profile-reload-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "새로고침전이름", email);

    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("새로고침후이름");

    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-Go").click();
    await page.getByTestId("profile-name").click(); // 드롭다운 닫기

    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-saved")).toBeVisible();

    // Act: 프로필 페이지 새로고침
    await page.reload();
    await expect(page).toHaveURL("/profile");

    // Assert: 새로고침 후 수정된 이름이 뷰 모드에서 유지된다
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("새로고침후이름");

    // Assert: localStorage의 auth_user에 수정된 이름이 저장되어 있다
    const authUser = await page.evaluate(() => {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    });
    expect(authUser).not.toBeNull();
    expect(authUser.name).toBe("새로고침후이름");

    // Assert: 대시보드 새로고침 후에도 인사말이 수정된 이름을 반영한다
    await page.goto("/dashboard");
    await page.reload();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 새로고침후이름님");
  });

  test("[JOURNEY-PROFILE-002] 프로필 수정 취소 시 이름·스킬이 변경되지 않고 대시보드 인사말도 그대로다 (데이터 불변 분기)", async ({
    page,
  }) => {
    // 데이터 불변 분기: 수정 후 저장하지 않고 취소 → 상태 변화 없음을 검증
    // 해피 플로우의 역: "저장" 없이 "취소"하면 상태가 불변해야 한다
    const email = `journey-profile-cancel-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "취소전이름", email);

    // 대시보드 원래 인사말 확인
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 취소전이름님");

    // Step 1: 프로필 수정 모드에서 이름·스킬 변경 후 취소
    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();
    await page.getByTestId("profile-name").fill("절대저장안됨");

    await page.getByTestId("profile-skills-toggle").click();
    await expect(page.getByTestId("multiselect-dropdown")).toBeVisible();
    await page.getByTestId("multiselect-option-Rust").click();
    await page.getByTestId("profile-name").click(); // 드롭다운 닫기

    // 저장하지 않고 취소
    await page.getByTestId("profile-cancel").click();

    // Assert: 뷰 모드로 전환되고 원래 이름이 표시된다 (취소 → 변경 없음)
    await expect(page.getByTestId("profile-view")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toHaveText("취소전이름");

    // Assert: 대시보드 인사말도 원래 이름 그대로 (취소는 상태를 바꾸지 않는다)
    await page.goto("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 취소전이름님");
  });

  test("[JOURNEY-PROFILE-002] 비인증 상태에서 /profile 직접 접근 시 /login으로 리다이렉트된다 (분기 플로우)", async ({
    page,
  }) => {
    // Branch flow: 로그인하지 않은 상태에서 보호된 라우트 직접 접근
    await page.goto("/profile");
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-PROFILE-002] 이름 비워두고 저장 시 에러가 표시되고 데이터·인사말이 변경되지 않는다 (유효성 오류 분기)", async ({
    page,
  }) => {
    // Branch flow: 유효성 오류 시 상태 불변 검증
    // 저장을 시도해도 유효하지 않으면 데이터가 변경되지 않는다
    const email = `journey-profile-validation-${Date.now()}@example.com`;
    await signupAndGoToDashboard(page, "유효성검사이름", email);

    await page.goto("/profile");
    await page.getByTestId("profile-edit-btn").click();

    // Act: 이름을 비워두고 저장 시도
    await page.getByTestId("profile-name").fill("");
    await page.getByTestId("profile-save").click();

    // Assert: 에러 메시지가 표시되고 수정 모드가 유지된다
    await expect(page.getByTestId("profile-form")).toBeVisible();
    await expect(page.getByText("이름을 입력해주세요")).toBeVisible();

    // Assert: 저장 성공 메시지가 나타나지 않는다
    await expect(page.getByTestId("profile-saved")).not.toBeVisible();

    // Assert: 대시보드 인사말은 원래 이름이 유지된다
    await page.goto("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 유효성검사이름님");
  });
});
