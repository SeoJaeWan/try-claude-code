# useAuth Hook Implementation Summary

## Task
로그인 페이지에 useAuth 커스텀 훅을 만들고 API 연동

## Files Created

### 1. `features/next-app/hooks/auth/useAuth.ts` (NEW)
- Custom hook that centralizes authentication state management with API integration
- Uses `apiClient` from `@/lib/api` for login (`POST /auth/login`), logout (`POST /auth/logout`), and user fetch (`GET /auth/me`)
- Manages session persistence via localStorage (`auth_token`, `auth_user`, `auth_login_at`)
- Includes 30-minute session timeout check
- Auto-restores session on mount if a valid token exists
- Exposes: `user`, `isAuthenticated`, `isLoading`, `error`, `login()`, `logout()`, `fetchUser()`, `clearError()`

## Files Modified

### 2. `features/next-app/hooks/auth/useLoginForm.ts` (MODIFIED)
- Refactored to delegate login logic to the new `useAuth` hook instead of calling `apiClient` directly
- Removed direct dependency on `@/contexts/AuthContext` and `@/lib/api`
- Kept form-level validation (email/password field validation) separate from auth concerns
- Same public interface (`UseLoginFormReturn`) so the login page needs no changes

### 3. `features/next-app/hooks/auth/index.ts` (MODIFIED)
- Added `useAuth` and `UseAuthReturn` exports from `./useAuth`

## Architecture Decisions
- **Separation of concerns**: `useAuth` handles auth state + API calls; `useLoginForm` handles form state + validation
- **API-first with fallback**: Login calls the API endpoint; errors are surfaced to the form layer
- **Session management**: Token stored in localStorage and synced to `apiClient` singleton on mount
- **No changes to existing AuthContext**: The context-based `useAuth` in `@/contexts/AuthContext.tsx` remains for backward compatibility with other consumers (home page, navbar, etc.)
