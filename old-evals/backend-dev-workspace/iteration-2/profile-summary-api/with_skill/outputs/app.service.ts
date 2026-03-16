import { Injectable } from '@nestjs/common';

export interface RawProfileSummary {
  userName?: string;
  pendingTodos?: number | null;
  completedTodos?: number | null;
  unreadNotifications?: number | null;
}

export interface ProfileSummary {
  userName: string;
  pendingTodos: number;
  completedTodos: number;
  unreadNotifications: number;
}

@Injectable()
export class AppService {
  private readonly defaultSeed: RawProfileSummary = {
    userName: '테스트유저',
    pendingTodos: 0,
    completedTodos: 0,
    unreadNotifications: 0,
  };

  getHello(): string {
    return 'Hello World!';
  }

  buildProfileSummary(raw?: RawProfileSummary): ProfileSummary {
    const seed = raw ?? this.defaultSeed;
    return {
      userName: seed.userName ?? '테스트유저',
      pendingTodos: this.normalizeCount(seed.pendingTodos),
      completedTodos: this.normalizeCount(seed.completedTodos),
      unreadNotifications: this.normalizeCount(seed.unreadNotifications),
    };
  }

  getProfileSummary(): ProfileSummary {
    return this.buildProfileSummary(this.defaultSeed);
  }

  private normalizeCount(value: number | null | undefined): number {
    if (value == null || value < 0) {
      return 0;
    }
    return Math.floor(value);
  }
}
