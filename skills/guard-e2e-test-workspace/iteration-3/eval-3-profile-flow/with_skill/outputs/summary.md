# Guard E2E Test Generation Summary

## Journey

**Journey ID:** JOURNEY-PROFILE-001
**Summary:** 로그인 → 프로필 수정 (이름·스킬 선택) → 저장 → 대시보드 인사말 반영 확인 → 프로필 재진입 시 데이터 유지 확인
**Flow:** `/signup` → `/dashboard` → `/profile` → 수정·저장 → `/dashboard` (인사말 확인) → `/profile` (데이터 유지 확인)
**App URL:** `http://localhost:3000`

---

## Generated File

**Path:** `tests/guard/profile/login-profile-edit-dashboard.spec.ts`

---

## Source Code Analysis

읽은 입력 파일 및 참조 파일:
- `SKILL.md`, `references/e2e-conventions.md`, `references/agent-browser-patterns.md`
- `app/profile/page.tsx` — 프로필 페이지 컴포넌트 및 testid 구조 파악
- `app/dashboard/page.tsx` — 대시보드 `greeting` testid 확인
- `app/login/page.tsx` — 로그인 폼 testid 확인
- `contexts/AuthContext.tsx` — localStorage 기반 인증 로직 (`auth_user`, `auth_login_at`) 확인
- `components/MultiSelect.tsx` — `profile-skills-toggle`, `multiselect-dropdown`, `multiselect-option-{name}`, `multiselect-chip-{name}` testid 구조 확인
- 기존 `.spec.ts` 파일들 — 프로젝트 컨벤션 및 `signupAndGoToDashboard` 헬퍼 패턴 확인

**주의:** agent-browser CLI를 통한 라이브 앱 탐색은 Bash 도구 권한이 없어 실행하지 못했습니다. 소스 코드 분석을 통해 testid와 동작을 파악하여 테스트를 작성했습니다.

---

## Test Scenarios (6개)

| # | 유형 | 시나리오 |
|---|------|----------|
| 1 | Happy flow | 이름·스킬 수정 저장 후 대시보드 인사말에 새 이름이 즉시 반영된다 |
| 2 | State persistence | 프로필 수정 저장 후 대시보드 경유 재진입 시 이름·스킬이 유지된다 |
| 3 | State persistence | 페이지 새로고침 후 수정된 프로필 데이터가 localStorage에서 복원된다 |
| 4 | Branch flow (data-state invariant) | 프로필 수정 취소 시 이름·스킬이 변경되지 않고 대시보드 인사말도 그대로다 |
| 5 | Branch flow (auth) | 비인증 상태에서 /profile 직접 접근 시 /login으로 리다이렉트된다 |
| 6 | Branch flow (validation) | 이름 비워두고 저장 시 에러가 표시되고 데이터·인사말이 변경되지 않는다 |

---

## Key Locators Used

| Testid | 위치 | 용도 |
|--------|------|------|
| `greeting` | dashboard/page.tsx | 대시보드 인사말 `안녕하세요, {name}님` |
| `profile-view` | profile/page.tsx | 프로필 뷰 모드 컨테이너 |
| `profile-display-name` | profile/page.tsx | 뷰 모드 이름 표시 |
| `profile-edit-btn` | profile/page.tsx | 수정 모드 진입 버튼 |
| `profile-form` | profile/page.tsx | 수정 모드 폼 컨테이너 |
| `profile-name` | profile/page.tsx | 이름 입력 필드 |
| `profile-skills-toggle` | MultiSelect.tsx | 스킬 드롭다운 열기 버튼 |
| `multiselect-dropdown` | MultiSelect.tsx | 스킬 선택 드롭다운 |
| `multiselect-option-{skill}` | MultiSelect.tsx | 스킬 옵션 (JavaScript, TypeScript, React 등) |
| `multiselect-chip-{skill}` | MultiSelect.tsx | 선택된 스킬 칩 |
| `profile-save` | profile/page.tsx | 저장 버튼 |
| `profile-cancel` | profile/page.tsx | 취소 버튼 |
| `profile-saved` | profile/page.tsx | 저장 성공 토스트 메시지 |

---

## Design Decisions

1. **쿠키 배너 처리:** `test.beforeEach`에서 `localStorage.setItem("cookie-consent", "true")`를 `addInitScript`로 설정해 쿠키 배너가 버튼 클릭을 막지 않도록 함
2. **고유 이메일:** 각 테스트는 `Date.now()`를 포함한 고유 이메일로 독립 실행
3. **드롭다운 닫기 패턴:** MultiSelect는 외부 `mousedown`으로 닫히므로 `profile-name` 필드 클릭으로 드롭다운 닫기
4. **localStorage 검증:** 새로고침 테스트에서 `page.evaluate()`로 `auth_user` localStorage 값을 직접 검증해 세션 복원이 실제로 일어났음을 확인
5. **데이터 불변 분기:** 취소/유효성 오류 시나리오에서 대시보드 인사말도 함께 검증해 상태 변화가 없음을 cross-route로 확인

---

## Test File Location

```
features/next-app/tests/guard/profile/login-profile-edit-dashboard.spec.ts
```
