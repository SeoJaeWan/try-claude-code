**Branch:** style/sample-showcase-review-card

# sample-publisher-showcase-review-card 실행 계획 (Sequential)

## 요약

- 목표: `features/ui-publish-fixture`의 `/showcase` 리뷰 카드 영역을 `publisher` 전용 샘플로 정리해, Claude와 Codex 모두에서 visual-only 실행 흐름을 검증한다.
- 배경: 현재 `ReviewCard`는 flat 구현과 folder 구현이 동시에 존재하고, showcase section 자체의 stable locator 계약도 plan 수준에서 드러나지 않는다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- 대상은 `features/ui-publish-fixture/app/showcase/page.tsx`의 ReviewCard section과 `features/ui-publish-fixture/components/ReviewCard.tsx`, `features/ui-publish-fixture/components/common/reviewCard/index.tsx`다.
- 이번 샘플은 visual shell, import 정리, stable locator 계약만 다룬다.
- 구현 결과는 `publisher`가 처리할 수 있는 visual-only 범위로 제한한다.

## Out of Scope

- 리뷰 조회/작성/삭제 같은 business logic 추가
- 별점 계산 로직 변경
- `/showcase` 외 route 개편
- cross-route regression guard 추가

## Resolved Decisions

- `route or navigation/surface contract`: 대상 surface는 공개 route `/showcase` 안의 ReviewCard section으로 고정한다. route 추가나 redirect는 없다. [C-REVIEW-001]
- `user state contract`: 별도 인증 없이 showcase를 보는 사용자를 기준으로 한다. section은 seed card 3개를 렌더링하는 정적 visual surface다. [C-REVIEW-001]
- `action contract`: 사용자는 `/showcase`에 진입해 review card section을 본다. 리뷰 조작 액션은 추가하지 않는다. [C-REVIEW-001]
- `visible outcome contract`: 각 card는 avatar, author, rating, body, created date 영역을 유지해야 하며, 카드 grid와 section heading은 같은 visual hierarchy로 정리된다. 중복 구현은 하나의 source of truth로 수렴한다. [C-REVIEW-002]
- `locator/testability contract`: `showcase-review-section`, `showcase-review-grid`, `review-card`, `review-card-avatar`, `review-card-author`, `review-card-rating`, `review-card-body`, `review-card-date` locator를 보장한다. [C-REVIEW-003]

## Explicit Defaults

- folder-based source of truth는 `features/ui-publish-fixture/components/common/reviewCard/index.tsx`로 고정한다.
- branch type은 visual scope이므로 `style/`을 사용한다.
- Playwright plan artifact는 `/showcase` review card section용 단일 surface spec 하나로 유지한다.

## Assumptions and Risks

- Assumptions:
  - `features/ui-publish-fixture`의 E2E runner는 Playwright다.
  - `/showcase`는 별도 로그인 없이 재현 가능하다.
- Risks:
  - 중복 구현 제거 과정에서 import path alias가 흔들릴 수 있다.
  - section locator를 새로 추가하면 기존 snapshot 기준과 수동 QA 동선이 바뀔 수 있다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| review-card-source-of-truth | `features/ui-publish-fixture/components/ReviewCard.tsx`, `features/ui-publish-fixture/components/common/reviewCard/index.tsx` | 없음 | 높음(동일 컴포넌트 책임) | 아니오 |
| showcase-section-contract | `features/ui-publish-fixture/app/showcase/page.tsx` | review-card-source-of-truth 결과 | 높음(같은 surface) | 아니오 |

결론:

- 중복 구현 수렴과 section locator 계약이 한 surface에 묶여 있어 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - review card의 source of truth가 먼저 정리돼야 showcase import와 locator 계약을 안정적으로 고정할 수 있다.
  - visual shell과 testability 계약이 같은 bounded surface 안에서 동시에 확정된다.

## Critical Path

1. 중복 `ReviewCard` 구현을 하나의 source of truth로 수렴
2. `/showcase` review card section의 heading, grid, locator 계약 고정
3. frozen Playwright spec으로 visual/testability surface를 고정

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## Failure Escalation Policy

- flat 구현 제거가 어려워 source of truth가 둘로 남으면 구현을 중단하고 import contract를 재설계한다.
- showcase section locator를 추가하기 어렵다면 plan을 멈추고 testability contract를 재협의한다.

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `publisher`
- primary_skill: `ui-publish`
- 목적: ReviewCard visual shell과 showcase section contract를 하나의 visual-only source of truth로 정리해, `publisher` 플로우 검증에 필요한 경계와 locator를 명확히 확보한다.
- 작업:
  - flat `ReviewCard` 구현과 folder 구현을 하나의 source of truth로 수렴한다.
  - `/showcase` review card section에 section/grid locator를 추가하고 import를 정리한다.
  - avatar, author, rating, body, date visual affordance를 유지하면서 testability locator를 고정한다.
- 산출물:
  - `features/ui-publish-fixture/app/showcase/page.tsx`
  - `features/ui-publish-fixture/components/common/reviewCard/index.tsx`
  - `features/ui-publish-fixture/components/ReviewCard.tsx` 제거 또는 thin re-export 정리
- 단위 테스트 의도: `N/A (visual-only scope)`
- E2E 테스트 의도: `runner=Playwright`, `surface=showcase-review-card`, `artifact=showcase-review-card.spec.ts`

## UI E2E Test Artifacts (UI feature scope)

- 산출물 위치:
  - `plans/sample-publisher-showcase-review-card/e2e/manifest.md`
  - `plans/sample-publisher-showcase-review-card/e2e/showcase-review-card.spec.ts`
- 최종 배치: 구현 단계에서 `features/ui-publish-fixture/tests/*.spec.ts` 관례에 맞춰 resolve
- 메모:
  - 이 샘플은 `/showcase` review card section만 고정한다.
  - 리뷰 작성/저장/삭제 같은 multi-step flow는 이 샘플 범위를 넘는다.

## 파일 변경 목록

- 수정:
  - `features/ui-publish-fixture/app/showcase/page.tsx`
  - `features/ui-publish-fixture/components/common/reviewCard/index.tsx`
- 신규:
  - `features/ui-publish-fixture/tests/showcase-review-card.spec.ts` (구현 단계에서 최종 배치)
  - `plans/sample-publisher-showcase-review-card/plan.md`
  - `plans/sample-publisher-showcase-review-card/e2e/manifest.md`
  - `plans/sample-publisher-showcase-review-card/e2e/showcase-review-card.spec.ts`
- 삭제:
  - `features/ui-publish-fixture/components/ReviewCard.tsx` (구현 단계에서 중복 제거 시)

## 검증 명령

1. `pnpm --dir features/ui-publish-fixture lint`
2. `pnpm --dir features/ui-publish-fixture exec playwright test tests/showcase-review-card.spec.ts`

## 종료 기준

- [ ] `/showcase`의 review card section이 stable section/grid locator를 노출한다.
- [ ] ReviewCard source of truth가 하나로 정리된다.
- [ ] 각 card가 avatar, author, rating, body, date locator를 유지한다.
- [ ] Playwright surface spec이 deterministic하게 통과한다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] visual scope가 `publisher` 범위를 넘지 않음

## 롤백/폴백

- 롤백 방법: review card 수렴이 showcase import를 깨면 기존 import path로 되돌리고 section locator만 먼저 고정한다.
- 폴백 조건: 중복 구현 제거가 과도하면 folder 구현을 source of truth로 두고 flat 경로는 임시 re-export로 축소한다.

## 품질 게이트 결정

- Unit: `skip` - visual-only sample이며 로직 boundary를 추가하지 않는다.
- E2E: `run` - bounded UI surface와 locator contract가 바뀌므로 frozen Playwright artifact가 필요하다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
