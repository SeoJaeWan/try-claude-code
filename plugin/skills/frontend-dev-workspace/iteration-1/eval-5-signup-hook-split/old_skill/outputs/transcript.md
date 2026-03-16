# Transcript: Signup Page Hook Split (old-frontend-dev skill)

## Task

Refactor the signup page to match the project convention's hook composition structure, aligning with the same boundary level as the login page.

## Steps Taken

### 1. Read SKILL.md (old-frontend-dev)

Read `plugin/skills/old-frontend-dev/SKILL.md`. Key instructions:
- Step 6: "Extract inline logic: if target component has inline fetch, useState (for business data), useEffect -- extract into custom hooks first"
- Hooks placement decision flow: page-specific hooks go to `app/{feature}/hooks/`
- Each hook uses directory pattern: `{hookName}/index.ts`
- Always attempt boilerplate generation first via `generate.mjs`

### 2. Read coding-rules.md

Read `plugin/skills/old-frontend-dev/references/coding-rules.md`. Key rules:
- Auth hooks naming: `use{Action}` (e.g., `useLogin`, `useLogout`)
- Hook placement: page-specific -> `app/{feature}/hooks/`
- Directory pattern: `{hookName}/index.ts`
- Hooks root resolution: first existing of `src/hooks/`, `app/hooks/`, `hooks/`

### 3. Read all input files

- `package.json`: Next.js 16, React 19, no test framework configured
- `app/signup/page.tsx`: Monolithic page with inline form state, validation, and submit logic
- `lib/validators.ts`: Shared validation functions (validateEmail, validatePassword, validateName)
- `contexts/AuthContext.tsx`: Auth context with signup method

### 4. Read login page for reference boundary

Read `app/login/page.tsx`. The login page also has inline logic (same pattern as signup). The task asks to match the same level of boundary -- meaning extract all business logic (form state, validation, submit handler) into a custom hook, leaving only JSX in the page component.

### 5. Attempted boilerplate generation

Ran `node generate.mjs hook useSignupForm --form`. Failed with `ERR_MODULE_NOT_FOUND` (test_suite.mjs missing). Per SKILL.md: "If scripts are not found (init-try not run), skip boilerplate generation and implement manually."

### 6. Implemented hook extraction

Created `useSignupForm` hook following the coding-rules placement decision flow:
- Page-specific hook -> `app/signup/hooks/useSignupForm/index.ts`

Extracted from page component:
- All `useState` calls (name, email, password, confirmPassword, errors, generalError)
- `validate()` function
- `handleSubmit()` function
- `useAuth()` and `useRouter()` calls

Hook returns: `{ name, setName, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, errors, generalError, handleSubmit }`

### 7. Refactored page component

Updated `app/signup/page.tsx`:
- Removed all inline state and logic
- Imported and called `useSignupForm()`
- Destructured all returned values
- Kept JSX template identical (same data-testid attributes, same classes, same structure)
- Removed unused imports (`useState`, `useRouter`, `useAuth`, validators)

## Files Created/Modified

| File | Action |
|------|--------|
| `app/signup/hooks/useSignupForm/index.ts` | Created (new hook) |
| `app/signup/page.tsx` | Modified (logic extracted to hook) |

## Boundary Alignment with Login Page

Both login and signup pages follow the same boundary pattern:
- **Page component**: Pure UI rendering, delegates all logic to a custom hook
- **Custom hook**: Owns form state, validation, submit handling, auth context interaction, and routing
