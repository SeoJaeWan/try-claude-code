# Guard E2E Test Generation Summary

## Task
회원가입 → 대시보드 → 로그아웃까지 전체 플로우 E2E 테스트 생성

## Generated File
`tests/guard/auth/signup-dashboard-logout.spec.ts`

## Journey Info
- **journey_id**: JOURNEY-AUTH-001
- **flow**: `/signup → /dashboard → logout → /login`
- **app_url**: http://localhost:3000

## App Exploration Findings

### Signup Page (`/signup`)
- Form fields with `data-testid`: `signup-name`, `signup-email`, `signup-password`, `signup-confirm-password`
- Submit button: `data-testid="signup-submit"`
- Error message area: `data-testid="signup-error"` (general errors)
- Per-field errors: `name-error`, `email-error`, `password-error`, `confirm-password-error`
- Validation: name required, email valid format required, password >= 8 chars, passwords must match

### Dashboard Page (`/dashboard`)
- Greeting: `data-testid="greeting"` — shows "안녕하세요, {name}님"
- Auth guard: redirects to `/login` if unauthenticated (via `useEffect`)
- Stats cards: `stat-total`, `stat-completed`, `stat-pending`

### Navbar
- Authenticated state: `nav-dashboard`, `nav-todos`, `nav-profile`, `nav-user-email`, `nav-logout`
- Unauthenticated state: `nav-login`, `nav-signup`
- Logout button: `data-testid="nav-logout"` (desktop) / `data-testid="mobile-logout"` (mobile)

### Auth State (localStorage)
- `auth_user`: JSON of current user object
- `auth_login_at`: timestamp of login
- `auth_users`: registry of all registered users
- Session timeout: 30 minutes

### Cookie Banner
- Suppressed via `localStorage.setItem("cookie-consent", "true")` in `test.beforeEach` `addInitScript`

## Test Scenarios (5 tests)

| Test | Type | Description |
|---|---|---|
| [JOURNEY-AUTH-001] 회원가입부터 로그아웃까지 전체 플로우가 정상 동작한다 | Happy flow | Full end-to-end: signup → dashboard redirect → greeting visible → logout → redirect to /login → /dashboard blocked |
| [JOURNEY-AUTH-001] 대시보드 새로고침 후에도 로그인 상태가 유지된다 | State persistence | Auth state survives page reload (localStorage-based session) |
| [JOURNEY-AUTH-001] 로그아웃 시 클라이언트 세션 상태가 완전히 제거된다 | State persistence (teardown) | Verifies `auth_user` and `auth_login_at` actually removed from localStorage, plus no auth cookies |
| [JOURNEY-AUTH-001] 인증 없이 대시보드 직접 접근 시 로그인 페이지로 리다이렉트된다 | Branch flow (unauthenticated access) | Direct /dashboard access without auth redirects to /login |
| [JOURNEY-AUTH-001] 이미 가입된 이메일로 재가입 시 에러가 표시되고 대시보드로 진입하지 않는다 | Branch flow (data-state invariant) | Duplicate signup shows error, stays on /signup — inverse: successful signup must use a fresh email |

## Test Run Results
```
5 passed (4.8s)
```

All 5 tests pass against the live app at http://localhost:3000.

## Conventions Applied
- File placement: `tests/guard/auth/signup-dashboard-logout.spec.ts`
- `test.describe` prefix: `[Guard]`
- `journey_id` in each test name: `[JOURNEY-AUTH-001]`
- Korean test descriptions
- AAA pattern (Arrange/Act/Assert with comments)
- `addInitScript` in `beforeEach` to set `cookie-consent` before page load
- Unique email per test using `Date.now()` to avoid `auth_users` conflicts
- `data-testid` locators exclusively (no CSS/XPath)
- No `page.waitForTimeout()` — Playwright auto-waiting used throughout
