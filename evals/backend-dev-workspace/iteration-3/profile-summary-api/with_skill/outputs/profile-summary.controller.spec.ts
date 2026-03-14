import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

type ProfileSummary = {
  userName: string;
  pendingTodos: number;
  completedTodos: number;
  unreadNotifications: number;
};

describe("프로필 요약 컨트롤러 계획 계약", () => {
  let controller: AppController & {
    getProfileSummary: () => ProfileSummary;
  };
  let service: { getProfileSummary: jest.Mock<ProfileSummary, []> };

  beforeEach(async () => {
    service = {
      getProfileSummary: jest.fn<ProfileSummary, []>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: service }],
    }).compile();

    controller = module.get(AppController) as AppController & {
      getProfileSummary: () => ProfileSummary;
    };
  });

  it("[C-PROFILE-003] 컨트롤러는 서비스 응답을 래핑 없이 그대로 반환한다", () => {
    // Arrange
    service.getProfileSummary.mockReturnValue({
      userName: "테스트유저",
      pendingTodos: 2,
      completedTodos: 1,
      unreadNotifications: 3,
    });

    // Act
    const result = controller.getProfileSummary();

    // Assert
    expect(service.getProfileSummary).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      userName: "테스트유저",
      pendingTodos: 2,
      completedTodos: 1,
      unreadNotifications: 3,
    });
  });

  it("[C-PROFILE-003][C-PROFILE-004] 정규화된 0-count 응답도 그대로 전달한다", () => {
    // Arrange
    service.getProfileSummary.mockReturnValue({
      userName: "테스트유저",
      pendingTodos: 0,
      completedTodos: 0,
      unreadNotifications: 0,
    });

    // Act
    const result = controller.getProfileSummary();

    // Assert
    expect(result).toEqual({
      userName: "테스트유저",
      pendingTodos: 0,
      completedTodos: 0,
      unreadNotifications: 0,
    });
  });
});
