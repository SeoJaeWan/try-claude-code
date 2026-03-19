# Eval 5: Signup Page Hook Extraction

## Task
Refactor the signup page to match the login page's hook composition pattern, extracting all inline logic into a custom form hook.

## Steps Taken

1. **Read skill file and coding rules** to understand conventions: arrow functions, `use*` prefix, `handle*` prefix for handlers, `hooks/utils/{domain}/{hookName}/index.ts` path pattern, default export.

2. **Analyzed the existing login page pattern** (`app/login/page.tsx` + `hooks/utils/login/useLoginForm/index.ts`) to understand the target boundary level:
   - Page component only imports the hook and renders UI
   - Hook owns all state (`useState`), validation, change handlers, blur handlers, and submit logic
   - Hook returns field values, errors, generalError, and all `handle*` callbacks

3. **Analyzed the existing signup page** (`app/signup/page.tsx`) which had all logic inline:
   - 4 form fields: name, email, password, confirmPassword
   - Field-level validation using `validateName`, `validateEmail`, `validatePassword`
   - Confirm password match validation (`password !== confirmPassword`)
   - `signup()` call from `useAuth` context
   - Router redirect on success

4. **Created `hooks/utils/signup/useSignupForm/index.ts`**:
   - Arrow function style with default export
   - All `useState` declarations moved into hook (name, email, password, confirmPassword, errors, generalError)
   - `validate()` function preserving all original validation including confirm password check
   - `handle*Change` handlers for each field (handleNameChange, handleEmailChange, handlePasswordChange, handleConfirmPasswordChange)
   - `handle*Blur` handlers for each field with individual field validation (including handleConfirmPasswordBlur for password match)
   - `handleSubmit` with preventDefault, validation, signup call, and router.push on success
   - Returns all field values, errors, generalError, and all handler callbacks

5. **Refactored `app/signup/page.tsx`**:
   - Removed all `useState`, `useRouter`, `useAuth`, validator imports
   - Single import of `useSignupForm` from `@/hooks/utils/signup/useSignupForm`
   - Destructures all values and handlers from the hook
   - Added `onBlur` handlers to all input fields (matching login page pattern)
   - Page is now pure UI composition, matching the login page boundary

## Files Created
- `hooks/utils/signup/useSignupForm/index.ts` - Form logic hook

## Files Modified
- `app/signup/page.tsx` - Refactored to consume useSignupForm hook

## Coding Rules Compliance
- Arrow function style for hook and all handlers
- `use*` prefix for hook name (useSignupForm)
- `handle*` prefix for all internal handlers
- Path: `hooks/utils/signup/useSignupForm/index.ts` (matches `hooks/utils/{domain}/{hookName}/index.ts`)
- Default export from entry file
- No additional hooks or components defined in entry file
- camelCase path segments
- Plural nouns for arrays (no `List`/`Array` suffixes)
- Confirm password validation preserved
