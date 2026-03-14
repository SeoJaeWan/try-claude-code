import { test, expect, type Page } from "@playwright/test";

// -----------------------------------------------------------------------
// 헬퍼: 쿠키 동의 배너를 사전 처리한다.
// addInitScript를 통해 모든 페이지 로드 전에 localStorage에 동의 플래그를 설정한다.
// -----------------------------------------------------------------------
async function skipCookieBanner(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
}

// -----------------------------------------------------------------------
// 헬퍼: 각 테스트마다 고유한 사용자 정보 생성 (병렬 실행 시 충돌 방지)
// -----------------------------------------------------------------------
function makeTestUser() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  return {
    name: "여정테스터",
    email: `guard-todo-flow-${suffix}@example.com`,
    password: "password123",
  };
}

// -----------------------------------------------------------------------
// 헬퍼: 회원가입 후 로그아웃하여 깨끗한 비인증 상태를 만든다.
// 이후 테스트에서 /login 플로우를 검증하기 위한 사전 준비다.
// -----------------------------------------------------------------------
async function registerAccount(page: Page, user: ReturnType<typeof makeTestUser>) {
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

// -----------------------------------------------------------------------
// 헬퍼: /login 폼 제출 → /dashboard 진입
// -----------------------------------------------------------------------
async function loginUser(page: Page, user: ReturnType<typeof makeTestUser>) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(user.email);
  await page.getByTestId("login-password").fill(user.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL("/dashboard");
}

// -----------------------------------------------------------------------
// 헬퍼: StatsCard의 숫자 값을 정수로 읽는다.
// StatsCard 구조: <div data-testid="stat-*"><p>숫자</p><p>레이블</p></div>
// -----------------------------------------------------------------------
async function readStat(page: Page, testId: string): Promise<number> {
  const text = await page.getByTestId(testId).locator("p").first().textContent();
  return parseInt(text ?? "0", 10);
}

// =======================================================================
// [Guard] 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 대시보드 통계 반영 여정
// JOURNEY-TODO-002
// flow: /login → /dashboard (할 일 추가) → /todos (완료 처리) → /dashboard (통계 확인)
// =======================================================================
test.describe(
  "[Guard] 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 대시보드 통계 반영 여정",
  () => {
    // -------------------------------------------------------------------
    // 1. 해피 플로우: 전체 여정이 정상 동작한다
    //    로그인 → 대시보드에서 할 일 추가 → /todos에서 완료 처리 → 대시보드 통계 갱신 확인
    // -------------------------------------------------------------------
    test(
      "[JOURNEY-TODO-002] 로그인 후 대시보드에서 할 일을 추가하고, /todos에서 완료 처리하면 대시보드 통계가 갱신된다",
      async ({ page }) => {
        const user = makeTestUser();
        await skipCookieBanner(page);

        // Arrange: 계정 생성 후 로그아웃 (깨끗한 상태)
        await registerAccount(page, user);

        // Step 1: 로그인 → /dashboard 진입
        await loginUser(page, user);
        await expect(page.getByTestId("greeting")).toContainText(`안녕하세요, ${user.name}님`);

        // Step 2: 초기 통계 확인 - 모두 0이어야 한다
        const initialTotal = await readStat(page, "stat-total");
        const initialCompleted = await readStat(page, "stat-completed");
        const initialPending = await readStat(page, "stat-pending");
        expect(initialTotal).toBe(0);
        expect(initialCompleted).toBe(0);
        expect(initialPending).toBe(0);

        // Step 3: 대시보드 빠른 추가 폼으로 할 일 추가
        const todoText = "E2E 전체 플로우 회귀 테스트";
        await page.getByTestId("todo-input").fill(todoText);
        await page.getByTestId("todo-add").click();

        // Assert: 할 일 추가 직후 대시보드 통계가 즉시 반영된다 (전체+1, 진행중+1, 완료 변화 없음)
        await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText("1");
        await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText("0");
        await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("1");

        // Step 4: /todos로 이동 (대시보드 링크 클릭)
        await page.getByTestId("go-to-todos").click();
        await expect(page).toHaveURL("/todos");

        // Assert: /todos에서도 방금 추가한 할 일이 표시된다
        await expect(page.getByText(todoText)).toBeVisible();

        // Step 5: /todos에서 할 일 완료 처리
        // 동적 ID를 가진 todo-item의 체크박스를 data-testid 패턴으로 찾는다
        const todoItems = page.locator("[data-testid^='todo-item-']");
        await expect(todoItems).toHaveCount(1);
        const itemTestId = await todoItems.first().getAttribute("data-testid");
        const todoId = itemTestId?.replace("todo-item-", "") ?? "";
        const checkbox = page.getByTestId(`todo-checkbox-${todoId}`);
        await expect(checkbox).not.toBeChecked();
        await checkbox.click();
        await expect(checkbox).toBeChecked();

        // Step 6: /dashboard로 돌아가 통계 반영 확인
        await page.getByTestId("nav-dashboard").click();
        await expect(page).toHaveURL("/dashboard");

        // Assert: 완료 처리가 대시보드 통계에 반영됐다 (전체 1, 완료 1, 진행중 0)
        await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText("1");
        await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText("1");
        await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("0");
      }
    );

    // -------------------------------------------------------------------
    // 2. 상태 지속성: /todos → /dashboard 경로 전환 및 새로고침 후에도 통계가 유지된다
    // -------------------------------------------------------------------
    test(
      "[JOURNEY-TODO-002] 완료 처리 후 대시보드를 새로고침해도 통계 수치가 그대로 유지된다",
      async ({ page }) => {
        const user = makeTestUser();
        await skipCookieBanner(page);

        // Arrange: 계정 생성, 로그인, 할 일 추가, /todos에서 완료 처리
        await registerAccount(page, user);
        await loginUser(page, user);

        await page.getByTestId("todo-input").fill("새로고침 지속성 검증용 할 일");
        await page.getByTestId("todo-add").click();

        await page.goto("/todos");
        await expect(page).toHaveURL("/todos");

        const todoItems = page.locator("[data-testid^='todo-item-']");
        await expect(todoItems).toHaveCount(1);
        const itemTestId = await todoItems.first().getAttribute("data-testid");
        const todoId = itemTestId?.replace("todo-item-", "") ?? "";
        await page.getByTestId(`todo-checkbox-${todoId}`).click();
        await expect(page.getByTestId(`todo-checkbox-${todoId}`)).toBeChecked();

        // Act: 대시보드로 이동 후 새로고침
        await page.goto("/dashboard");
        await expect(page).toHaveURL("/dashboard");
        await page.reload();

        // Assert: 새로고침 후에도 대시보드 URL이 유지되고 통계가 올바르게 표시된다
        await expect(page).toHaveURL("/dashboard");
        await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText("1");
        await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText("1");
        await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("0");
      }
    );

    // -------------------------------------------------------------------
    // 3. 상태 지속성: /dashboard → /todos 경로 전환 후에도 인증 상태가 유지된다
    // -------------------------------------------------------------------
    test(
      "[JOURNEY-TODO-002] 로그인 상태는 /dashboard에서 /todos로 이동한 후에도 유지된다",
      async ({ page }) => {
        const user = makeTestUser();
        await skipCookieBanner(page);

        // Arrange: 계정 생성 및 로그인
        await registerAccount(page, user);
        await loginUser(page, user);

        // Assert: 대시보드에서 greeting으로 인증 상태 확인
        await expect(page.getByTestId("greeting")).toContainText(user.name);
        await expect(page.getByTestId("nav-user-email")).toContainText(user.email);

        // Act: /todos로 이동
        await page.getByTestId("nav-todos").click();
        await expect(page).toHaveURL("/todos");

        // Assert: /todos에서도 nav에 사용자 이메일이 표시된다 (인증 상태 유지)
        await expect(page.getByTestId("nav-user-email")).toContainText(user.email);

        // Act: 새로고침
        await page.reload();
        await expect(page).toHaveURL("/todos");

        // Assert: 새로고침 후에도 인증 상태 유지
        await expect(page.getByTestId("nav-user-email")).toContainText(user.email);
      }
    );

    // -------------------------------------------------------------------
    // 4. 분기 플로우 (데이터 상태 불변): 할 일을 추가만 하고 완료하지 않으면 완료 통계가 변하지 않는다
    //    해피 플로우의 역: "완료 없이 추가만 하면 완료 카운터는 그대로다"
    // -------------------------------------------------------------------
    test(
      "[JOURNEY-TODO-002] 할 일을 추가만 하고 완료 처리하지 않으면 대시보드 완료 통계가 변경되지 않는다",
      async ({ page }) => {
        const user = makeTestUser();
        await skipCookieBanner(page);

        // Arrange: 계정 생성 및 로그인
        await registerAccount(page, user);
        await loginUser(page, user);

        // 초기 완료 수 기록
        const completedBefore = await readStat(page, "stat-completed");
        expect(completedBefore).toBe(0);

        // Act: 할 일 추가
        await page.getByTestId("todo-input").fill("완료하지 않을 할 일");
        await page.getByTestId("todo-add").click();

        // Act: /todos로 이동하지만 체크박스는 클릭하지 않는다
        await page.getByTestId("go-to-todos").click();
        await expect(page).toHaveURL("/todos");
        await expect(page.getByText("완료하지 않을 할 일")).toBeVisible();
        // 의도적으로 완료 처리 없이 대시보드로 복귀

        // Act: 대시보드 복귀
        await page.getByTestId("nav-dashboard").click();
        await expect(page).toHaveURL("/dashboard");

        // Assert: 완료 통계는 변하지 않아야 한다
        await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText(
          String(completedBefore)
        );

        // Assert: 전체와 진행중은 증가해야 한다
        await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText("1");
        await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("1");
      }
    );

    // -------------------------------------------------------------------
    // 5. 분기 플로우 (접근 제어): 비인증 상태에서 /dashboard와 /todos 접근 시 /login으로 리다이렉트
    // -------------------------------------------------------------------
    test(
      "[JOURNEY-TODO-002] 인증 없이 /dashboard와 /todos에 직접 접근하면 /login으로 리다이렉트된다",
      async ({ page }) => {
        await skipCookieBanner(page);

        // Act + Assert: /dashboard 직접 접근 → /login 리다이렉트
        await page.goto("/dashboard");
        await expect(page).toHaveURL("/login");

        // Act + Assert: /todos 직접 접근 → /login 리다이렉트
        await page.goto("/todos");
        await expect(page).toHaveURL("/login");
      }
    );

    // -------------------------------------------------------------------
    // 6. 상태 지속성 (세션 종료): 전체 여정 후 로그아웃 시 클라이언트 인증 상태가 완전히 제거된다
    //    리다이렉트만으로는 세션 파기를 보장할 수 없다 — localStorage를 직접 검증한다
    // -------------------------------------------------------------------
    test(
      "[JOURNEY-TODO-002] 전체 여정 완료 후 로그아웃 시 localStorage 인증 키가 완전히 삭제된다",
      async ({ page }) => {
        const user = makeTestUser();
        await skipCookieBanner(page);

        // Arrange: 전체 플로우 수행 (로그인 → 할 일 추가 → 완료 → 대시보드 확인)
        await registerAccount(page, user);
        await loginUser(page, user);

        await page.getByTestId("todo-input").fill("세션 파기 검증용 할 일");
        await page.getByTestId("todo-add").click();

        await page.goto("/todos");
        const todoItems = page.locator("[data-testid^='todo-item-']");
        await expect(todoItems).toHaveCount(1);
        const itemTestId = await todoItems.first().getAttribute("data-testid");
        const todoId = itemTestId?.replace("todo-item-", "") ?? "";
        await page.getByTestId(`todo-checkbox-${todoId}`).click();

        await page.goto("/dashboard");
        await expect(page).toHaveURL("/dashboard");

        // 로그인 중 인증 항목이 localStorage에 존재함을 확인
        const authUserBefore = await page.evaluate(() => localStorage.getItem("auth_user"));
        expect(authUserBefore).not.toBeNull();
        const loginAtBefore = await page.evaluate(() => localStorage.getItem("auth_login_at"));
        expect(loginAtBefore).not.toBeNull();

        // Act: 로그아웃
        await page.getByTestId("nav-logout").click();
        await expect(page).toHaveURL("/login");

        // Assert: 단순 리다이렉트만으로는 세션 파기를 보장할 수 없다.
        // auth_user와 auth_login_at이 localStorage에서 실제로 삭제됐는지 검증한다.
        const authUserAfter = await page.evaluate(() => localStorage.getItem("auth_user"));
        expect(authUserAfter).toBeNull();

        const loginAtAfter = await page.evaluate(() => localStorage.getItem("auth_login_at"));
        expect(loginAtAfter).toBeNull();

        // Assert: 쿠키에도 인증 관련 항목이 없음을 확인
        const cookies = await page.context().cookies();
        const sessionCookies = cookies.filter((c) => c.name.match(/token|session|auth/i));
        expect(sessionCookies).toHaveLength(0);

        // Assert: 로그아웃 후 /dashboard 재접근 시 /login으로 리다이렉트
        await page.goto("/dashboard");
        await expect(page).toHaveURL("/login");
      }
    );
  }
);
