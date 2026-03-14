import { Injectable } from '@nestjs/common';

interface RawProfileSummary {
  userName?: string;
  pendingTodos?: number | null;
  completedTodos?: number | null;
  unreadNotifications?: number | null;
}

interface ProfileSummary {
  userName: string;
  pendingTodos: number;
  completedTodos: number;
  unreadNotifications: number;
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  buildProfileSummary(raw?: RawProfileSummary): ProfileSummary {
    const normalize = (value?: number | null): number =>
      value != null && value >= 0 ? Math.floor(value) : 0;

    return {
      userName: raw?.userName ?? '테스트유저',
      pendingTodos: normalize(raw?.pendingTodos),
      completedTodos: normalize(raw?.completedTodos),
      unreadNotifications: normalize(raw?.unreadNotifications),
    };
  }

  getProfileSummary(): ProfileSummary {
    return this.buildProfileSummary({
      userName: '테스트유저',
      pendingTodos: 0,
      completedTodos: 0,
      unreadNotifications: 0,
    });
  }
}
