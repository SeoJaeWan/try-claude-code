# Guard E2E Test Generation Summary

## Task
로그인 → 대시보드에서 할 일 추가 → /todos에서 완료 처리 → 대시보드 통계 반영 확인까지 전체 플로우 회귀 테스트

## Generated File
`tests/guard/todo-flow/login-add-complete-stats-flow.spec.ts`

## Journey
- **ID**: JOURNEY-TODO-001
- **Flow**: `/login → /dashboard (할 일 추가) → /todos (완료 처리) → /dashboard (통계 확인)`
- **App URL**: http://localhost:3000

## Test Results
6 tests passed in 9.1s

## Tests Generated

### 1. 해피 플로우 (Happy Flow)
**[JOURNEY-TODO-001] 로그인 후 대시보드에서 할 일 추가, /todos에서 완료 처리 시 대시보드 통계가 반영된다**
- 로그인 → /dashboard 진입 → 인사말/초기 통계(0,0,0) 확인
- 대시보드 빠른 추가 폼으로 할 일 추가 → 즉시 통계 반영(1,0,1) 확인
- /todos로 이동하여 할 일 표시 확인
- 체크박스로 완료 처리 → /dashboard 복귀 → 통계 갱신(1,1,0) 확인

### 2. 상태 지속성 - 새로고침 후 통계 유지
**[JOURNEY-TODO-001] 완료 처리 후 대시보드 새로고침해도 통계가 유지된다**
- 완료 처리 후 /dashboard에서 page.reload() 호출
- 새로고침 후에도 통계(1,1,0)가 올바르게 유지됨을 검증

### 3. 상태 지속성 - 경로 전환 후 인증 상태 유지
**[JOURNEY-TODO-001] 로그인 상태는 /dashboard → /todos 경로 전환 및 새로고침 후에도 유지된다**
- /dashboard → /todos 이동 후 nav-user-email 표시 확인
- /todos 새로고침 후에도 인증 상태 유지 검증

### 4. 분기 플로우 - 데이터 상태 불변 (해피 플로우의 역)
**[JOURNEY-TODO-001] 할 일을 추가만 하고 완료 처리하지 않으면 대시보드 완료 통계가 변경되지 않는다**
- 할 일 추가 후 /todos 방문하지만 체크박스 클릭 안 함
- 대시보드 복귀 후 완료 통계(0)가 그대로임을 검증
- 전체(1), 진행중(1)만 증가했음을 확인

### 5. 분기 플로우 - 비인증 접근 제어
**[JOURNEY-TODO-001] 인증 없이 /dashboard와 /todos에 직접 접근하면 /login으로 리다이렉트된다**
- 비인증 상태에서 /dashboard 직접 접근 → /login 리다이렉트 확인
- 비인증 상태에서 /todos 직접 접근 → /login 리다이렉트 확인

### 6. 상태 지속성 - 세션 종료 (teardown 검증)
**[JOURNEY-TODO-001] 전체 여정 완료 후 로그아웃 시 클라이언트 인증 상태가 완전히 제거된다**
- 전체 플로우 수행 후 nav-logout 클릭
- localStorage의 `auth_user`, `auth_login_at` 키가 실제 삭제됐는지 검증
- 쿠키에 인증 관련 항목 없음 확인
- 로그아웃 후 /dashboard 재접근 시 /login 리다이렉트 확인

## App Exploration Findings

### Data-testid Inventory
| Component | testid |
|---|---|
| 로그인 이메일 입력 | `login-email` |
| 로그인 비밀번호 입력 | `login-password` |
| 로그인 제출 버튼 | `login-submit` |
| 회원가입 이름 입력 | `signup-name` |
| 회원가입 이메일 입력 | `signup-email` |
| 회원가입 비밀번호 입력 | `signup-password` |
| 회원가입 비밀번호 확인 입력 | `signup-confirm-password` |
| 회원가입 제출 버튼 | `signup-submit` |
| 대시보드 인사말 | `greeting` |
| 전체 통계 카드 | `stat-total` |
| 완료 통계 카드 | `stat-completed` |
| 진행중 통계 카드 | `stat-pending` |
| 할 일 입력 폼 | `todo-input` |
| 할 일 추가 버튼 | `todo-add` |
| 전체 할 일 목록 링크 | `go-to-todos` |
| Todo 아이템 (동적) | `todo-item-{id}` |
| Todo 체크박스 (동적) | `todo-checkbox-{id}` |
| 대시보드 nav 링크 | `nav-dashboard` |
| 할 일 nav 링크 | `nav-todos` |
| 로그아웃 버튼 | `nav-logout` |
| 로그인 사용자 이메일 | `nav-user-email` |

### Key Technical Notes
- StatsCard 구조: `<div data-testid="stat-*"><p>숫자</p><p>레이블</p></div>` → `.locator("p").first()`로 숫자 접근
- Todo ID는 crypto.randomUUID()로 생성 → `[data-testid^='todo-item-']` 패턴으로 첫 항목 ID 추출
- 인증 상태는 localStorage에 `auth_user`, `auth_login_at` 키로 관리
- 쿠키 배너: `localStorage.setItem("cookie-consent", "true")` 로 사전 처리

## Skill Used
`guard-e2e-test` (skill-snapshot-old)
