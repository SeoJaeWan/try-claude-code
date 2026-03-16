# Guard E2E Test — 회원가입 → 대시보드 → 로그아웃 여정

## 결과 요약

- 생성된 테스트 파일: `features/next-app/tests/guard/auth/signup-dashboard-logout.spec.ts`
- 테스트 실행 결과: **5/5 통과** (5.4s)

## 여정 분석

### Journey ID
`JOURNEY-AUTH-001`

### 플로우 체인
`/signup` → `/dashboard` → 로그아웃 → `/login`

### 상태 전환
- 회원가입 폼 제출 → localStorage에 `auth_user`, `auth_login_at` 저장 → `/dashboard` 리다이렉트
- 대시보드에서 인증 상태 확인 (`isAuthenticated = true`)
- 로그아웃 → localStorage에서 `auth_user`, `auth_login_at` 제거 → `/login` 리다이렉트

## 브라우저 탐색으로 발견한 사항

1. **회원가입 폼 testid**: `signup-name`, `signup-email`, `signup-password`, `signup-confirm-password`, `signup-submit`
2. **대시보드 testid**: `greeting` (환영 메시지), `nav-logout` (로그아웃 버튼)
3. **인증 상태 저장소**: localStorage 사용 (`auth_user`, `auth_login_at`, `auth_users`)
4. **쿠키 배너**: `cookie-consent` localStorage 항목으로 제어 — `addInitScript`로 사전 처리 필요
5. **미인증 대시보드 접근**: `useEffect`에서 `router.push("/login")` 호출 → `/login` 리다이렉트

## 생성된 테스트 시나리오 (5개)

| # | 유형 | 설명 |
|---|------|------|
| 1 | Happy flow | 회원가입 → 대시보드 진입 → 로그아웃 → 대시보드 재접근 차단 |
| 2 | State persistence | 페이지 새로고침 후 로그인 상태 유지 확인 |
| 3 | State persistence (teardown) | 로그아웃 시 localStorage auth 항목 완전 제거 확인 |
| 4 | Branch flow | 미인증 상태에서 `/dashboard` 직접 접근 → `/login` 리다이렉트 |
| 5 | Branch flow | 이미 가입된 이메일 재가입 시도 → 에러 메시지 표시, 페이지 이동 없음 |

## 주요 설계 결정

- **테스트 격리**: 각 테스트마다 `Date.now()` 기반 고유 이메일 생성 — `auth_users` 충돌 방지
- **세션 파기 검증**: 리다이렉트 확인만으로는 부족 — localStorage에서 `auth_user`/`auth_login_at` 직접 null 확인
- **쿠키 배너 처리**: `beforeEach`에서 `addInitScript`로 `cookie-consent: true` 사전 주입

## 프로젝트 규칙 준수

- `data-testid` 기반 로케이터 우선 사용
- `page.waitForTimeout()` 미사용
- `test.describe`에 `[Guard]` 접두어, 개별 테스트에 `[JOURNEY-AUTH-001]` 포함
- 테스트 파일 위치: `tests/guard/auth/` (guard 전용 디렉토리)
