# useAuth Custom Hook + Login Page API Integration

## Overview

React 기반 로그인 페이지에 `useAuth` 커스텀 훅을 생성하고 API 연동을 구현했습니다.

## 생성된 파일 구조

```
src/
  types/auth.ts          - 인증 관련 TypeScript 타입 정의
  services/authApi.ts    - API 통신 서비스 (fetch 기반)
  contexts/AuthContext.tsx - AuthProvider 및 전역 인증 상태 관리
  hooks/useAuth.ts       - useAuth 커스텀 훅
  pages/LoginPage.tsx    - 로그인 페이지 컴포넌트
```

## 구현 내용

### 1. 타입 정의 (`types/auth.ts`)
- `User`, `LoginRequest`, `LoginResponse`, `AuthState` 인터페이스 정의
- API 요청/응답에 사용되는 타입 안정성 확보

### 2. API 서비스 (`services/authApi.ts`)
- `AuthApiService` 클래스 기반으로 인증 API 캡슐화
- 지원 엔드포인트:
  - `POST /api/auth/login` - 로그인
  - `POST /api/auth/logout` - 로그아웃
  - `POST /api/auth/refresh` - 토큰 갱신
  - `GET /api/auth/me` - 사용자 정보 조회
- 환경변수 `VITE_API_BASE_URL`로 API 주소 설정 가능
- 에러 응답에 대한 한국어 메시지 처리

### 3. AuthContext (`contexts/AuthContext.tsx`)
- `AuthProvider`로 앱 전체에 인증 상태 공유
- localStorage를 통한 토큰/사용자 정보 영속화
- 앱 시작 시 저장된 토큰 유효성 자동 검증
- 토큰 만료 시 refreshToken으로 자동 갱신 시도

### 4. useAuth Hook (`hooks/useAuth.ts`)
- AuthContext를 편리하게 사용하기 위한 커스텀 훅
- Provider 외부에서 사용 시 명확한 에러 메시지 제공
- 반환값: `user`, `accessToken`, `isAuthenticated`, `isLoading`, `error`, `login()`, `logout()`, `clearError()`

### 5. LoginPage (`pages/LoginPage.tsx`)
- useAuth 훅을 활용한 로그인 폼 구현
- 이메일/비밀번호 입력 필드와 유효성 검사
- 로딩 상태 표시 및 에러 메시지 출력
- 접근성 고려 (label, aria-label, autoComplete 속성)
- 인라인 스타일로 외부 의존성 없이 동작

## 사용 방법

```tsx
// App.tsx
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}
```

## API 엔드포인트 요구사항

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | /api/auth/login | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| POST | /api/auth/logout | - | - |
| POST | /api/auth/refresh | `{ refreshToken }` | `{ user, accessToken, refreshToken }` |
| GET | /api/auth/me | - | `User` |
