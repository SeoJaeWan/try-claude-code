# Guard E2E Test: 회원가입 → 대시보드 → 로그아웃 여정

## Generated File

`signup-dashboard-logout.spec.ts`

## Journey

- journey_id: `JOURNEY-AUTH-001`
- flow: `/signup` → `/dashboard` → logout → `/login`
- app_url: `http://localhost:3000`

## App Structure Discovered

### Auth mechanism

The app uses `localStorage`-based session persistence (no HTTP-only cookies, no server-side sessions).

- Login state: `auth_user` (JSON-serialized User object) + `auth_login_at` (timestamp ms)
- User registry: `auth_users` (array of `{ email, password, user }`)
- Session timeout: 30 minutes (checked on mount)

### Relevant data-testids

| Element | data-testid |
|---|---|
| Name input (signup) | `signup-name` |
| Email input (signup) | `signup-email` |
| Password input (signup) | `signup-password` |
| Confirm password input | `signup-confirm-password` |
| Submit button (signup) | `signup-submit` |
| Signup error message | `signup-error` |
| Dashboard greeting | `greeting` |
| Logout button (desktop nav) | `nav-logout` |

### Cookie banner

A cookie consent banner is present on first visit. The test sets `cookie-consent: "true"` via `addInitScript` in `beforeEach` to prevent the banner from blocking button clicks.

## Test Scenarios

| # | Type | Description |
|---|---|---|
| 1 | Happy flow | `/signup` 폼 제출 → `/dashboard` 리다이렉트 → greeting 표시 → `nav-logout` 클릭 → `/login` 리다이렉트 → `/dashboard` 재접근 차단 |
| 2 | State persistence | 회원가입 후 대시보드에서 `reload()` → 여전히 `/dashboard`에 머물고 greeting이 표시된다 |
| 3 | State teardown (persistence) | 로그아웃 후 `auth_user`, `auth_login_at`이 localStorage에서 실제로 삭제됨을 직접 검증. 단순 URL 리다이렉트만으로는 세션 파기를 보장할 수 없기 때문 |
| 4 | Branch flow (unauthenticated) | 로그인 없이 `/dashboard` 직접 접근 → `/login`으로 리다이렉트 |
| 5 | Branch flow (duplicate email) | 동일 이메일로 재가입 시도 → `signup-error` 표시, `/signup`에 머묾 |

## Design Decisions

- **Unique email per test**: `Date.now()` suffix prevents `auth_users` collision between tests run in the same browser context.
- **State teardown verification**: Rather than only checking URL after logout, the test directly reads `localStorage` to confirm both `auth_user` and `auth_login_at` are null. This catches regressions where the session is not properly cleared (ghost login risk).
- **nav-logout vs mobile-logout**: The test uses `nav-logout` (desktop nav button). Playwright's default headless viewport is 1280x720, so the desktop nav is visible and `nav-logout` is reachable without opening the hamburger menu.
- **cookie-consent initScript**: Set before page load so the banner never renders, ensuring deterministic click targeting throughout the journey.

## Test placement

```
tests/guard/auth/signup-dashboard-logout.spec.ts
```
