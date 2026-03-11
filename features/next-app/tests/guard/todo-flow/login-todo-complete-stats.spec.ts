import { test, expect } from "@playwright/test";

// 쿠키 배너가 버튼 클릭을 가로막지 않도록 사전에 동의 처리
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie-consent", "true");
  });
});

// -------------------------------------------------------------------
// 헬퍼: 회원가입으로 로그인 상태 생성
// -------------------------------------------------------------------
async function signupAndLogin(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
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

// -------------------------------------------------------------------
// 헬퍼: 대시보드 통계 숫자 읽기
// StatsCard 구조: <div data-testid="stat-*"><p>숫자</p><p>레이블</p></div>
// -------------------------------------------------------------------
async function getStatNumber(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  testId: string
): Promise<number> {
  const text = await page
    .getByTestId(testId)
    .locator("p")
    .first()
    .textContent();
  return parseInt(text ?? "0", 10);
}

// ===================================================================
// [Guard] 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 통계 반영 여정
// ===================================================================
test.describe(
  "[Guard] 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 통계 반영 여정",
  () => {
    // -----------------------------------------------------------------
    // 1. 해피 플로우: 전체 여정이 정상 동작한다
    // -----------------------------------------------------------------
    test("[JOURNEY-TODO-001] 로그인 후 대시보드에서 할 일 추가, /todos에서 완료 처리, 대시보드 통계가 반영된다", async ({
      page,
    }) => {
      const email = `guard-todo-happy-${Date.now()}@example.com`;

      // ---- Step 1: 회원가입 → 대시보드 ----
      await signupAndLogin(page, "할일테스터", email);
      await expect(page.getByTestId("greeting")).toContainText(
        "안녕하세요, 할일테스터님"
      );

      // ---- Step 2: 대시보드에서 할 일 추가 ----
      const totalBefore = await getStatNumber(page, "stat-total");
      const pendingBefore = await getStatNumber(page, "stat-pending");

      await page.getByTestId("todo-input").fill("E2E 회귀 테스트 할 일");
      await page.getByTestId("todo-add").click();

      // 추가 즉시 대시보드 통계에 반영된다
      await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText(
        String(totalBefore + 1)
      );
      await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText(
        String(pendingBefore + 1)
      );
      // 완료 통계는 변하지 않는다
      await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText("0");

      // ---- Step 3: /todos로 이동 ----
      await page.getByTestId("go-to-todos").click();
      await expect(page).toHaveURL("/todos");

      // /todos에서도 방금 추가한 할 일이 보인다
      await expect(page.getByText("E2E 회귀 테스트 할 일")).toBeVisible();

      // ---- Step 4: /todos에서 할 일 완료 처리 ----
      // 첫 번째 todo-item의 checkbox를 찾아 클릭
      const todoItems = page.locator("[data-testid^='todo-item-']");
      await expect(todoItems).toHaveCount(1);
      const firstItemId = await todoItems
        .first()
        .getAttribute("data-testid")
        .then((s) => s?.replace("todo-item-", "") ?? "");
      const checkbox = page.getByTestId(`todo-checkbox-${firstItemId}`);
      await expect(checkbox).not.toBeChecked();
      await checkbox.click();
      await expect(checkbox).toBeChecked();

      // ---- Step 5: 대시보드로 돌아가 통계 반영 확인 ----
      await page.getByTestId("nav-dashboard").click();
      await expect(page).toHaveURL("/dashboard");

      await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText(
        String(totalBefore + 1)
      );
      await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText("1");
      await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("0");
    });

    // -----------------------------------------------------------------
    // 2. 상태 지속성: 페이지 새로고침 후에도 통계가 유지된다
    // -----------------------------------------------------------------
    test("[JOURNEY-TODO-001] 완료 처리 후 대시보드 새로고침해도 통계가 유지된다", async ({
      page,
    }) => {
      const email = `guard-todo-persist-${Date.now()}@example.com`;

      // Arrange: 회원가입 후 할 일 추가 → /todos에서 완료
      await signupAndLogin(page, "지속성테스터", email);

      await page.getByTestId("todo-input").fill("새로고침 지속성 테스트");
      await page.getByTestId("todo-add").click();

      await page.goto("/todos");
      await expect(page).toHaveURL("/todos");

      const todoItems = page.locator("[data-testid^='todo-item-']");
      await expect(todoItems).toHaveCount(1);
      const firstItemId = await todoItems
        .first()
        .getAttribute("data-testid")
        .then((s) => s?.replace("todo-item-", "") ?? "");
      await page.getByTestId(`todo-checkbox-${firstItemId}`).click();

      // Act: 대시보드로 이동 후 새로고침
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");
      await page.reload();

      // Assert: 새로고침 후에도 대시보드가 유지되고 통계가 올바르다
      await expect(page).toHaveURL("/dashboard");
      await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText("1");
      await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText("1");
      await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("0");
    });

    // -----------------------------------------------------------------
    // 3. 분기 플로우 (데이터 상태 불변): 미완료 할 일은 완료 통계를 바꾸지 않는다
    // 해피 플로우의 역: "완료하지 않으면 완료 통계가 바뀌지 않는다"
    // -----------------------------------------------------------------
    test("[JOURNEY-TODO-001] 할 일을 추가만 하고 완료하지 않으면 완료 통계가 변하지 않는다", async ({
      page,
    }) => {
      const email = `guard-todo-branch-${Date.now()}@example.com`;

      // Arrange: 회원가입
      await signupAndLogin(page, "분기테스터", email);

      const completedBefore = await getStatNumber(page, "stat-completed");

      // Act: 할 일 추가만 하고 완료 처리하지 않음
      await page.getByTestId("todo-input").fill("완료하지 않을 할 일");
      await page.getByTestId("todo-add").click();

      // /todos 방문 (완료 처리 없이 그냥 확인만)
      await page.goto("/todos");
      await expect(page).toHaveURL("/todos");
      const todoItems = page.locator("[data-testid^='todo-item-']");
      await expect(todoItems).toHaveCount(1);

      // 완료 처리 없이 대시보드 복귀
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");

      // Assert: 완료 통계가 그대로이고 전체/진행중만 증가
      await expect(page.getByTestId("stat-total").locator("p").first()).toHaveText("1");
      await expect(page.getByTestId("stat-completed").locator("p").first()).toHaveText(
        String(completedBefore)
      );
      await expect(page.getByTestId("stat-pending").locator("p").first()).toHaveText("1");
    });

    // -----------------------------------------------------------------
    // 4. 분기 플로우 (접근 제어): 비인증 사용자는 /todos 접근 시 /login으로 리다이렉트
    // -----------------------------------------------------------------
    test("[JOURNEY-TODO-001] 비인증 상태로 /todos 직접 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      // Arrange: 로그인하지 않은 상태
      await page.goto("/todos");

      // Assert: 로그인 페이지로 리다이렉트
      await expect(page).toHaveURL("/login");
    });

    // -----------------------------------------------------------------
    // 5. 분기 플로우 (접근 제어): 비인증 사용자는 /dashboard 접근 시 /login으로 리다이렉트
    // -----------------------------------------------------------------
    test("[JOURNEY-TODO-001] 비인증 상태로 /dashboard 직접 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      // Arrange: 로그인하지 않은 상태
      await page.goto("/dashboard");

      // Assert: 로그인 페이지로 리다이렉트
      await expect(page).toHaveURL("/login");
    });

    // -----------------------------------------------------------------
    // 6. 여정 완료 후 상태 검증: 로그아웃 시 세션이 완전히 제거된다
    // -----------------------------------------------------------------
    test("[JOURNEY-TODO-001] 전체 여정 후 로그아웃 시 클라이언트 세션이 완전히 삭제된다", async ({
      page,
    }) => {
      const email = `guard-todo-teardown-${Date.now()}@example.com`;

      // Arrange: 전체 플로우 수행
      await signupAndLogin(page, "세션검증테스터", email);

      await page.getByTestId("todo-input").fill("세션 검증용 할 일");
      await page.getByTestId("todo-add").click();

      await page.goto("/todos");
      const todoItems = page.locator("[data-testid^='todo-item-']");
      await expect(todoItems).toHaveCount(1);
      const firstItemId = await todoItems
        .first()
        .getAttribute("data-testid")
        .then((s) => s?.replace("todo-item-", "") ?? "");
      await page.getByTestId(`todo-checkbox-${firstItemId}`).click();

      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");

      // 로그인 중 auth 항목이 localStorage에 존재함을 확인
      const authUserBefore = await page.evaluate(() =>
        localStorage.getItem("auth_user")
      );
      expect(authUserBefore).not.toBeNull();

      // Act: 로그아웃
      await page.getByTestId("nav-logout").click();
      await expect(page).toHaveURL("/login");

      // Assert: 단순 리다이렉트만으로는 세션 파기를 보장할 수 없다.
      // auth_user와 auth_login_at이 localStorage에서 실제로 삭제됐는지 검증한다.
      const authUserAfter = await page.evaluate(() =>
        localStorage.getItem("auth_user")
      );
      expect(authUserAfter).toBeNull();

      const loginAtAfter = await page.evaluate(() =>
        localStorage.getItem("auth_login_at")
      );
      expect(loginAtAfter).toBeNull();

      // todos 데이터는 유지된다 (사용자 데이터는 로그아웃 후에도 보존)
      const todosAfter = await page.evaluate(() => localStorage.getItem("todos"));
      expect(todosAfter).not.toBeNull();

      // 쿠키에도 인증 관련 항목이 없음을 확인
      const cookies = await page.context().cookies();
      const sessionCookies = cookies.filter((c) =>
        c.name.match(/token|session|auth/i)
      );
      expect(sessionCookies).toHaveLength(0);

      // 로그아웃 후 /dashboard 재접근 시 /login으로 리다이렉트
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/login");
    });
  }
);
