# Summary: 로그인 → 대시보드 할 일 추가 → /todos 완료 처리 → 대시보드 통계 반영 회귀 테스트

## 생성된 파일

- **Spec 파일**: `features/next-app/tests/guard/todo-flow/login-todo-complete-dashboard.spec.ts`
- **Journey ID**: `JOURNEY-TODO-001`
- **테스트 결과**: 5/5 통과 (7.3s)

## 분석한 플로우

```
/login → /dashboard (할 일 추가) → /todos (완료 처리) → /dashboard (통계 확인)
```

## 탐색에서 수집한 주요 정보

### 인증 메커니즘
- `localStorage`의 `auth_user`, `auth_login_at` 키로 세션 관리
- 로그아웃 시 두 키 모두 제거됨
- 비인증 상태에서 `/dashboard`, `/todos` 접근 시 `/login`으로 리다이렉트

### 차단 요소 발견: CookieBanner
- 신규 방문자에게 전체 화면을 덮는 쿠키 동의 배너가 표시됨 (`data-testid="cookie-banner"`)
- `localStorage`의 `cookie-consent: "true"` 플래그로 제어
- **대응**: `page.addInitScript()`를 통해 모든 페이지 로드 전에 플래그를 사전 설정

### 주요 data-testid 맵핑

| 요소 | data-testid |
|---|---|
| 로그인 이메일 입력 | `login-email` |
| 로그인 비밀번호 입력 | `login-password` |
| 로그인 버튼 | `login-submit` |
| 회원가입 이름 입력 | `signup-name` |
| 회원가입 이메일 입력 | `signup-email` |
| 회원가입 비밀번호 입력 | `signup-password` |
| 회원가입 비밀번호 확인 입력 | `signup-confirm-password` |
| 회원가입 제출 버튼 | `signup-submit` |
| 대시보드 인사 메시지 | `greeting` |
| 통계 - 전체 할 일 | `stat-total` |
| 통계 - 완료 | `stat-completed` |
| 통계 - 진행중 | `stat-pending` |
| 할 일 입력 | `todo-input` |
| 할 일 추가 버튼 | `todo-add` |
| /todos 이동 링크 | `go-to-todos` |
| 네비게이션 - 대시보드 | `nav-dashboard` |
| 네비게이션 - 할 일 | `nav-todos` |
| 네비게이션 - 로그아웃 | `nav-logout` |
| 네비게이션 - 사용자 이메일 | `nav-user-email` |
| 할 일 체크박스 | `todo-checkbox-{id}` (또는 role=checkbox + name) |

## 생성된 테스트 시나리오 (5개)

### 1. Happy flow - 전체 여정 통과
로그인 → 대시보드 통계 초기화(0/0/0) 확인 → 할 일 추가 → 통계 갱신(1/0/1) 확인 → /todos 이동 → 완료 처리 → 대시보드로 복귀 → 통계 갱신(1/1/0) 확인

### 2. State persistence - 세션 유지
로그인 → 대시보드 greeting 확인 → /todos 이동 → 세션 유지 확인 → 페이지 새로고침 후에도 세션 유지 확인

### 3. State persistence (teardown) - 로그아웃 시 클라이언트 상태 완전 제거
로그인 → 로그아웃 → localStorage에서 `auth_user`, `auth_login_at` 제거 확인 → /dashboard 재접근 시 /login 리다이렉트 확인

### 4. Branch flow (data-state invariant) - 완료하지 않으면 통계 불변
로그인 → 초기 완료 카운터 기록 → 할 일 추가 → /todos 이동 (체크박스 미클릭) → 대시보드 복귀 → 완료 카운터 불변 확인

### 5. Branch flow - 비인증 접근 리다이렉트
인증 없이 /dashboard 접근 → /login 리다이렉트 확인
인증 없이 /todos 접근 → /login 리다이렉트 확인

## 테스트 실행 결과

```
5 passed (7.3s)
```

모든 시나리오가 통과되었으며, 실제 브라우저 탐색을 통해 검증된 locator와 플로우를 기반으로 작성되었습니다.
