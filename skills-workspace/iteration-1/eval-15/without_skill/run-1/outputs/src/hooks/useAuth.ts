import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * useAuth - 인증 상태 및 인증 관련 함수를 제공하는 커스텀 훅
 *
 * 반환 값:
 * - user: 현재 로그인된 사용자 정보 (User | null)
 * - accessToken: 현재 액세스 토큰 (string | null)
 * - isAuthenticated: 인증 여부 (boolean)
 * - isLoading: 로그인 요청 진행 중 여부 (boolean)
 * - error: 에러 메시지 (string | null)
 * - login(credentials): 로그인 함수
 * - logout(): 로그아웃 함수
 * - clearError(): 에러 초기화 함수
 *
 * 사용 예시:
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth는 AuthProvider 내부에서만 사용할 수 있습니다. ' +
      '앱의 최상위에 <AuthProvider>를 추가해 주세요.'
    );
  }

  return context;
}
