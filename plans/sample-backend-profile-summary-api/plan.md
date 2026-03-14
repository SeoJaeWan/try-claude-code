**Branch:** feat/sample-profile-summary-api

# sample-backend-profile-summary-api 실행 계획 (Sequential)

## 요약

- 목표: Nest API에 작은 `GET /profile-summary` endpoint를 추가하는 backend 샘플을 정의한다.
- 배경: 현재 `features/nest-api`는 `getHello()`만 제공하므로 controller/service/unit test handoff 예시가 부족하다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- 대상은 `features/nest-api/src/app.controller.ts`와 `features/nest-api/src/app.service.ts`다.
- 이번 샘플은 controller-service boundary, response normalization, Jest unit test handoff만 포함한다.
- DB, auth, 외부 API 의존성은 추가하지 않는다.

## Out of Scope

- persistence layer 도입
- 인증/인가
- frontend 통합
- HTTP e2e harness 추가

## Resolved Decisions

- endpoint contract: `GET /profile-summary`는 `{ userName, pendingTodos, completedTodos, unreadNotifications }` 객체를 반환한다. [C-PROFILE-001]
- service contract: `AppService`는 raw seed를 response shape로 normalize하는 `buildProfileSummary` boundary를 가진다. [C-PROFILE-001], [C-PROFILE-002], [C-PROFILE-004]
- defensive contract: 누락되거나 잘못된 숫자 seed는 예외 대신 `0`으로 정규화한다. [C-PROFILE-002], [C-PROFILE-004]
- controller contract: `AppController`는 service 결과를 래핑 없이 그대로 반환한다. [C-PROFILE-003]

## Explicit Defaults

- 샘플 응답 seed는 service 내부의 in-memory constant로 유지한다.
- userName 기본값은 `"테스트유저"`로 둔다.
- backend sample은 existing Jest/Nest conventions만 사용한다.

## Assumptions and Risks

- Assumptions:
  - `features/nest-api`는 `src/**/*.spec.ts` Jest 규칙을 유지한다.
  - 이 샘플은 DTO 파일 없이 inline type으로도 충분하다.
- Risks:
  - `buildProfileSummary`를 public boundary로 둘지 private helper로 둘지 구현 시 논의가 생길 수 있다.
  - 숫자 normalization 정책이 바뀌면 spec과 endpoint contract를 함께 수정해야 한다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| service-summary-contract | `features/nest-api/src/app.service.ts` | 없음 | 높음(핵심 service) | 아니오 |
| controller-endpoint | `features/nest-api/src/app.controller.ts` | service-summary-contract 결과 | 높음(직접 의존) | 아니오 |

결론:

- controller가 service contract에 직접 의존하므로 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - service response shape가 먼저 고정돼야 controller와 test가 안정된다.
  - 변경 파일 수는 적지만 dependency가 직접적이다.

## Critical Path

1. `AppService.buildProfileSummary` boundary 확정
2. `AppService.getProfileSummary`와 controller endpoint 연결
3. Jest unit contract 충족 확인

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## Failure Escalation Policy

- normalization 정책이 `0` fallback 대신 예외 throw로 바뀌면 이 샘플 범위를 중단하고 contract를 다시 정의한다.
- endpoint 응답 shape에 nested object가 추가되면 작은 샘플 범위를 넘는 것으로 보고 scope를 재조정한다.

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `backend-developer`
- primary_skill: `backend-dev`
- 작업:
  - `AppService`에 profile summary normalization boundary를 추가한다.
  - `AppController`에 `GET /profile-summary` endpoint를 연결한다.
- 산출물:
  - `features/nest-api/src/app.service.ts`
  - `features/nest-api/src/app.controller.ts`
- 단위 테스트 의도:
  - `boundary=service`, `placement_intent=api`, `artifact=profile-summary.service.spec.ts`
  - `boundary=controller`, `placement_intent=api`, `artifact=profile-summary.controller.spec.ts`
- E2E 테스트 의도: `N/A (backend-only API sample)`

## 파일 변경 목록

- 수정:
  - `features/nest-api/src/app.service.ts`
  - `features/nest-api/src/app.controller.ts`
- 신규:
  - `features/nest-api/src/profile-summary*.spec.ts` 또는 동급 `src/**/*.spec.ts` 파일 확장 (구현 단계에서 최종 배치)
  - `plans/sample-backend-profile-summary-api/plan.md`
  - `plans/sample-backend-profile-summary-api/tests/manifest.md`
  - `plans/sample-backend-profile-summary-api/tests/profile-summary.service.spec.ts`
  - `plans/sample-backend-profile-summary-api/tests/profile-summary.controller.spec.ts`
- 삭제:
  - 없음

## 검증 명령

1. `pnpm --dir features/nest-api lint`
2. `pnpm --dir features/nest-api test -- --runInBand profile-summary`

## 종료 기준

- [ ] `GET /profile-summary`가 합의된 response shape를 반환한다.
- [ ] 누락/잘못된 숫자 seed가 `0`으로 정규화된다.
- [ ] controller가 service 응답을 래핑 없이 그대로 전달한다.
- [ ] Jest unit spec이 constraint contract를 모두 커버한다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] planning artifact가 최종 spec 경로를 고정하지 않음

## 롤백/폴백

- 롤백 방법: normalization boundary가 과하면 기존 `getHello()` 외 endpoint 추가만 제거하고 service를 원복한다.
- 폴백 조건: response shape 합의가 깨지면 `/profile-summary` 대신 service-only sample로 축소한다.

## 품질 게이트 결정

- Unit: `run` - service/controller boundary와 normalization 규칙을 contract로 고정해야 한다.
- E2E: `skip` - backend-only sample이며 bounded UI surface가 없다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
