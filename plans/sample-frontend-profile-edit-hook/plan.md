**Branch:** feat/sample-profile-edit-hook

# sample-frontend-profile-edit-hook 실행 계획 (Sequential)

## 요약

- 목표: `features/frontend-dev-fixture`의 `/profile` 편집 로직을 `frontend-developer` 전용 샘플로 정리해, Claude와 Codex 모두에서 hook extraction 중심 실행 흐름을 검증한다.
- 배경: 현재 `app/profile/page.tsx`에는 draft 상태, validation, save/cancel 로직이 페이지에 직접 섞여 있어 UI wiring 경계가 흐리다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- 대상은 `features/frontend-dev-fixture/app/profile/page.tsx`와 새 hook 경계 `features/frontend-dev-fixture/hooks/utils/profile/useProfileEdit/index.ts`다.
- 이번 샘플은 `/profile` bounded surface 안의 draft state, validation, save/cancel lifecycle, locator 계약만 포함한다.
- `AuthContext.updateProfile`의 public contract는 유지한다.

## Out of Scope

- `/profile` 밖의 navigation 변경
- 인증/세션 정책 변경
- backend API 또는 persistence schema 변경
- cross-route regression guard 추가

## Resolved Decisions

- `route or navigation/surface contract`: 대상 surface는 인증된 사용자의 `/profile` 페이지 편집 영역으로 고정한다. route 추가나 redirect 정책 변경은 없다. [C-PROFILE-001]
- `user state contract`: 사용자는 이미 로그인된 상태이며, 기존 profile 값이 local session에 존재한다. view mode와 edit mode 두 상태를 in-scope로 둔다. [C-PROFILE-001], [C-PROFILE-002]
- `action contract`: 사용자는 `profile-edit-btn`으로 편집을 시작하고, 이름/자기소개/생년월일/기술 스택/아바타를 수정한 뒤 `profile-save` 또는 `profile-cancel`을 수행한다. [C-PROFILE-002], [C-PROFILE-003]
- `visible outcome contract`: 유효하지 않은 입력이면 인라인 validation이 노출되고 저장이 막힌다. 유효한 저장이면 view mode로 복귀하면서 `profile-saved` 성공 배너와 최신 표시값을 보여준다. 취소하면 draft는 버려지고 기존 view 값으로 복귀한다. [C-PROFILE-003], [C-PROFILE-004]
- `locator/testability contract`: `profile-view`, `profile-form`, `profile-edit-btn`, `profile-name`, `profile-bio`, `profile-birthdate`, `profile-skills-toggle`, `file-upload-button`, `profile-save`, `profile-cancel`, `profile-saved`를 유지하고, validation 안정화를 위해 `profile-name-error`, `profile-bio-error` locator를 추가한다. [C-PROFILE-005]

## Explicit Defaults

- hook 경로는 `features/frontend-dev-fixture/hooks/utils/profile/useProfileEdit/index.ts`로 고정한다.
- page는 섹션 렌더링과 handler wiring에 집중하고, draft state/validation/save-cancel lifecycle은 hook으로 이동한다.
- fixture package에 안정적인 unit runner script가 없으므로 이 샘플은 frozen E2E artifact만 생성하고 unit artifact는 defer한다.

## Assumptions and Risks

- Assumptions:
  - `features/frontend-dev-fixture`의 browser E2E runner는 Playwright다.
  - `/profile` 진입을 위한 authenticated seed는 Playwright에서 localStorage 초기화로 재현 가능하다.
- Risks:
  - validation locator 추가가 기존 markup을 바꾸어 snapshot 기준에 영향을 줄 수 있다.
  - hook extraction 과정에서 save banner timeout 또는 cancel reset 타이밍이 흔들릴 수 있다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| profile-edit-hook | `features/frontend-dev-fixture/hooks/utils/profile/useProfileEdit/index.ts` | 없음 | 높음(핵심 상태 경계) | 아니오 |
| profile-page-wiring | `features/frontend-dev-fixture/app/profile/page.tsx` | profile-edit-hook 결과 | 높음(같은 surface) | 아니오 |

결론:

- hook extraction과 page wiring이 강하게 결합되어 있어 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - hook contract가 먼저 정리돼야 page의 render-only/wiring boundary가 안정적으로 고정된다.
  - validation, save, cancel, success banner contract가 한 bounded surface 안에서 동시에 확정된다.

## Critical Path

1. `useProfileEdit` hook 경계 정의
2. `/profile` page를 render/wiring 중심으로 단순화
3. frozen Playwright spec으로 edit/save/cancel contract 고정

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## Failure Escalation Policy

- hook으로 옮긴 뒤에도 page에 다수의 인라인 `useState`가 남으면 phase를 중단하고 hook boundary를 재정의한다.
- cancel 시 draft reset 계약이 모호해지면 저장 성공 플로우보다 먼저 cancel contract를 재고정한다.

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `frontend-developer`
- primary_skill: `frontend-dev`
- 목적: `/profile` 편집 로직을 hook 경계로 추출해 page를 render/wiring 중심으로 정리하고, save/cancel/validation contract를 `frontend-developer` 플로우 검증에 맞게 고정한다.
- 작업:
  - draft 상태, validation, save/cancel lifecycle을 `useProfileEdit` hook으로 추출한다.
  - page에는 section 렌더링과 hook 반환값 wiring만 남긴다.
  - 성공 배너와 validation locator 계약을 안정화한다.
- 산출물:
  - `features/frontend-dev-fixture/app/profile/page.tsx`
  - `features/frontend-dev-fixture/hooks/utils/profile/useProfileEdit/index.ts`
- 단위 테스트 의도: `N/A (legacy unit test signal은 있으나 fixture package에 안정적인 실행 contract가 없어 이번 샘플에서는 invent하지 않음)`
- E2E 테스트 의도: `runner=Playwright`, `surface=profile-edit-hook`, `artifact=profile-edit-hook.spec.ts`

## UI E2E Test Artifacts (UI feature scope)

- 산출물 위치:
  - `plans/sample-frontend-profile-edit-hook/e2e/manifest.md`
  - `plans/sample-frontend-profile-edit-hook/e2e/profile-edit-hook.spec.ts`
- 최종 배치: 구현 단계에서 `features/frontend-dev-fixture/tests/*.spec.ts` 관례에 맞춰 resolve
- 메모:
  - `/profile` bounded surface만 고정한다.
  - login/signup 전체 journey는 이 샘플 범위를 넘으므로 auth seed로 surface를 여는 전제를 쓴다.

## 파일 변경 목록

- 수정:
  - `features/frontend-dev-fixture/app/profile/page.tsx`
- 신규:
  - `features/frontend-dev-fixture/hooks/utils/profile/useProfileEdit/index.ts`
  - `features/frontend-dev-fixture/tests/profile-edit-hook.spec.ts` (구현 단계에서 최종 배치)
  - `plans/sample-frontend-profile-edit-hook/plan.md`
  - `plans/sample-frontend-profile-edit-hook/e2e/manifest.md`
  - `plans/sample-frontend-profile-edit-hook/e2e/profile-edit-hook.spec.ts`
- 삭제:
  - 없음

## 검증 명령

1. `pnpm --dir features/frontend-dev-fixture lint`
2. `pnpm --dir features/frontend-dev-fixture exec playwright test tests/profile-edit-hook.spec.ts`

## 종료 기준

- [ ] `/profile` page의 draft 상태와 save/cancel lifecycle이 hook 경계로 분리된다.
- [ ] cancel 시 기존 view 값으로 복귀하고 draft가 버려진다.
- [ ] invalid 입력은 stable validation locator로 노출되고 저장을 막는다.
- [ ] valid 저장 시 성공 배너와 최신 display 값이 보인다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] 최종 테스트 배치는 구현 단계에서만 resolve하도록 유지함

## 롤백/폴백

- 롤백 방법: hook extraction이 지나치게 복잡하면 page에 있던 로직을 되돌리고 validation locator만 먼저 고정한다.
- 폴백 조건: save/cancel lifecycle을 완전히 추출하기 어렵다면 validation + draft reset까지만 hook으로 옮기고 success banner 제어는 page에 남기는 축소안으로 전환한다.

## 품질 게이트 결정

- Unit: `skip` - fixture package에 신뢰할 수 있는 unit test 실행 contract가 없어 이번 샘플에서는 runner를 invent하지 않는다.
- E2E: `run` - bounded UI surface와 user-visible edit/save/cancel contract가 바뀌므로 frozen Playwright artifact가 필요하다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
