import { test, expect } from "@playwright/test";

// 쿠키 배너가 버튼 클릭을 가로막지 않도록 사전에 동의 처리
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

test.describe("[Guard] 회원가입 → 대시보드 → 로그아웃 여정", () => {
  test("[JOURNEY-AUTH-001] 회원가입부터 로그아웃까지 전체 플로우가 정상 동작한다", async ({
    page,
  }) => {
    // Arrange: 테스트 고유 이메일 (auth_users 충돌 방지)
    const email = `guard-happy-${Date.now()}@example.com`;

    // Step 1: 회원가입 페이지 진입 및 폼 제출
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("가드테스터");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();

    // Step 2: 회원가입 성공 → 대시보드로 리다이렉트
    await expect(page).toHaveURL("/dashboard");

    // Step 3: 대시보드에 사용자 이름이 표시된다
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 가드테스터님");

    // Step 4: 내비게이션 바에 로그아웃 버튼이 보인다
    await expect(page.getByTestId("nav-logout")).toBeVisible();

    // Step 5: 로그아웃
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Step 6: 로그아웃 후 대시보드 재접근 시 로그인 페이지로 리다이렉트
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-AUTH-001] 대시보드 새로고침 후에도 로그인 상태가 유지된다", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `guard-persist-${Date.now()}@example.com`;

    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("가드테스터");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // Act: 페이지 새로고침
    await page.reload();

    // Assert: 대시보드에 그대로 머물고 인증 상태가 유지된다
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("greeting")).toContainText("안녕하세요, 가드테스터님");
    await expect(page.getByTestId("nav-logout")).toBeVisible();
  });

  test("[JOURNEY-AUTH-001] 로그아웃 시 클라이언트 세션 상태가 완전히 제거된다", async ({
    page,
  }) => {
    // Arrange: 회원가입으로 로그인 상태 생성
    const email = `guard-teardown-${Date.now()}@example.com`;

    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("가드테스터");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // 로그인 중 auth 항목이 localStorage에 존재함을 확인
    const authUserBefore = await page.evaluate(() => localStorage.getItem("auth_user"));
    expect(authUserBefore).not.toBeNull();
    const loginAtBefore = await page.evaluate(() => localStorage.getItem("auth_login_at"));
    expect(loginAtBefore).not.toBeNull();

    // Act: 로그아웃
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Assert: 단순 리다이렉트만으로는 세션 파기를 보장할 수 없다.
    // auth_user와 auth_login_at이 localStorage에서 실제로 삭제됐는지 직접 검증한다.
    const authUserAfter = await page.evaluate(() => localStorage.getItem("auth_user"));
    expect(authUserAfter).toBeNull();

    const loginAtAfter = await page.evaluate(() => localStorage.getItem("auth_login_at"));
    expect(loginAtAfter).toBeNull();

    // 쿠키에도 세션/인증 관련 항목이 없음을 확인
    const cookies = await page.context().cookies();
    const sessionCookies = cookies.filter((c) => c.name.match(/token|session|auth/i));
    expect(sessionCookies).toHaveLength(0);
  });

  test("[JOURNEY-AUTH-001] 인증 없이 대시보드 직접 접근 시 로그인 페이지로 리다이렉트된다", async ({
    page,
  }) => {
    // Arrange: 로그인하지 않은 상태 (기본값 — initScript로 cookie-consent만 설정됨)

    // Act: 보호된 라우트에 직접 접근
    await page.goto("/dashboard");

    // Assert: 로그인 페이지로 리다이렉트
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-AUTH-001] 이미 가입된 이메일로 재가입 시 에러가 표시되고 대시보드로 진입하지 않는다", async ({
    page,
  }) => {
    // Arrange: 첫 번째 회원가입 완료 후 로그아웃
    const email = `guard-duplicate-${Date.now()}@example.com`;

    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("가드테스터");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL("/dashboard");

    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Act: 동일 이메일로 재가입 시도
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("다른유저");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill("password123");
    await page.getByTestId("signup-confirm-password").fill("password123");
    await page.getByTestId("signup-submit").click();

    // Assert: 에러 메시지가 표시되고 signup 페이지에 머문다
    await expect(page.getByTestId("signup-error")).toBeVisible();
    await expect(page).toHaveURL("/signup");
  });
});
