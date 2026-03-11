# Guard E2E Test: 회원가입 → 대시보드 → 로그아웃 여정

## 작업 요약

`/signup` → `/dashboard` → 로그아웃까지의 전체 인증 여정을 커버하는 E2E 회귀 테스트를 생성하고 실행 검증했습니다.

---

## 생성 파일

- **테스트 파일**: `features/next-app/tests/guard/auth/signup-dashboard-logout.spec.ts`
- **Journey ID**: `JOURNEY-AUTH-001`

---

## 구현 단계

### 1. 여정 분석

소스 코드 분석으로 다음을 파악했습니다:
- `AuthContext.tsx`: localStorage 기반 세션 (`auth_user`, `auth_login_at`). `logout()`은 두 항목 삭제 후 `/login` 리다이렉트
- `signup/page.tsx`: 회원가입 성공 시 `router.push("/dashboard")`
- `dashboard/page.tsx`: `isAuthenticated` 미충족 시 `router.push("/login")` 실행 (보호된 라우트)
- `Navbar.tsx`: `data-testid="nav-logout"` 버튼 존재, 인증 시 표시

### 2. 프로젝트 컨벤션 확인

- `playwright.config.ts`: `testDir: "./tests"`, `baseURL: "http://localhost:3000"`
- 기존 테스트(`auth-login.spec.ts`)에서 `addInitScript`로 쿠키 배너 사전 동의 패턴 확인
- 기존 테스트에는 `guard/` 디렉토리가 없어 신규 생성

### 3. 브라우저 탐색 (agent-browser CLI)

실제 앱을 탐색하여 수집한 정보:
- 쿠키 배너가 첫 번째 방문 시 `동의` 버튼을 표시하며 폼 제출 버튼을 가림 → `initScript`로 사전 처리 필요
- 회원가입 폼 `data-testid`: `signup-name`, `signup-email`, `signup-password`, `signup-confirm-password`, `signup-submit`
- 회원가입 성공 → URL이 `/dashboard`로 변경
- 대시보드에서 `greeting` heading에 사용자 이름 표시 (`안녕하세요, {name}님`)
- 로그아웃 후 localStorage에서 `auth_user`, `auth_login_at` 삭제 확인 (`auth_users` 사용자 DB는 유지)
- 비인증 상태 `/dashboard` 접근 → `/login`으로 리다이렉트 확인

### 4. 테스트 시나리오 (5개)

| 유형 | 테스트명 |
|---|---|
| Happy flow | 회원가입부터 로그아웃까지 전체 플로우가 정상 동작한다 |
| State persistence | 대시보드 새로고침 후에도 로그인 상태가 유지된다 |
| State persistence (teardown) | 로그아웃 시 클라이언트 세션 상태가 완전히 제거된다 |
| Branch flow | 인증 없이 대시보드 직접 접근 시 로그인 페이지로 리다이렉트된다 |
| Branch flow (data-state) | 이미 가입된 이메일로 재가입 시 에러가 표시되고 대시보드로 진입하지 않는다 |

### 5. 테스트 실행 결과

```
5 passed (5.4s)
```

모든 5개 테스트가 통과했습니다.

---

## 주요 설계 결정

- **쿠키 배너 처리**: `addInitScript`로 `localStorage.setItem("cookie-consent", "true")` 사전 설정 — 기존 테스트 컨벤션 준수
- **이메일 고유성**: `Date.now()` 기반 이메일로 테스트 간 `auth_users` 충돌 방지
- **세션 파기 검증**: 로그아웃 테스트에서 URL 리다이렉트만 확인하지 않고 `localStorage.getItem("auth_user")`, `localStorage.getItem("auth_login_at")` 실제 삭제를 직접 검증 — stale 토큰에 의한 ghost login 회귀 방어
- **독립적 테스트**: 각 테스트가 독립적으로 실행 가능하도록 공유 상태 없이 설계
