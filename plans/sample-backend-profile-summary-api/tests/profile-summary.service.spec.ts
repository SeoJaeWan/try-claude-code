import { AppService } from "../../../features/nest-api/src/app.service";

type RawProfileSummary = {
  userName?: string;
  pendingTodos?: number | null;
  completedTodos?: number | null;
  unreadNotifications?: number | null;
};

type ProfileSummary = {
  userName: string;
  pendingTodos: number;
  completedTodos: number;
  unreadNotifications: number;
};

describe("프로필 요약 서비스 계획 계약", () => {
  let service: AppService & {
    buildProfileSummary: (raw?: RawProfileSummary) => ProfileSummary;
  };

  beforeEach(() => {
    service = new AppService() as AppService & {
      buildProfileSummary: (raw?: RawProfileSummary) => ProfileSummary;
    };
  });

  it("[C-PROFILE-001] 정상 seed를 profile summary 응답 구조로 변환한다", () => {
    // Arrange
    const raw: RawProfileSummary = {
      userName: "테스트유저",
      pendingTodos: 2,
      completedTodos: 1,
      unreadNotifications: 3,
    };

    // Act
    const result = service.buildProfileSummary(raw);

    // Assert
    expect(result).toEqual({
      userName: "테스트유저",
      pendingTodos: 2,
      completedTodos: 1,
      unreadNotifications: 3,
    });
  });

  it("[C-PROFILE-002][C-PROFILE-004] 누락되거나 잘못된 숫자 seed는 0으로 정규화한다", () => {
    // Arrange
    const raw: RawProfileSummary = {
      userName: "테스트유저",
      pendingTodos: null,
      completedTodos: -2,
      unreadNotifications: undefined,
    };

    // Act
    const result = service.buildProfileSummary(raw);

    // Assert
    expect(result).toEqual({
      userName: "테스트유저",
      pendingTodos: 0,
      completedTodos: 0,
      unreadNotifications: 0,
    });
  });

  it("[C-PROFILE-004] 빈 입력도 음수가 아닌 정수 응답으로 수렴한다", () => {
    // Arrange

    // Act
    const result = service.buildProfileSummary();

    // Assert
    expect(result.pendingTodos).toBe(0);
    expect(result.completedTodos).toBe(0);
    expect(result.unreadNotifications).toBe(0);
    expect(Number.isInteger(result.pendingTodos)).toBe(true);
    expect(Number.isInteger(result.completedTodos)).toBe(true);
    expect(Number.isInteger(result.unreadNotifications)).toBe(true);
  });
});
