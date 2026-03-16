# Transcript: Login Hook Split (old-frontend-dev skill)

## Task

로그인 페이지 인라인 상태와 제출 로직을 프로젝트 컨벤션에 맞게 훅으로 분리. 페이지는 조합만 담당하게 정리.

## Steps

### 1. Read SKILL.md (old-frontend-dev)

Read `plugin/skills/old-frontend-dev/SKILL.md`. Key instructions:
- Read coding-rules.md before writing code
- Always attempt boilerplate generation with generate.mjs first
- Extract inline logic (fetch, useState for business data) into custom hooks
- Follow `{hooksRoot}` rules from coding-rules.md
- Each hook uses `{hookName}/index.ts` directory pattern

### 2. Read all input files

- **package.json**: Next.js 16.1.6, React 19.2.3, no test framework configured, no TanStack Query
- **app/login/page.tsx**: Login page with inline state (email, password, errors, generalError), inline validation logic, inline submit handler calling `useAuth().login()` and `router.push("/dashboard")`
- **lib/validators.ts**: Validation functions (validateEmail, validatePassword, etc.)
- **contexts/AuthContext.tsx**: AuthProvider with login/signup/logout/updateProfile; `login()` returns `string | null`

### 3. Read coding-rules.md

Read `plugin/skills/old-frontend-dev/references/coding-rules.md`. Key rules:
- Hooks Root Resolution: first existing of `src/hooks/`, `app/hooks/`, `hooks/`
- Hook Placement Decision Flow: page-specific hooks go to `app/{feature}/hooks/`
- Each hook uses directory pattern: `{hookName}/index.ts`
- Auth hooks (login) are mutations when placed in apis/, but this is page-specific form logic, not a direct API hook

### 4. Attempt boilerplate generation

Ran `node generate.mjs hook useLoginForm --form`. Failed with `ERR_MODULE_NOT_FOUND` (test_suite.mjs missing). Per SKILL.md: "If scripts are not found, skip boilerplate generation and implement manually."

### 5. Determine hook placement

Following the Hook Placement Decision Flow:
1. API call hook? No - this is form state + validation + delegation to AuthContext
2. Used in 2+ places? No - only used on login page
3. Page-specific? Yes -> `app/login/hooks/`

Result: `app/login/hooks/useLoginForm/index.ts`

### 6. Implement useLoginForm hook

Extracted from page.tsx:
- All useState declarations (email, password, errors, generalError)
- validate() function
- onBlur handlers for email and password (extracted as named functions)
- handleSubmit logic (validation, login call, router redirect)
- Dependencies: useAuth, useRouter, validateEmail, validatePassword

Return interface exposes: email, password, errors, generalError, setEmail, setPassword, handleEmailBlur, handlePasswordBlur, handleSubmit

### 7. Refactor page.tsx

- Removed all useState, useRouter, useAuth, validator imports
- Added import for useLoginForm hook
- Destructured all values from useLoginForm()
- Page now only handles composition: rendering UI and connecting hook values to JSX
- All data-testid attributes preserved for test compatibility
- All className styles preserved exactly

## Output files

| File | Description |
|------|-------------|
| `app/login/hooks/useLoginForm/index.ts` | New custom hook with login form state and submit logic |
| `app/login/page.tsx` | Refactored page - composition only, no inline state/logic |
