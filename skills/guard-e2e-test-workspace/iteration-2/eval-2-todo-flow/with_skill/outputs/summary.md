# Guard E2E Test Summary: 로그인 → 할 일 추가 → 완료 처리 → 통계 반영

## Journey

**ID**: JOURNEY-TODO-001
**Flow**: `/login` (via signup) → `/dashboard` (할 일 추가) → `/todos` (완료 처리) → `/dashboard` (통계 확인)
**App URL**: http://localhost:3000
**File**: `features/next-app/tests/guard/todo-flow/login-todo-complete-stats.spec.ts`

---

## Implementation Steps

### 1. Source Code Analysis

Read the following files to understand data-testid attributes and app behavior before live exploration:

- `app/dashboard/page.tsx` — stats testids (`stat-total`, `stat-completed`, `stat-pending`), todo form (`todo-input`, `todo-add`), nav link (`go-to-todos`)
- `app/todos/page.tsx` — dynamic testids (`todo-item-{id}`, `todo-checkbox-{id}`)
- `components/StatsCard.tsx` — structure: `<div data-testid="stat-*"><p>숫자</p><p>레이블</p></div>`
- `components/TodoForm.tsx` — `todo-input`, `todo-add`
- `components/TodoItem.tsx` — `todo-item-{id}`, `todo-checkbox-{id}`, `todo-text-{id}`
- `components/Navbar.tsx` — `nav-logout`, `nav-dashboard`, `nav-todos`
- `contexts/AuthContext.tsx` — localStorage keys: `auth_user`, `auth_login_at`, `auth_users`
- `contexts/TodoContext.tsx` — localStorage key: `todos`

### 2. Browser Exploration (agent-browser CLI)

Explored the live app at http://localhost:3000 to verify:

- `/signup` → after signup, redirects to `/dashboard` ✓
- `/login` → after login, redirects to `/dashboard` ✓
- Dashboard stats (`stat-total`, `stat-completed`, `stat-pending`) update immediately after adding a todo ✓
- `go-to-todos` link navigates to `/todos` ✓
- `/todos` page shows todo items with `todo-item-{uuid}` and `todo-checkbox-{uuid}` testids ✓
- Toggling checkbox marks todo as completed (persisted in localStorage `todos`) ✓
- Navigating back to `/dashboard` shows updated stats ✓
- Unauthenticated access to `/todos` and `/dashboard` redirects to `/login` ✓
- StatsCard: first `<p>` child contains the numeric value (not the label) ✓

### 3. Test Design

**Helper functions**:
- `signupAndLogin()` — signs up via `/signup` form and asserts redirect to `/dashboard`
- `getStatNumber()` — reads the numeric value from a StatsCard by querying the first `<p>` child

**Key insight — StatsCard locator**: The stat value is in `[data-testid="stat-*"] p:first-child`, not directly in the `data-testid` element. Used `.locator("p").first()` to target it.

**Key insight — dynamic todo IDs**: TodoItem testids are `todo-item-{uuid}` with UUIDs generated at runtime. Tests use `[data-testid^='todo-item-']` locator + `.getAttribute("data-testid")` to extract the UUID for subsequent checkbox clicks.

---

## Test Cases (6 total, all passing)

| # | Type | Description |
|---|---|---|
| 1 | Happy flow | 전체 여정: 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 통계 반영 확인 |
| 2 | State persistence | 완료 처리 후 대시보드 새로고침해도 통계가 유지된다 |
| 3 | Branch (data invariant) | 완료 처리 없이 추가만 하면 완료 통계가 변하지 않는다 |
| 4 | Branch (access control) | 비인증 상태 /todos 접근 → /login 리다이렉트 |
| 5 | Branch (access control) | 비인증 상태 /dashboard 접근 → /login 리다이렉트 |
| 6 | State teardown | 로그아웃 후 localStorage auth_user, auth_login_at 삭제 확인 |

---

## Verification Result

```
Running 6 tests using 1 worker
  6 passed (7.5s)
```

All 6 tests pass on the first run.

---

## data-testid Reference

| Element | data-testid |
|---|---|
| 로그인 이메일 입력 | `login-email` |
| 로그인 비밀번호 입력 | `login-password` |
| 로그인 버튼 | `login-submit` |
| 회원가입 이름 | `signup-name` |
| 회원가입 이메일 | `signup-email` |
| 회원가입 비밀번호 | `signup-password` |
| 회원가입 확인 비밀번호 | `signup-confirm-password` |
| 회원가입 버튼 | `signup-submit` |
| 인사 메시지 | `greeting` |
| 전체 할 일 통계 | `stat-total` |
| 완료 통계 | `stat-completed` |
| 진행중 통계 | `stat-pending` |
| 할 일 입력 | `todo-input` |
| 할 일 추가 버튼 | `todo-add` |
| /todos 이동 링크 | `go-to-todos` |
| 할 일 항목 | `todo-item-{id}` |
| 할 일 체크박스 | `todo-checkbox-{id}` |
| 내비게이션 대시보드 | `nav-dashboard` |
| 내비게이션 할 일 | `nav-todos` |
| 내비게이션 로그아웃 | `nav-logout` |
