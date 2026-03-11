import { test, expect, type Page } from "@playwright/test";

// 각 테스트마다 고유한 이메일 사용 (Date.now + 랜덤)
function makeTestUser() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  return {
    name: "가드테스터",
    email: `guard-todo-${suffix}@example.com`,
    password: "password123",
  };
}

/**
 * 쿠키 동의 배너를 사전 처리한다.
 * addInitScript를 통해 모든 페이지 로드 전에 localStorage에 동의 플래그를 설정한다.
 */
async function skipCookieBanner(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
}

/**
 * 회원가입 헬퍼: /signup → 폼 제출 → /dashboard → 로그아웃 순서로 계정을 생성하고
 * 깨끗한 비인증 상태로 복귀한다.
 */
async function registerAndLogout(
  page: Page,
  user: ReturnType<typeof makeTestUser>
) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill(user.name);
  await page.getByTestId("signup-email").fill(user.email);
  await page.getByTestId("signup-password").fill(user.password);
  await page.getByTestId("signup-confirm-password").fill(user.password);
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL("/dashboard");
  await page.getByTestId("nav-logout").click();
  await expect(page).toHaveURL("/login");
}

test.describe("[Guard] 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 대시보드 통계 반영 여정", () => {
  test("[JOURNEY-TODO-001] 로그인 후 대시보드에서 할 일 추가, /todos에서 완료 처리 시 대시보드 통계가 갱신된다", async ({
    page,
  }) => {
    const user = makeTestUser();
    await skipCookieBanner(page);
    await registerAndLogout(page, user);

    // Arrange: 로그인
    await page.goto("/login");
    await page.getByTestId("login-email").fill(user.email);
    await page.getByTestId("login-password").fill(user.password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // Assert: 초기 통계가 0
    await expect(page.getByTestId("stat-total")).toContainText("0");
    await expect(page.getByTestId("stat-completed")).toContainText("0");
    await expect(page.getByTestId("stat-pending")).toContainText("0");

    // Act: 대시보드 빠른 추가 폼으로 할 일 추가
    await page.getByTestId("todo-input").fill("회귀테스트용 할 일");
    await page.getByTestId("todo-add").click();

    // Assert: 대시보드 통계 갱신 - 전체 1, 완료 0, 진행중 1
    await expect(page.getByTestId("stat-total")).toContainText("1");
    await expect(page.getByTestId("stat-completed")).toContainText("0");
    await expect(page.getByTestId("stat-pending")).toContainText("1");

    // Act: /todos 페이지로 이동
    await page.getByTestId("go-to-todos").click();
    await expect(page).toHaveURL("/todos");

    // Assert: 추가한 할 일이 /todos에 표시된다
    await expect(page.getByText("회귀테스트용 할 일")).toBeVisible();

    // Act: 할 일 완료 처리
    const checkbox = page.getByRole("checkbox", {
      name: /회귀테스트용 할 일 완료 표시/,
    });
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Act: 대시보드로 돌아가기
    await page.getByTestId("nav-dashboard").click();
    await expect(page).toHaveURL("/dashboard");

    // Assert: 통계 반영 - 전체 1, 완료 1, 진행중 0
    await expect(page.getByTestId("stat-total")).toContainText("1");
    await expect(page.getByTestId("stat-completed")).toContainText("1");
    await expect(page.getByTestId("stat-pending")).toContainText("0");
  });

  test("[JOURNEY-TODO-001] 로그인 상태는 /dashboard → /todos 경로 전환 및 새로고침 후에도 유지된다", async ({
    page,
  }) => {
    const user = makeTestUser();
    await skipCookieBanner(page);
    await registerAndLogout(page, user);

    // Arrange: 로그인
    await page.goto("/login");
    await page.getByTestId("login-email").fill(user.email);
    await page.getByTestId("login-password").fill(user.password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // Assert: 대시보드에서 greeting 확인 (인증 상태)
    await expect(page.getByTestId("greeting")).toContainText(user.name);

    // Act: /todos로 이동
    await page.getByTestId("nav-todos").click();
    await expect(page).toHaveURL("/todos");

    // Assert: /todos에서도 nav에 사용자 이메일이 표시된다
    await expect(page.getByTestId("nav-user-email")).toContainText(user.email);

    // Act: 새로고침 후에도 인증 상태 유지
    await page.reload();
    await expect(page).toHaveURL("/todos");
    await expect(page.getByTestId("nav-user-email")).toContainText(user.email);
  });

  test("[JOURNEY-TODO-001] 로그아웃 후 클라이언트 인증 상태가 완전히 제거된다", async ({
    page,
  }) => {
    const user = makeTestUser();
    await skipCookieBanner(page);
    await registerAndLogout(page, user);

    // Arrange: 로그인
    await page.goto("/login");
    await page.getByTestId("login-email").fill(user.email);
    await page.getByTestId("login-password").fill(user.password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // Act: 로그아웃
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL("/login");

    // Assert: localStorage에서 인증 키가 제거됐는지 검증
    // redirect만으로는 세션 파괴 여부를 확인할 수 없으므로 스토리지를 직접 확인
    const authUser = await page.evaluate(() =>
      localStorage.getItem("auth_user")
    );
    expect(authUser).toBeNull();

    const authLoginAt = await page.evaluate(() =>
      localStorage.getItem("auth_login_at")
    );
    expect(authLoginAt).toBeNull();

    // Assert: 로그아웃 후 /dashboard 접근 시 /login으로 리다이렉트
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("[JOURNEY-TODO-001] 할 일을 완료하지 않으면 대시보드 완료 통계가 변경되지 않는다", async ({
    page,
  }) => {
    // Branch flow (data-state invariant): 완료 처리 없이 추가만 해도 완료 카운터는 바뀌지 않아야 한다.
    const user = makeTestUser();
    await skipCookieBanner(page);
    await registerAndLogout(page, user);

    // Arrange: 로그인
    await page.goto("/login");
    await page.getByTestId("login-email").fill(user.email);
    await page.getByTestId("login-password").fill(user.password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL("/dashboard");

    // 초기 완료 수 기록
    const initialCompleted = await page
      .getByTestId("stat-completed")
      .textContent();

    // Act: 할 일 추가만 하고 완료 처리 안 함
    await page.getByTestId("todo-input").fill("완료 안 할 할 일");
    await page.getByTestId("todo-add").click();

    // Act: /todos로 이동하지만 체크박스는 클릭하지 않음
    await page.getByTestId("go-to-todos").click();
    await expect(page).toHaveURL("/todos");
    await expect(page.getByText("완료 안 할 할 일")).toBeVisible();
    // 의도적으로 완료 처리를 하지 않음

    // Act: 대시보드로 돌아가기
    await page.getByTestId("nav-dashboard").click();
    await expect(page).toHaveURL("/dashboard");

    // Assert: 완료 카운터는 변경되지 않아야 한다
    await expect(page.getByTestId("stat-completed")).toHaveText(
      initialCompleted!
    );

    // Assert: 전체와 진행중은 증가
    await expect(page.getByTestId("stat-total")).toContainText("1");
    await expect(page.getByTestId("stat-pending")).toContainText("1");
  });

  test("[JOURNEY-TODO-001] 인증 없이 /dashboard와 /todos 접근 시 /login으로 리다이렉트된다", async ({
    page,
  }) => {
    // Branch flow: 비인증 상태에서 보호된 경로 접근은 모두 /login으로 이동해야 한다
    await skipCookieBanner(page);

    // /dashboard 접근 시 /login으로 리다이렉트
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");

    // /todos 접근 시 /login으로 리다이렉트
    await page.goto("/todos");
    await expect(page).toHaveURL("/login");
  });
});
