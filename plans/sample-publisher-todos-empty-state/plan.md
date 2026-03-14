**Branch:** style/sample-todos-empty-state

# sample-publisher-todos-empty-state 실행 계획 (Sequential)

## 요약

- 목표: `/todos` 화면의 empty state를 더 명확한 시각 계약과 stable locator를 갖는 샘플 작업으로 정리한다.
- 배경: 현재 empty state는 컨테이너 locator만 있고, 제목/설명 계약이 plan 단계에서 드러나지 않는다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- `features/next-app/app/todos/page.tsx`의 0건 상태와 검색 결과 0건 상태를 하나의 bounded UI surface로 본다.
- 이번 샘플은 visual/layout/testability 계약만 다룬다.
- 구현 결과는 `publisher`가 처리할 수 있는 범위로 제한한다.

## Out of Scope

- Todo 추가/수정/삭제 로직 변경
- 인증 리다이렉트 변경
- 다크모드 토큰 전면 개편
- cross-route 회귀 시나리오

## Resolved Decisions

- `route or navigation/surface contract`: 대상 surface는 인증된 사용자의 `/todos` 본문 empty state 영역만이다. [C-EMPTY-001], [C-EMPTY-002]
- `user state contract`: 사용자 상태는 인증 완료 후 `todos.length === 0` 또는 `filtered.length === 0` 두 경우로 제한한다. [C-EMPTY-001], [C-EMPTY-002]
- `action contract`: 사용자는 빈 목록으로 `/todos`에 진입하거나, 검색 입력으로 결과 0건 상태를 만든다. 새 비즈니스 액션은 추가하지 않는다. [C-EMPTY-001], [C-EMPTY-002]
- `visible outcome contract`: 기본 empty state는 "아직 할 일이 없습니다" / "위 입력란에서 새로운 할 일을 추가해보세요", 필터 empty state는 "검색 결과가 없습니다" / "다른 검색어나 필터를 시도해보세요"를 노출한다. 두 상태 모두 동일한 centered visual shell을 사용한다. [C-EMPTY-001], [C-EMPTY-002]
- `locator/testability contract`: `empty-state`, `empty-state-title`, `empty-state-description` locator를 보장한다. 검색 재현에는 기존 `search-input`, `todo-input`, `todo-add`를 사용한다. [C-EMPTY-003]

## Explicit Defaults

- empty state 아이콘은 기존 SVG를 유지한다. 시각 방향은 spacing/testability 중심으로만 조정한다.
- branch type은 visual scope이므로 `style/`을 사용한다.
- Playwright plan artifact는 단일 surface spec 하나로 유지한다.

## Assumptions and Risks

- Assumptions:
  - `features/next-app`의 E2E runner는 Playwright다.
  - `/todos`는 기존 login helper로 재현 가능하다.
- Risks:
  - empty state title/description locator가 추가되면 기존 snapshot이나 수동 QA 기준이 바뀔 수 있다.
  - Todo localStorage 초기화 방식이 바뀌면 E2E seed 준비 코드가 수정될 수 있다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| empty-state-shell | `features/next-app/components/EmptyState.tsx` | 없음 | 높음(공용 컴포넌트) | 아니오 |
| todos-surface-copy | `features/next-app/app/todos/page.tsx` | empty-state-shell 결과 | 높음(동일 surface) | 아니오 |

결론:

- 공용 empty state 컴포넌트와 `/todos` surface가 강하게 결합되어 있어 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - 동일한 UI shell을 공유한다.
  - copy, spacing, locator 계약이 하나의 surface에서 함께 확정돼야 한다.

## Critical Path

1. EmptyState locator와 visual shell 확정
2. `/todos` 두 empty case 문구 및 spacing 적용
3. frozen Playwright contract 충족 확인

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## Failure Escalation Policy

- `empty-state-title` / `empty-state-description`를 추가하기 어렵다면 구현을 멈추고 locator 계약을 재협의한다.
- `/todos` 외 다른 화면의 EmptyState까지 수정이 전파되면 샘플 범위를 넘는 것으로 보고 phase를 중단한다.

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `publisher`
- primary_skill: `ui-publish`
- 작업:
  - `EmptyState`에 제목/설명용 stable locator를 추가한다.
  - `/todos`의 두 empty case가 같은 visual shell을 공유하도록 spacing과 copy 계약을 정리한다.
- 산출물:
  - `features/next-app/components/EmptyState.tsx`
  - `features/next-app/app/todos/page.tsx`
- 단위 테스트 의도: `N/A (visual-only scope)`
- E2E 테스트 의도: `runner=Playwright`, `surface=todos-empty-state`, `artifact=todos-empty-state.spec.ts`

## UI E2E Test Artifacts (UI feature scope)

- 산출물 위치: `plans/sample-publisher-todos-empty-state/e2e/manifest.md`, `plans/sample-publisher-todos-empty-state/e2e/todos-empty-state.spec.ts`
- 최종 배치: 구현 단계에서 `features/next-app/tests/*.spec.ts` 관례에 맞춰 resolve
- 메모:
  - 동일 route 안의 두 empty case만 frozen contract로 고정한다.
  - cross-route onboarding journey는 이 샘플에서 다루지 않는다.

## 파일 변경 목록

- 수정:
  - `features/next-app/components/EmptyState.tsx`
  - `features/next-app/app/todos/page.tsx`
- 신규:
  - `features/next-app/tests/todos-empty-state.spec.ts` (구현 단계에서 최종 배치)
  - `plans/sample-publisher-todos-empty-state/plan.md`
  - `plans/sample-publisher-todos-empty-state/e2e/manifest.md`
  - `plans/sample-publisher-todos-empty-state/e2e/todos-empty-state.spec.ts`
- 삭제:
  - 없음

## 검증 명령

1. `pnpm --dir features/next-app lint`
2. `pnpm --dir features/next-app exec playwright test tests/todos-empty-state.spec.ts`

## 종료 기준

- [ ] `/todos`의 기본 empty state와 필터 empty state가 명시된 문구를 노출한다.
- [ ] title/description locator가 plan 계약과 일치한다.
- [ ] Playwright surface spec이 deterministic하게 통과한다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] visual scope가 `publisher` 범위를 넘지 않음

## 롤백/폴백

- 롤백 방법: `EmptyState` locator 추가가 다른 화면에 부작용을 만들면 기존 markup으로 되돌리고 `/todos` 전용 wrapper를 두는 방향으로 축소한다.
- 폴백 조건: 공용 `EmptyState` 변경이 과도하면 `/todos`에서만 문구 wrapper를 도입하는 축소안으로 전환한다.

## 품질 게이트 결정

- Unit: `skip` - visual-only sample이며 로직 boundary를 추가하지 않는다.
- E2E: `run` - bounded UI surface가 바뀌므로 frozen Playwright artifact가 필요하다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
