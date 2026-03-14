# Login Hook Composition - Summary

## What was done

The login page (`features/next-app/app/login/page.tsx`) was refactored by extracting its logic into two custom hooks and recomposing them in the page component.

### 1. `useLoginForm` hook — Form state and validation

Extracts all form-related state and validation logic:

- `email` / `password` state with setters
- `errors` record for field-level validation messages
- `validateField(field)` — validates a single field (used on blur)
- `validateAll()` — validates all fields at once, returns `true` if valid
- `resetErrors()` — clears all field errors

Uses `@/lib/validators` (`validateEmail`, `validatePassword`) for validation rules, matching the original behavior.

### 2. `useLogin` hook — Login API call

Encapsulates the authentication call and navigation:

- `generalError` — server/auth-level error message (e.g., wrong password)
- `handleLogin(email, password)` — calls `useAuth().login()`, navigates to `/dashboard` on success
- `clearError()` — resets the general error

### 3. Refactored `page.tsx` — Composition

The page component now composes both hooks and wires them together in `handleSubmit`:

1. Clears any previous general error
2. Runs form validation via `validateAll()`
3. If valid, calls `handleLogin(email, password)`

All `data-testid` attributes, CSS classes, and UI structure are preserved identically.

## Files created

| File | Description | Target path in app |
|------|-------------|--------------------|
| `useLoginForm.ts` | Form state & validation hook | `features/next-app/hooks/useLoginForm.ts` |
| `useLogin.ts` | Login API hook | `features/next-app/hooks/useLogin.ts` |
| `page.tsx` | Refactored login page | `features/next-app/app/login/page.tsx` |
| `summary.md` | This summary | — |

## Output file paths

- `evals/frontend-dev-workspace/iteration-4/login-hook-composition/without_skill/outputs/useLoginForm.ts`
- `evals/frontend-dev-workspace/iteration-4/login-hook-composition/without_skill/outputs/useLogin.ts`
- `evals/frontend-dev-workspace/iteration-4/login-hook-composition/without_skill/outputs/page.tsx`
- `evals/frontend-dev-workspace/iteration-4/login-hook-composition/without_skill/outputs/summary.md`
