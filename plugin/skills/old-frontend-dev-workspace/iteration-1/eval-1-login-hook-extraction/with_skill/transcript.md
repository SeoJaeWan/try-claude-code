# Eval 1 - Login Hook Extraction (with skill)

## Task
로그인 페이지 인라인 상태와 제출 로직을 프로젝트 컨벤션에 맞게 훅으로 분리. 페이지는 조합만 담당하게 정리.

## Steps

1. Read skill file (`SKILL.md`) and coding rules (`references/coding-rules.md`).
2. Read input files: `app/login/page.tsx`, `lib/validators.ts`, `contexts/AuthContext.tsx`, `package.json`.
3. Identified inline logic in `LoginPage`: `useState` for email/password/errors/generalError, `validate()`, `handleSubmit()`, and inline `onBlur` validation handlers.
4. Created custom hook `useLoginForm` at `hooks/utils/login/useLoginForm/index.ts` following coding rules:
   - Path follows `hooks/utils/{domain}/{hookName}/index.ts` pattern (domain = `login` from `app/login/page.tsx`).
   - Arrow function style with default export.
   - `handle*` prefix for all internal handlers (`handleSubmit`, `handleEmailChange`, `handlePasswordChange`, `handleEmailBlur`, `handlePasswordBlur`).
   - All state (`email`, `password`, `errors`, `generalError`) moved into the hook.
   - Validation logic (per-field on blur, full form on submit) moved into the hook.
   - Login call and router navigation moved into the hook.
5. Updated `app/login/page.tsx` to only compose the hook and render UI:
   - Removed all `useState`, `useRouter`, `useAuth`, and validator imports.
   - Page imports only `Link` and `useLoginForm`.
   - All logic delegated to `useLoginForm()` return values.
   - JSX unchanged (same data-testid attributes, same structure).

## Files Created
- `hooks/utils/login/useLoginForm/index.ts` - Custom hook containing login form state and logic.

## Files Modified
- `app/login/page.tsx` - Refactored to compose `useLoginForm` hook; no inline state or business logic remains.

## Validation Checklist
- [x] File lives under `hooks/utils/*`
- [x] Path matches `hooks/utils/{domain}/{hookName}/index.ts` (`hooks/utils/login/useLoginForm/index.ts`)
- [x] All path segments use camelCase
- [x] Entry file is `index.ts`
- [x] Main export name matches the hook name (`useLoginForm`)
- [x] Hook uses arrow function style
- [x] Hook entry file does not define additional hooks
- [x] Hook entry file does not define React components
- [x] Internal handlers use `handle*` prefix
- [x] No `List` or `Array` suffixes
- [x] Page only composes hooks and renders UI
