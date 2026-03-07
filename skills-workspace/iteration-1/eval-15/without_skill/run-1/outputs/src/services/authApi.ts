import { LoginRequest, LoginResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class AuthApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message =
        errorData?.message ||
        (response.status === 401
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : `로그인 요청에 실패했습니다. (${response.status})`);
      throw new Error(message);
    }

    return response.json();
  }

  async logout(accessToken: string): Promise<void> {
    await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('토큰 갱신에 실패했습니다.');
    }

    return response.json();
  }

  async getMe(accessToken: string): Promise<LoginResponse['user']> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('사용자 정보를 가져올 수 없습니다.');
    }

    return response.json();
  }
}

export const authApi = new AuthApiService(API_BASE_URL);
