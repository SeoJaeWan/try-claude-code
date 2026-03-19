# Transcript: Login Hook Extraction

## Task

Extract inline state and submit logic from the login page into a custom hook following project conventions. The page should only compose hooks and render UI.

## Input Analysis

### Original `app/login/page.tsx`

The page contained all business logic inline:

- `useState` for `email`, `password`, `errors`, `generalError`
- `validate()` function calling `validateEmail` and `validatePassword`
- `handleSubmit` calling `login()` from `AuthContext` and navigating on success
- Inline `onChange`/`onBlur` arrow functions directly inside JSX props

This violated the convention: "Pages and components should mainly compose hooks and render UI."

### Coding Rules Applied

From `coding-rules.md`:

- Custom hook path: `hooks/utils/{domain}/{hookName}/index.ts` where domain comes from `app/{domain}/page.tsx`
  - `app/login/page.tsx` -> `hooks/utils/login/useLoginForm/index.ts`
- Arrow function style for all hooks
- Internal handlers use `handle*` prefix (not inline lambdas in JSX)
- Entry file is `index.ts` with default export
- Hook entry file defines the main hook only

## Decisions Made

### Hook name: `useLoginForm`

The hook manages the login form's state and submit behavior. The name follows the `use[A-Z][A-Za-z0-9]*` pattern and accurately describes its responsibility.

### Extracted into hook

- `email`, `password`, `errors`, `generalError` state
- `handleEmailChange`, `handlePasswordChange` — onChange handlers with `handle*` prefix
- `handleEmailBlur`, `handlePasswordBlur` — onBlur handlers (previously inline arrow functions in JSX)
- `handleSubmit` — validation + login call + navigation

The `validate` helper function from the original page was inlined inside `handleSubmit` directly, since it was a single-use private function and the hook entry file should define only the main hook (no additional exports).

### Page after refactor

The page only:
1. Imports `useLoginForm` from `@/hooks/utils/login/useLoginForm`
2. Destructures all values from the hook
3. Renders the UI using those values

All `useState`, `useRouter`, `useAuth`, and `validateEmail`/`validatePassword` imports were removed from the page — they now live entirely in the hook.

## Output Files

- `hooks/utils/login/useLoginForm/index.ts` — the extracted custom hook
- `app/login/page.tsx` — refactored page that composes the hook

## Validation Against Coding Rules

- [x] File lives under `hooks/utils/login/useLoginForm/index.ts`
- [x] All path segments use camelCase
- [x] Entry file is `index.ts`
- [x] Main export name matches the hook name (`useLoginForm`)
- [x] Hook uses arrow function style (`const useLoginForm = () => { ... }`)
- [x] Hook entry file does not define additional hooks
- [x] Hook entry file does not define React components
- [x] Internal handlers use `handle*` prefix
- [x] Page only composes hooks and renders UI
