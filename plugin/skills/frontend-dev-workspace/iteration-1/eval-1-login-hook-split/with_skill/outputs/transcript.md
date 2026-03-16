# Transcript: Login Hook Split

## Task
로그인 페이지의 인라인 상태와 제출 로직을 프로젝트 컨벤션에 맞게 훅으로 분리. 페이지는 조합만 담당하게 정리.

## Steps

### 1. Read SKILL.md
- Confirmed CLI-first workflow: all hook files must be created via `tcf` CLI
- Core principle: components handle UI composition, hooks handle logic

### 2. Read all input files
- **package.json**: Next.js 16.1.6, React 19.2.3 project with Tailwind CSS
- **app/login/page.tsx**: Login page with inline state (`useState` for email, password, errors, generalError), inline validation logic (`validate()`), inline submit handler (`handleSubmit`), and inline blur handlers
- **lib/validators.ts**: Shared validation functions (`validateEmail`, `validatePassword`, etc.)
- **contexts/AuthContext.tsx**: Auth context providing `login()`, `signup()`, `logout()`, `updateProfile()` functions

### 3. Run `tcf` CLI to create hook scaffold
```bash
tcf hook --json '{"name":"useLoginForm","path":"hooks/login"}' --apply
```
- Generated scaffold at `hooks/login/useLoginForm/index.ts`
- Scaffold contains empty hook function with default export

### 4. Implement useLoginForm hook
Extracted the following from `page.tsx` into the hook:
- **State**: `email`, `password`, `errors`, `generalError` (all `useState` calls)
- **Dependencies**: `useAuth()` for `login()`, `useRouter()` for navigation
- **Logic**:
  - `validate()` - internal validation combining `validateEmail` and `validatePassword`
  - `handleEmailChange` / `handlePasswordChange` - state setters
  - `handleEmailBlur` / `handlePasswordBlur` - field-level validation on blur
  - `handleSubmit` - form submission with validation, login call, and redirect
- **Return interface** (`UseLoginFormReturn`): typed return object with all state values and handler functions
- Handler naming follows project convention: `handle*` prefix for internal handlers

### 5. Refactor page.tsx
- Removed all `useState`, `useRouter`, `useAuth`, and validator imports
- Added single import: `useLoginForm` from `@/hooks/login/useLoginForm`
- Destructured all needed values and handlers from the hook
- Page now contains zero business logic -- only UI composition and event wiring
- All `data-testid` attributes preserved for test compatibility
- All CSS classes preserved exactly as original

## Output Files
- `hooks/login/useLoginForm/index.ts` - New custom hook with all login form logic
- `app/login/page.tsx` - Refactored page (composition only, no inline state/logic)
