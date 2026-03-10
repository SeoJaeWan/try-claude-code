# useAuth Hook - API Integration Summary

## Task
로그인 페이지에 useAuth 커스텀 훅을 만들고 API 연동

## Files Modified

### `features/next-app/hooks/auth/useAuth.ts` (modified)
- Rewrote the `useAuth` custom hook with full API integration
- Added client-side validation (`validateEmail`, `validatePassword`) before API calls
- Added `mounted` state for SSR hydration safety
- `login()` returns `string | null` (error message or null on success) instead of throwing
- `logout()` calls `/api/auth/logout` then clears local session (graceful degradation on API failure)
- `checkAuth()` validates stored token via `/api/auth/me` endpoint
- Session persistence: token, user, login timestamp in localStorage
- 30-minute session timeout with automatic expiry detection on mount

### `features/next-app/hooks/auth/useAuth.test.ts` (created)
- Unit tests covering:
  - Login success: API call, user/token persistence, state updates
  - Login failure: API error propagation, no state mutation
  - Client-side validation: email format, password length (skips API call)
  - Logout: local state cleanup even on API failure
  - checkAuth: token restoration, expired token cleanup
  - isLoading: loading state transitions during async operations
- Uses vitest + @testing-library/react with mocked `apiClient` and `localStorage`

### `features/next-app/hooks/auth/useLoginForm.ts` (modified)
- Updated to use new `useAuth` hook's return-value-based error handling (no try/catch needed)
- `handleSubmit` reads error from `login()` return value and sets `generalError`
- Added `useRouter` for explicit navigation on success (`router.push("/dashboard")`)

### `features/next-app/hooks/auth/index.ts` (already updated)
- Exports `useAuth` and `UseAuthReturn` type alongside existing `useLoginForm`

## Files Not Modified (intentional)

### `features/next-app/contexts/AuthContext.tsx`
- Kept as-is for backward compatibility
- Other pages (home, signup, profile, dashboard) depend on context-based `useAuth`
- The new hook-based `useAuth` in `hooks/auth/` is the API-integrated replacement used by the login flow

### `features/next-app/app/login/page.tsx`
- Already imports `useLoginForm` from `@/hooks/auth/useLoginForm` (no changes needed)

## Architecture

```
Login Page (app/login/page.tsx)
  -> useLoginForm (hooks/auth/useLoginForm.ts)  -- form state, validation, submit
       -> useAuth (hooks/auth/useAuth.ts)        -- API integration, token management
            -> apiClient (lib/api.ts)            -- HTTP client for /api/auth/*
                 -> /api/auth/login (route.ts)
                 -> /api/auth/logout (route.ts)
                 -> /api/auth/me (route.ts)
```

## API Endpoints Used
- `POST /api/auth/login` - Email/password authentication, returns user + token
- `POST /api/auth/logout` - Server-side session invalidation
- `GET /api/auth/me` - Token-based current user retrieval

## Notes
- Test runner (vitest) and testing libraries (@testing-library/react) need to be installed as devDependencies to run tests
- The `useAuth` hook is designed as a standalone hook (no provider required), unlike the context-based version
