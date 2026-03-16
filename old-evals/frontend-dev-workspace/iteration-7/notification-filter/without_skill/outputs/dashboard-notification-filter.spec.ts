import { test, expect, type Page } from "@playwright/test";

type Notification = {
  id: string;
  message: string;
  time: string;
  read: boolean;
};

class DashboardNotificationsSection {
  constructor(private readonly page: Page) {}

  allFilter() {
    return this.page.getByTestId("notifications-filter-all");
  }

  unreadFilter() {
    return this.page.getByTestId("notifications-filter-unread");
  }

  list() {
    return this.page.getByTestId("notifications-list");
  }

  empty() {
    return this.page.getByTestId("notifications-empty");
  }

  error() {
    return this.page.getByTestId("notifications-error");
  }

  item(id: string) {
    return this.page.getByTestId(`notification-${id}`);
  }
}

async function loginAsTestUser(page: Page) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill("테스트유저");
  await page.getByTestId("signup-email").fill(`notification-${Date.now()}@example.com`);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-confirm-password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
}

async function stubNotifications(page: Page, notifications: Notification[] | "error") {
  await page.route("**/api/notifications", async (route) => {
    if (notifications === "error") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "알림을 불러올 수 없습니다" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        notifications,
        total: notifications.length,
      }),
    });
  });
}

test.describe("대시보드 알림 필터", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie-consent", "true");
    });

    await loginAsTestUser(page);
  });

  test("[C-NOTI-001] 기본 진입 시 전체 알림이 노출된다", async ({ page }) => {
    // Arrange
    await stubNotifications(page, [
      { id: "1", message: "새 알림", time: new Date().toISOString(), read: false },
      { id: "2", message: "읽은 알림", time: new Date().toISOString(), read: true },
    ]);
    const section = new DashboardNotificationsSection(page);

    // Act
    await page.goto("/dashboard");

    // Assert
    await expect(section.list()).toBeVisible();
    await expect(section.allFilter()).toBeVisible();
    await expect(section.unreadFilter()).toBeVisible();
    await expect(section.item("1")).toBeVisible();
    await expect(section.item("2")).toBeVisible();
  });

  test("[C-NOTI-002][C-NOTI-003] unread filter는 읽지 않은 알림만 남기고 비면 empty state를 노출한다", async ({
    page,
  }) => {
    // Arrange
    await stubNotifications(page, [
      { id: "2", message: "읽은 알림", time: new Date().toISOString(), read: true },
    ]);
    const section = new DashboardNotificationsSection(page);
    await page.goto("/dashboard");

    // Act
    await section.unreadFilter().click();

    // Assert
    await expect(section.item("2")).not.toBeVisible();
    await expect(section.empty()).toBeVisible();
  });

  test("[C-NOTI-004] API 오류면 오류 상태가 필터 UI보다 우선한다", async ({ page }) => {
    // Arrange
    await stubNotifications(page, "error");
    const section = new DashboardNotificationsSection(page);

    // Act
    await page.goto("/dashboard");

    // Assert
    await expect(section.error()).toBeVisible();
    await expect(section.allFilter()).not.toBeVisible();
    await expect(section.unreadFilter()).not.toBeVisible();
  });
});
