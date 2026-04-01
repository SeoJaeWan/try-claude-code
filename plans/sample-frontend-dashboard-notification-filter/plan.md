**Branch:** feat/sample-dashboard-notification-filter

# sample-frontend-dashboard-notification-filter 실행 계획 (Sequential)

## 요약

- 목표: `/dashboard`의 알림 섹션에 unread filter를 추가하는 작은 frontend 샘플을 정의한다.
- 배경: 현재 `NotificationList`는 API 응답을 그대로 렌더링하며 필터 상태와 empty state 계약이 없다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- 대상은 `features/next-app/app/dashboard/page.tsx` 안의 알림 섹션과 `NotificationList` 컴포넌트다.
- 이번 샘플은 bounded surface 안의 frontend state, fetch 결과 렌더링, UI locator 계약만 포함한다.
- API shape는 기존 `/api/notifications` 응답을 유지한다.

## Out of Scope

- `/dashboard` 밖의 navigation 변경
- 알림 읽음 처리 mutation
- backend API schema 변경
- cross-route 회귀 guard 추가

## Resolved Decisions

- `route or navigation/surface contract`: surface는 인증된 사용자의 `/dashboard` 내 알림 섹션으로 고정한다. route 추가는 없다. [C-NOTI-001], [C-NOTI-002]
- `user state contract`: 사용자는 로그인 완료 상태이며 `/api/notifications`가 `notifications: Notification[]`를 반환한다. loading, success, error 세 상태를 모두 in-scope로 둔다. [C-NOTI-001], [C-NOTI-004]
- `action contract`: 기본 진입 상태는 `all` 필터다. 사용자는 `notifications-filter-unread`와 `notifications-filter-all`로 뷰를 전환한다. [C-NOTI-001], [C-NOTI-002]
- `visible outcome contract`: `all`에서는 전체 알림을, `unread`에서는 `read === false`만 노출한다. unread 결과가 0건이면 `notifications-empty` 상태를 보여준다. API 에러면 필터 대신 `notifications-error`를 우선 노출한다. [C-NOTI-002], [C-NOTI-003], [C-NOTI-004]
- `locator/testability contract`: `notifications-filter-all`, `notifications-filter-unread`, `notifications-empty`, 기존 `notifications-list`, `notification-{id}`, `notifications-loading`, `notifications-error` locator를 보장한다. [C-NOTI-001], [C-NOTI-002], [C-NOTI-003], [C-NOTI-004]

## Explicit Defaults

- filter UI는 segmented button 2개로 유지한다.
- default filter는 `all`이다.
- local frontend unit-test runner 신호가 없으므로 이 샘플은 E2E contract만 생성한다.

## Assumptions and Risks

- Assumptions:
  - `features/next-app`는 Playwright를 browser E2E runner로 사용한다.
  - 알림 응답 shape는 현재 route 구현을 유지한다.
- Risks:
  - error state에서 filter 노출 여부가 product 정책과 다르면 locator 계약을 다시 조정해야 한다.
  - 향후 frontend unit runner가 추가되면 이 샘플의 test strategy가 바뀔 수 있다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| notification-filter-state | `features/next-app/components/NotificationList.tsx` | 없음 | 높음(핵심 컴포넌트) | 아니오 |
| dashboard-shell-contract | `features/next-app/app/dashboard/page.tsx` | filter state 결과 | 높음(같은 surface) | 아니오 |

결론:

- filter state와 dashboard surface contract가 같은 컴포넌트 경계에 묶여 있어 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - state, loading/error, empty state가 하나의 component contract에서 동시에 확정된다.
  - 파일 수는 적지만 충돌 가능성이 높다.

## Critical Path

1. `NotificationList`에 filter state와 locator 계약 추가
2. `/dashboard` 알림 섹션에서 새로운 empty/error contract 적용
3. frozen Playwright spec으로 interaction path 고정

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## Failure Escalation Policy

- filter가 `/api/notifications` schema 변경 없이는 구현 불가능하면 계획을 중단하고 scope를 재설계한다.
- loading, success, error 우선순위가 불명확해지면 error 우선 노출 계약부터 재확인한다.

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `frontend-developer`
- primary_skill: `frontend-dev`
- 작업:
  - `NotificationList`에 `all`/`unread` 필터 state를 추가한다.
  - unread 결과 0건일 때의 empty state와 error 우선 노출 계약을 명시한다.
  - bounded surface에 필요한 locator를 추가한다.
- 산출물:
  - `features/next-app/components/NotificationList.tsx`
  - `features/next-app/app/dashboard/page.tsx`
- 단위 테스트 의도: `N/A (features/next-app에 명확한 frontend unit runner 신호가 없으므로 계획 단계에서 invent하지 않음)`
- E2E 테스트 의도: `runner=Playwright`, `surface=dashboard-notification-filter`, `artifact=dashboard-notification-filter.spec.ts`

## UI E2E Test Artifacts (UI feature scope)

- 산출물 위치: `plans/sample-frontend-dashboard-notification-filter/e2e/manifest.md`, `plans/sample-frontend-dashboard-notification-filter/e2e/dashboard-notification-filter.spec.ts`
- 최종 배치: 구현 단계에서 `features/next-app/tests/*.spec.ts` 관례에 맞춰 resolve
- 메모:
  - `plan-materialize`의 bounded-surface E2E 범위는 dashboard 내 알림 섹션으로만 고정한다.
  - multi-route notification center는 이 샘플에서 다루지 않는다.

## 파일 변경 목록

- 수정:
  - `features/next-app/components/NotificationList.tsx`
  - `features/next-app/app/dashboard/page.tsx`
- 신규:
  - `features/next-app/tests/dashboard-notification-filter.spec.ts` (구현 단계에서 최종 배치)
  - `plans/sample-frontend-dashboard-notification-filter/plan.md`
  - `plans/sample-frontend-dashboard-notification-filter/e2e/manifest.md`
  - `plans/sample-frontend-dashboard-notification-filter/e2e/dashboard-notification-filter.spec.ts`
- 삭제:
  - 없음

## 검증 명령

1. `pnpm --dir features/next-app lint`
2. `pnpm --dir features/next-app exec playwright test tests/dashboard-notification-filter.spec.ts`

## 종료 기준

- [ ] 기본 진입 시 전체 알림이 보인다.
- [ ] unread filter가 읽지 않은 알림만 남긴다.
- [ ] unread 결과가 없으면 empty state가 노출된다.
- [ ] API error 시 error UI가 filter 결과보다 우선한다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] 최종 테스트 배치는 구현 단계에서만 resolve하도록 유지함

## 롤백/폴백

- 롤백 방법: filter 도입이 과하면 기존 `NotificationList` 단순 렌더링으로 되돌리고 locator만 유지한다.
- 폴백 조건: unread empty state 정책이 확정되지 않으면 `all` view 유지 + error contract만 고정하는 축소안으로 내린다.

## 품질 게이트 결정

- Unit: `skip` - local frontend unit-test runner signal이 없어 계획 단계에서 test stack을 가정하지 않는다.
- E2E: `run` - bounded UI surface와 user-visible state가 바뀌므로 frozen Playwright artifact가 필요하다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
