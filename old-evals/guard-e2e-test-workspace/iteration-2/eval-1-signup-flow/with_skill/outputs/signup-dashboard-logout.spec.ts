import { test, expect } from "@playwright/test";

// 쿠키 배너가 상호작용을 가로막지 않도록 사전에 동의 처리
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

test.describe("[Guard] 회원가입 → 대시보드 → 로그아웃 여정", () => {
  // 테스트마다 고유한 이메일 사용 (auth_users 충돌 방지)
  const testEmail = () =>
    `guard-signup-${Date.now()}@example.com`;

  test("[JOURNEY-AUTH-001] 회원가입부터 로그아웃까지 전체 플로우가 정상 동작한다", async ({
    page,
  }) => {
    const email = testEmail();

    // Step 1: 회원가입 페이지 진입 및 폼 제출
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();

    // Step 2: 회원가입 성공 → 대시보드로 리다이렉트
    await expect(page).toHaveURL("/dashboard");

    // Step 3: 대시보드에 사용자 이름 표시 확인
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 테스트유저님");

    // Step 4: 내비게이션에 로그아웃 버튼 노출 확인
    await expect(page.getByTestId("nav-logout")).toBeVisible();

    // Step 5: 로그아웃
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Step 6: 로그아웃 후 대시보드 재접근 시 로그인 페이지로 리다이렉트
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-AUTH-001] 로그인 상태가 페이지 새로고침 후에도 유지된다", async ({
    page,
  }) => {
    const email = testEmail();

    // Arrange: 회원가입으로 로그인 상태 만들기
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // Act: 페이지 새로고침
    await page.reload();

    // Assert: 대시보드에 그대로 머물고 로그인 상태가 유지됨
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 테스트유저님");
    await expect(page.getByTestId("nav-logout")).toBeVisible();
  });

  test("[JOURNEY-AUTH-001] 로그아웃 시 클라이언트 세션 상태가 완전히 제거된다", async ({
    page,
  }) => {
    const email = testEmail();

    // Arrange: 회원가입 후 로그인 상태 확인
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // 로그인 후 auth 관련 localStorage 키가 존재하는지 확인
    const authUserBefore = await page.evaluate(() =>
      localStorage.getItem("auth_user")
    );
    expect(authUserBefore).not.toBeNull();

    const authLoginAtBefore = await page.evaluate(() =>
      localStorage.getItem("auth_login_at")
    );
    expect(authLoginAtBefore).not.toBeNull();

    // Act: 로그아웃
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Assert: auth 관련 localStorage 항목이 제거됨
    // 단순 리다이렉트만으로는 세션 파기를 보장할 수 없으므로 스토리지 직접 검증
    const authUserAfter = await page.evaluate(() =>
      localStorage.getItem("auth_user")
    );
    expect(authUserAfter).toBeNull();

    const authLoginAtAfter = await page.evaluate(() =>
      localStorage.getItem("auth_login_at")
    );
    expect(authLoginAtAfter).toBeNull();
  });

  test("[JOURNEY-AUTH-001] 인증 없이 대시보드 접근 시 로그인 페이지로 리다이렉트된다", async ({
    page,
  }) => {
    // Arrange: 로그인하지 않은 상태 (localStorage에 auth 없음)
    // Act: 대시보드 직접 접근
    await page.goto("/dashboard");

    // Assert: 로그인 페이지로 리다이렉트
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-AUTH-001] 이미 가입된 이메일로 재가입 시 에러가 표시된다", async ({
    page,
  }) => {
    const email = testEmail();

    // Arrange: 첫 번째 회원가입 완료
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("테스트유저");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // 로그아웃
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Act: 동일 이메일로 재가입 시도
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("다른유저");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();

    // Assert: 에러 메시지 표시, 페이지 이동 없음
    await expect(page.getByTestId("signup-error")).toBeVisible();
    await expect(page).toHaveURL("/signup");
  });
});
