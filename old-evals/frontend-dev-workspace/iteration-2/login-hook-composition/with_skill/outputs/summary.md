# Login Hook Composition - Summary

## Task

로그인 페이지에 `useLoginForm` 커스텀 훅과 `useLogin` API 훅을 만들고, 페이지에서 조합하여 사용하도록 리팩터링.

## What Was Done

기존 로그인 페이지(`app/login/page.tsx`)에 인라인으로 작성되어 있던 폼 상태 관리 로직과 인증 API 호출 로직을 두 개의 커스텀 훅으로 분리하고, 페이지 컴포넌트에서 이 훅들을 조합하여 사용하도록 변경했다.

### Hook 설계

1. **`useLoginForm`** (`hooks/login/useLoginForm.ts`)
   - 폼 필드 상태 관리 (email, password)
   - 필드별 유효성 검증 에러 상태 (`errors`)
   - `handleEmailBlur` / `handlePasswordBlur` - onBlur 시 개별 필드 유효성 검증
   - `validate()` - 전체 폼 유효성 검증 (에러 상태 동시 업데이트 + 에러 객체 반환)
   - `resetErrors()` - 에러 초기화

2. **`useLogin`** (`hooks/apis/useLogin.ts`)
   - `useAuth().login`을 래핑하여 로그인 API 호출 담당
   - `generalError` - 인증 실패 시 일반 에러 메시지
   - `isLoading` - 로딩 상태 (향후 비동기 API 전환 대비)
   - `submit(email, password)` - 로그인 실행, 성공 시 `/dashboard`로 라우팅
   - `clearError()` - 에러 초기화

### 페이지 컴포넌트

`app/login/page.tsx`에서 두 훅을 조합하여 사용. 페이지는 순수하게 UI 렌더링만 담당하며, 모든 로직은 훅에 위임된다.

## Files Created

- `features/next-app/hooks/login/useLoginForm.ts` - 로그인 폼 상태 관리 커스텀 훅
- `features/next-app/hooks/apis/useLogin.ts` - 로그인 API 호출 커스텀 훅

## Files Modified

- `features/next-app/app/login/page.tsx` - 인라인 로직 제거, `useLoginForm` + `useLogin` 훅 조합으로 교체

## Generate Scripts Run

- 없음. coding-rules 스크립트가 존재하지 않아 (init-try 미실행) 수동 구현.

## Final File Paths

- `C:/Users/sjw73/Desktop/dev/try-claude-code/features/next-app/hooks/login/useLoginForm.ts`
- `C:/Users/sjw73/Desktop/dev/try-claude-code/features/next-app/hooks/apis/useLogin.ts`
- `C:/Users/sjw73/Desktop/dev/try-claude-code/features/next-app/app/login/page.tsx`

## Coding Rules References Consulted

- coding-rules 디렉토리 및 스크립트가 존재하지 않음 (`.claude/try-claude/references/coding-rules/` 비어 있음)
- design 참조 문서도 존재하지 않음 (`.claude/try-claude/references/design/` 비어 있음)
- 스킬 가이드의 폴더 구조 규칙에 따라 `hooks/apis/`(API 훅)와 `hooks/login/`(페이지별 훅)으로 분리

## Verification

- TypeScript 타입 체크 통과 (생성/수정된 파일에 에러 없음)
- 기존 data-testid 속성 및 UI 구조 완전 보존 (E2E 테스트 호환성 유지)
