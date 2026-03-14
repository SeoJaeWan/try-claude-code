# Login Hook Composition - Summary

## What was done

기존 로그인 페이지(`features/next-app/app/login/page.tsx`)를 분석하여, 하나의 컴포넌트에 혼재되어 있던 폼 상태 관리와 API 호출 로직을 두 개의 커스텀 훅으로 분리하고 페이지에서 조합하는 구조로 리팩토링했다.

### 분리 전 문제점

- `LoginPage` 컴포넌트 하나에 `useState` 4개, 유효성 검증 함수, 로그인 API 호출, 라우팅 로직이 모두 포함
- 폼 상태 관리와 API 호출이 결합되어 테스트와 재사용이 어려운 구조

### 분리 후 구조

1. **`useLoginForm`** (폼 상태 관리 훅)
   - `email`, `password` 상태 관리
   - `errors`: 필드별 유효성 검증 에러 관리
   - `validateField(field)`: 개별 필드 blur 시 유효성 검증
   - `validateAll()`: 전체 폼 유효성 검증 (제출 시 사용)

2. **`useLogin`** (API 훅)
   - `mutate(email, password)`: AuthContext의 `login`을 호출하고 성공 시 `/dashboard`로 라우팅
   - `error`: 로그인 실패 시 서버(API) 에러 메시지
   - `clearError()`: 에러 초기화

3. **`page.tsx`** (리팩토링된 로그인 페이지)
   - `useLoginForm`과 `useLogin`을 조합하여 사용
   - 기존과 동일한 UI/UX 유지 (data-testid, 스타일링, 에러 표시 모두 보존)

## Created files

| File | Description |
|------|-------------|
| `outputs/useLoginForm.ts` | 폼 상태 및 클라이언트 유효성 검증 커스텀 훅 |
| `outputs/useLogin.ts` | 로그인 API 호출 및 라우팅 처리 훅 |
| `outputs/page.tsx` | 두 훅을 조합한 리팩토링된 로그인 페이지 |
| `outputs/summary.md` | 이 파일 |

## Final file paths

- `skills/frontend-dev-workspace/iteration-2/login-hook-composition/without_skill/outputs/useLoginForm.ts`
- `skills/frontend-dev-workspace/iteration-2/login-hook-composition/without_skill/outputs/useLogin.ts`
- `skills/frontend-dev-workspace/iteration-2/login-hook-composition/without_skill/outputs/page.tsx`

## Notes

- 실제 프로젝트에 적용할 경우, `useLoginForm.ts`와 `useLogin.ts`는 `features/next-app/hooks/` 디렉토리에 배치하고, `page.tsx`는 `features/next-app/app/login/page.tsx`를 대체하면 된다.
- 기존 `data-testid` 속성과 CSS 클래스를 모두 유지하여 E2E 테스트 호환성을 보장한다.
- `useLogin` 훅은 현재 동기 방식의 localStorage 기반 인증을 감싸고 있지만, 향후 실제 API 호출(async)로 전환할 때 `mutate`를 async로 바꾸기만 하면 페이지 코드 변경 없이 대응 가능하다.
