# Guard E2E Test Generation Summary

## Task

로그인 → 대시보드에서 할 일 추가 → /todos에서 완료 처리 → 대시보드 통계 반영 확인까지 전체 플로우 회귀 테스트 생성

## Generated File

`login-todo-complete-dashboard-stats.spec.ts`

Placed at:
- Output: `skills/guard-e2e-test-workspace/iteration-3/eval-2-todo-flow/with_skill/outputs/login-todo-complete-dashboard-stats.spec.ts`
- Project: `features/next-app/tests/guard/todo-flow/login-todo-complete-dashboard-stats.spec.ts`

## Journey

**JOURNEY-TODO-002**

`/login → /dashboard (할 일 추가) → /todos (완료 처리) → /dashboard (통계 확인)`

## Test Result

6/6 passed in 11.7s

```
6 passed (11.7s)
```

## Test Scenarios

| # | Type | Test Name |
|---|---|---|
| 1 | Happy flow | 로그인 후 대시보드에서 할 일을 추가하고, /todos에서 완료 처리하면 대시보드 통계가 갱신된다 |
| 2 | State persistence | 완료 처리 후 대시보드를 새로고침해도 통계 수치가 그대로 유지된다 |
| 3 | State persistence | 로그인 상태는 /dashboard에서 /todos로 이동한 후에도 유지된다 |
| 4 | Branch flow (data-state invariant) | 할 일을 추가만 하고 완료 처리하지 않으면 대시보드 완료 통계가 변경되지 않는다 |
| 5 | Branch flow (access control) | 인증 없이 /dashboard와 /todos에 직접 접근하면 /login으로 리다이렉트된다 |
| 6 | State persistence (session teardown) | 전체 여정 완료 후 로그아웃 시 localStorage 인증 키가 완전히 삭제된다 |

## Key Design Decisions

### Cookie Banner Pre-handling
`addInitScript`를 통해 모든 페이지 로드 전에 `localStorage.setItem("cookie-consent", "true")`를 설정해 쿠키 배너가 버튼 클릭을 가로막지 않게 처리했다.

### Test Isolation
- 각 테스트마다 `Date.now() + random suffix`로 고유한 이메일을 생성해 병렬 실행 시 계정 충돌을 방지한다.
- `registerAccount` 헬퍼는 회원가입 후 즉시 로그아웃해 깨끗한 비인증 상태를 만든다. 이를 통해 `/login` 경로가 실제로 동작함을 검증한다.

### Dynamic Todo ID Handling
TodoItem은 `crypto.randomUUID()`로 생성된 ID를 가진다. `data-testid^='todo-item-'` 패턴 매처로 항목을 찾고 ID를 추출해 `todo-checkbox-{id}` testid로 체크박스를 정확히 조작한다.

### Stats Verification
`StatsCard` 구조(`<div data-testid="stat-*"><p>숫자</p><p>레이블</p></div>`)에 맞게 `.locator("p").first()`로 숫자 값을 추출한다. `readStat` 헬퍼는 숫자를 정수로 파싱해 비교 연산에 사용할 수 있게 한다.

### Session Teardown Verification
로그아웃 후 단순 리다이렉트 확인만으로는 세션 파기를 보장할 수 없다. `page.evaluate`로 `auth_user`와 `auth_login_at` localStorage 키가 실제로 삭제됐는지 직접 검증한다.

### Branch Flow (Data-State Invariant)
해피 플로우("완료 처리 → 완료 통계 증가")의 역을 검증한다: 할 일을 추가만 하고 완료하지 않으면 완료 카운터는 변하지 않아야 한다. 이 패턴은 상태 누수 회귀를 탐지한다.

## Locators Used

| Element | Locator |
|---|---|
| 로그인 이메일 입력 | `getByTestId("login-email")` |
| 로그인 비밀번호 입력 | `getByTestId("login-password")` |
| 로그인 제출 버튼 | `getByTestId("login-submit")` |
| 인사 메시지 | `getByTestId("greeting")` |
| 전체 통계 카드 | `getByTestId("stat-total")` |
| 완료 통계 카드 | `getByTestId("stat-completed")` |
| 진행중 통계 카드 | `getByTestId("stat-pending")` |
| 할 일 입력 | `getByTestId("todo-input")` |
| 할 일 추가 버튼 | `getByTestId("todo-add")` |
| /todos 이동 링크 | `getByTestId("go-to-todos")` |
| Todo 항목 (동적) | `locator("[data-testid^='todo-item-']")` |
| Todo 체크박스 (동적) | `getByTestId("todo-checkbox-{id}")` |
| 대시보드 nav 링크 | `getByTestId("nav-dashboard")` |
| 할 일 nav 링크 | `getByTestId("nav-todos")` |
| nav 사용자 이메일 | `getByTestId("nav-user-email")` |
| 로그아웃 버튼 | `getByTestId("nav-logout")` |
