# Login Hook Composition - Summary

## Task

로그인 페이지의 로직을 `useLoginForm` 커스텀 훅과 `useLogin` API 훅으로 분리하고, 페이지 컴포넌트에서 두 훅을 조합하여 사용하도록 리팩터링.

## What Was Done

기존 `features/next-app/app/login/page.tsx`의 모놀리식 로그인 페이지를 분석한 뒤, 관심사 분리(Separation of Concerns) 원칙에 따라 두 개의 커스텀 훅을 추출하고 페이지에서 조합했다.

### 1. `useLoginForm.ts` - 폼 상태 및 유효성 검사 훅

- `email`, `password` 상태 관리
- `errors` (필드별 에러), `generalError` (일반 에러) 상태 관리
- `validateField`: 개별 필드 blur 시 유효성 검사 (기존 인라인 로직 추출)
- `validateAll`: 폼 제출 시 전체 유효성 검사
- `resetErrors`: 에러 초기화
- 기존 `@/lib/validators`의 `validateEmail`, `validatePassword` 재사용

### 2. `useLogin.ts` - 로그인 API 호출 훅

- `AuthContext`의 `login` 함수를 래핑
- 로그인 성공 시 `/dashboard`로 라우팅
- `isLoading` 상태 제공 (향후 비동기 API 전환 대비)
- 에러 메시지를 호출자에게 반환

### 3. `page.tsx` - 리팩터링된 로그인 페이지

- `useLoginForm`과 `useLogin`을 조합하여 사용
- 기존과 동일한 UI/UX 유지 (data-testid, CSS 클래스, 에러 표시 등)
- 로딩 중 버튼 비활성화 및 텍스트 변경 추가
- 컴포넌트 자체는 순수한 뷰 레이어 역할만 수행

## Created Files

| File | Description |
|------|-------------|
| `outputs/useLoginForm.ts` | 폼 상태 관리 및 유효성 검사 커스텀 훅 |
| `outputs/useLogin.ts` | 로그인 API 호출 및 라우팅 커스텀 훅 |
| `outputs/page.tsx` | 두 훅을 조합한 리팩터링된 로그인 페이지 |
| `outputs/summary.md` | 이 요약 문서 |

## File Paths

- `evals/frontend-dev-workspace/iteration-3/login-hook-composition/without_skill/outputs/useLoginForm.ts`
- `evals/frontend-dev-workspace/iteration-3/login-hook-composition/without_skill/outputs/useLogin.ts`
- `evals/frontend-dev-workspace/iteration-3/login-hook-composition/without_skill/outputs/page.tsx`
- `evals/frontend-dev-workspace/iteration-3/login-hook-composition/without_skill/outputs/summary.md`
