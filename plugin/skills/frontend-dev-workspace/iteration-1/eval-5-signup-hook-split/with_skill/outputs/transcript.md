# Transcript: Signup Hook Split

## Task
Refactor the signup page to match the project convention of hook composition structure, aligned with the same boundary level as the login page.

## Steps

### 1. Read SKILL.md
Read the frontend-dev skill instructions. Key takeaway: all hook files must be created via `tcf` CLI, never manually. The core principle is "Component = UI + Custom Hooks".

### 2. Read all input files
- **`app/signup/page.tsx`** -- Monolithic page with inline state management (6 useState calls), validation logic, and submit handler all embedded directly in the component.
- **`lib/validators.ts`** -- Shared validation functions (validateEmail, validatePassword, validateName).
- **`contexts/AuthContext.tsx`** -- Auth context providing signup/login/logout functions.
- **`package.json`** -- Next.js 16 + React 19 project.

### 3. Analyze login page as reference
Read `app/login/page.tsx` and found it has a `hooks/useLoginForm/` directory structure under the login route. The login page pattern shows the same inline logic structure as signup (useState + validate + handleSubmit). The convention is to extract form state, validation, and submission into a page-level custom hook under `app/{page}/hooks/use{Page}Form/index.ts`.

### 4. Create hook scaffold via tcf CLI
Ran:
```bash
tcf hook --json '{"name":"useSignupForm","path":"app/signup/hooks"}' --apply
```
This created `app/signup/hooks/useSignupForm/index.ts` with the standard hook scaffold (empty arrow function with default export).

### 5. Implement useSignupForm hook
Extracted all business logic from the signup page into the hook:
- All 6 `useState` declarations (name, email, password, confirmPassword, errors, generalError)
- `useAuth()` and `useRouter()` calls
- `validate()` function with field-level validation including confirm password match
- `handleSubmit()` handler with validation, signup call, error handling, and navigation

The hook returns all state values, setters, errors, generalError, and handleSubmit -- matching the same boundary as the login page pattern.

### 6. Refactor page component
Simplified `app/signup/page.tsx` to:
- Import and destructure `useSignupForm` hook
- Pure UI rendering with no business logic
- Removed direct imports of `useState`, `useRouter`, `useAuth`, and validators
- All data-testid attributes preserved for test compatibility

## Output files
- `app/signup/hooks/useSignupForm/index.ts` -- New custom hook with all form logic
- `app/signup/page.tsx` -- Refactored page component using the hook
