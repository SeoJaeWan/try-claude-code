# Profile Edit Flow Guard Test — Summary

## Journey ID
`JOURNEY-PROFILE-001`

## Summary
로그인 → 프로필 수정(이름·스킬) → 저장 → 대시보드 인사말 반영 확인 → 프로필 재진입 시 데이터 유지 확인

## Flow Steps
`/login → /dashboard → /profile (view) → /profile (edit) → save → /dashboard (greeting check) → /profile (re-enter, data persistence check)`

## App URL
`http://localhost:3000`

---

## Implementation Steps Followed

### 1. Journey Analysis
- Route transition chain 파악: 로그인 → 대시보드 → 프로필(view) → 프로필(edit) → 저장 → 대시보드 → 프로필(재진입)
- 상태 전환 포인트: `auth_user` localStorage (인증), `auth_users` localStorage (프로필 저장)
- 주요 검증 포인트: 이름 변경이 대시보드 greeting에 반영되는지, 페이지 이탈 후 재진입 시 데이터 유지
- 분기 경로: 취소 시 미반영, 빈 이름 저장 시 유효성 오류, 비인증 접근 시 로그인 리다이렉트

### 2. Project Conventions Detection
- `playwright.config.ts`: `testDir: "./tests"`, `baseURL: "http://localhost:3000"`
- 기존 가드 테스트 패턴: `tests/guard/{domain}/{scenario}.spec.ts`
- 공통 패턴: `test.beforeEach` + `addInitScript`로 `cookie-consent` 설정
- 인증 패턴: 각 테스트마다 고유 이메일로 회원가입하여 독립적 상태 확보

### 3. Browser Exploration
- agent-browser CLI로 로그인 → 대시보드 → 프로필 페이지 순서로 탐색
- 발견된 `data-testid` 목록:
  - 로그인: `login-email`, `login-password`, `login-submit`
  - 프로필 view: `profile-view`, `profile-display-name`, `profile-edit-btn`
  - 프로필 form: `profile-form`, `profile-name`, `profile-skills-toggle`, `profile-save`, `profile-cancel`, `profile-saved`
  - MultiSelect: `multiselect-dropdown`, `multiselect-option-{SkillName}`, `multiselect-chip-{SkillName}`
  - 대시보드: `greeting`
  - 내비게이션: `nav-logout`
- AuthContext 분석: `auth_user`(현재 사용자), `auth_login_at`(로그인 시각), `auth_users`(전체 사용자 DB)를 localStorage에 저장

### 4. Generated Test File
**경로:** `features/next-app/tests/guard/profile/profile-edit-flow.spec.ts`

#### 테스트 시나리오 (6개)

| # | 시나리오 타입 | 설명 |
|---|---|---|
| 1 | Happy flow | 이름·스킬 수정 저장 → 대시보드 인사말 즉시 반영 |
| 2 | State persistence | 저장 후 프로필 재진입 시 이름·스킬 데이터 유지 |
| 3 | State persistence | 저장 후 페이지 새로고침 시 데이터 유지 (대시보드 포함) |
| 4 | Branch flow (data-state invariant) | 취소 시 이름·스킬 변경 미반영 — happy flow의 역 케이스 |
| 5 | Branch flow (auth guard) | 비인증 상태에서 `/profile` 직접 접근 시 `/login` 리다이렉트 |
| 6 | Branch flow (validation) | 빈 이름으로 저장 시도 → 유효성 오류 표시, 저장 성공 메시지 없음 |

### 5. Test Verification
```
6 passed (7.0s)
```
모든 테스트 통과. locator 실패 없음, 라우트 전환 실패 없음.

---

## Locator Strategy Used
- `data-testid` 우선 (profile-*, multiselect-*) — 발견된 testid 재사용
- `page.getByRole("paragraph")` + `filter` — 유효성 오류 메시지 검증

## Test Independence
- 각 테스트마다 `Date.now()` 기반 고유 이메일로 회원가입 → localStorage 충돌 없음
- `beforeEach`에서 `cookie-consent` initScript 설정 → 쿠키 배너 차단 방지
