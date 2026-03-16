# Guard E2E Test Generation Summary

## Task
로그인 → 프로필 수정 (이름, 스킬 선택) → 저장 → 대시보드 인사말 반영 확인 → 프로필 재진입 시 데이터 유지 확인 플로우 테스트

## Journey ID
JOURNEY-PROFILE-002

## Generated File
`login-profile-dashboard-flow.spec.ts`

## Flow Steps
`/signup → /dashboard → /profile (edit) → /dashboard (인사말 확인) → /profile (데이터 유지 확인)`

---

## Test Scenarios (6개, 모두 통과)

### 1. Happy Flow
**[JOURNEY-PROFILE-002] 이름·스킬 수정 저장 후 대시보드 인사말에 새 이름이 즉시 반영된다 (happy flow)**
- 회원가입 → 대시보드 원래 이름 인사말 확인
- 프로필 수정 모드 진입 → 이름 변경 → 스킬(TypeScript, React) 선택 → 저장
- 저장 성공 배너 확인 → view 모드에서 수정된 이름 확인
- 대시보드로 이동 → 인사말에 새 이름 반영 확인

### 2. State Persistence (재진입)
**[JOURNEY-PROFILE-002] 프로필 수정 저장 후 대시보드 경유 재진입 시 이름·스킬이 유지된다**
- 회원가입 → 프로필 수정 (이름: "영속이름", 스킬: JavaScript, Next.js) → 저장
- 대시보드를 거쳐 프로필 재진입
- 수정된 이름 및 스킬 칩(JavaScript, Next.js)이 유지되는지 확인

### 3. State Persistence (새로고침)
**[JOURNEY-PROFILE-002] 프로필 수정 후 페이지 새로고침 시 변경 데이터가 localStorage에서 복원된다**
- 프로필 수정 저장 후 페이지 새로고침
- localStorage의 `auth_user` 키 직접 검증
- 대시보드 인사말도 새 이름 반영 확인

### 4. Branch Flow (취소 — 데이터 불변)
**[JOURNEY-PROFILE-002] 프로필 수정 취소 시 이름·스킬이 변경되지 않고 대시보드 인사말도 그대로다**
- 해피 플로우의 역: 이름·스킬 변경 후 저장 없이 취소
- view 모드에서 원래 이름 유지 확인
- 대시보드 인사말도 원래 이름 그대로 확인

### 5. Branch Flow (미인증 접근)
**[JOURNEY-PROFILE-002] 비인증 상태에서 /profile 직접 접근 시 /login으로 리다이렉트된다**
- 로그인 없이 `/profile` 직접 접근 → `/login` 리다이렉트 확인

### 6. Branch Flow (유효성 오류)
**[JOURNEY-PROFILE-002] 이름 비워두고 저장 시 에러가 표시되고 데이터·인사말이 변경되지 않는다**
- 이름 빈칸으로 저장 시도
- 에러 메시지 표시 및 수정 폼 유지 확인
- 대시보드 인사말이 변경되지 않음 확인

---

## Key Test IDs Used

| Component | data-testid |
|---|---|
| 회원가입 이름 | `signup-name` |
| 회원가입 이메일 | `signup-email` |
| 회원가입 비밀번호 | `signup-password` |
| 회원가입 비밀번호 확인 | `signup-confirm-password` |
| 회원가입 버튼 | `signup-submit` |
| 대시보드 인사말 | `greeting` |
| 프로필 view 모드 컨테이너 | `profile-view` |
| 프로필 이름 표시 | `profile-display-name` |
| 프로필 수정 버튼 | `profile-edit-btn` |
| 프로필 form 컨테이너 | `profile-form` |
| 프로필 이름 입력 | `profile-name` |
| 프로필 스킬 토글 | `profile-skills-toggle` |
| 스킬 드롭다운 | `multiselect-dropdown` |
| 스킬 옵션 | `multiselect-option-{skill}` |
| 스킬 선택 칩 | `multiselect-chip-{skill}` |
| 프로필 저장 버튼 | `profile-save` |
| 프로필 취소 버튼 | `profile-cancel` |
| 저장 성공 배너 | `profile-saved` |

---

## Conventions Applied
- `test.describe` prefix: `[Guard]`
- Journey ID in test name: `[JOURNEY-PROFILE-002]`
- Korean descriptions
- AAA pattern (Arrange/Act/Assert)
- `test.beforeEach`: cookie-consent localStorage 사전 설정 (쿠키 배너가 버튼 클릭 차단 방지)
- 공통 헬퍼: `signupAndGoToDashboard()` — 매 테스트 독립적 사용자 생성 (타임스탬프 기반 이메일)
- File placement: `tests/guard/profile/login-profile-dashboard-flow.spec.ts`

---

## Browser Exploration Results
`npx agent-browser` CLI를 통해 실제 앱을 라이브 탐색했습니다:

1. **Cookie consent**: 앱에 쿠키 동의 배너가 있어 `addInitScript`로 사전 동의 필요 (기존 테스트와 동일)
2. **MultiSelect 동작 확인**: 토글 버튼 클릭 → 드롭다운 표시 → 체크박스 클릭으로 선택 → 이름 필드 클릭으로 드롭다운 닫힘
3. **Profile save toast**: 저장 후 3초간 `profile-saved` 배너 표시 확인
4. **localStorage 구조**: `auth_user` 키에 `{name, email, bio, skills, birthDate}` 저장 확인
5. **Signup 플로우**: 회원가입 성공 시 `/dashboard`로 직접 리다이렉트

## Test Run Status
```
6 passed (6.4s)
```
모든 6개 테스트 통과.
