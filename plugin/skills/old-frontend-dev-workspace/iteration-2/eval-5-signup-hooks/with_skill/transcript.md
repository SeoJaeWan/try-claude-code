# Transcript: eval-5-signup-hooks (with_skill)

## Task

Refactor the signup page to match project conventions using a hook composition structure, at a similar boundary level as the login page.

## Input Files Read

- `features/frontend-dev-fixture/package.json` - Next.js 16 / React 19 project, no TanStack Query
- `features/frontend-dev-fixture/app/signup/page.tsx` - Original signup page with all logic inline
- `features/frontend-dev-fixture/lib/validators.ts` - validateEmail, validatePassword, validateName utilities
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` - AuthContext with `signup(email, password, name): string | null`
- `features/frontend-dev-fixture/app/login/page.tsx` - Reference: login page also has all logic inline (no hooks yet extracted)
- `plugin/skills/old-frontend-dev/references/coding-rules.md` - Coding conventions

## Analysis

### Original signup page problems

The original `app/signup/page.tsx` had all logic inline:
- Four `useState` calls for form fields (name, email, password, confirmPassword)
- Two `useState` calls for errors and generalError
- `validate()` function with field validation + confirm password match check
- `handleSubmit` orchestrating validation, API call, and routing

This is the same pattern as the login page — all logic lives in the page component, which violates the convention that "pages and components should mainly compose hooks and render UI."

### Boundary decision

The task says "로그인 페이지와 비슷한 수준의 경계" (similar boundary level as the login page). The login page has:
- Form state + field handlers + validation logic → belongs in a utils hook
- Auth API call (`login()` from AuthContext) → belongs in an API mutation hook

Signup mirrors this exactly:
1. `useSignupForm` (utils hook) — owns name/email/password/confirmPassword state, field handlers, and the full validation logic including confirm password match
2. `usePostSignup` (API mutation hook) — wraps the `signup()` call from AuthContext with a clean payload interface

`generalError` (server-side error state) stays in the page because it is orchestration-level state that bridges the two hooks, similar to how the page decides where to route after success.

### Conventions applied

- Arrow function style for all hooks and handlers (`const useSignupForm = (): ... => { ... }`)
- Internal handlers use `handle*` prefix: `handleNameChange`, `handleEmailChange`, `handlePasswordChange`, `handleConfirmPasswordChange`, `handleSubmit`
- Form hook path: `hooks/utils/signup/useSignupForm/index.ts` (domain = `signup` from `app/signup/page.tsx`)
- API hook path: `hooks/apis/auth/mutations/usePostSignup/index.ts` (auth domain, POST mutation)
- Hook names: `useSignupForm`, `usePostSignup` — both follow `use*` prefix rule
- Entry file is `index.ts` with default export for both hooks
- No additional hooks or React components defined inside hook entry files

### Confirm password validation

The confirm password check (`if (password !== confirmPassword) errs.confirmPassword = "비밀번호가 일치하지 않습니다"`) is preserved inside `useSignupForm.validate()`. The form hook has access to both `password` and `confirmPassword` state, so the check remains co-located with all other field validations.

## Output Files

| File | Purpose |
|------|---------|
| `hooks/utils/signup/useSignupForm/index.ts` | Form state, field handlers, full validation including confirm password match |
| `hooks/apis/auth/mutations/usePostSignup/index.ts` | Wraps AuthContext `signup()` as a mutation with typed payload |
| `app/signup/page.tsx` | Composes both hooks, owns only submit orchestration and generalError display |

## Validation Checklist

- [x] `useSignupForm` lives under `hooks/utils/signup/useSignupForm/index.ts`
- [x] `usePostSignup` lives under `hooks/apis/auth/mutations/usePostSignup/index.ts`
- [x] All path segments use camelCase
- [x] Entry files are `index.ts`
- [x] Main export names match hook names
- [x] Both hooks use arrow function style
- [x] Hook entry files define only the main hook (no additional hooks or components)
- [x] Internal handlers use `handle*` prefix
- [x] Confirm password validation preserved in form hook
- [x] Page only composes hooks and renders UI
