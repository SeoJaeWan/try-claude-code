**Branch:** {type}/{summary}

# {작업명} 실행 계획 (DAG)

## 요약

- 목표:
- 배경:
- 실행 모드: `partial-parallel` 또는 `parallel`

## Resolved Decisions

- 구현/테스트/UX 결과를 바꾸는 정책, 계약, 스키마, 상태, 권한, 검증 결정:

## Explicit Defaults

- 비차단(non-blocking) 기본값과 그 이유:

## Assumptions and Risks

- Assumptions:
- Risks:

## Parallel Feasibility Matrix

| Work Unit       | 예상 변경 파일군             | 선행 산출물 의존 | 충돌 여부 | 병렬 가능   |
| --------------- | ---------------------------- | ---------------- | --------- | ----------- |
| contract-freeze | spec/\*, shared types        | 없음             | 낮음      | 예          |
| core            | plugin/src/core/\*           | contract-freeze  | 낮음      | 예(선행 후) |
| docs            | .claude/commands/_, skills/_ | contract-freeze  | 낮음      | 예(선행 후) |

## Execution Mode Decision

- `partial-parallel` 또는 `parallel`
- 근거:
  - 선행 단일 트랙 완료 후 독립 병렬 트랙 실행 가능
  - track 간 BlockingFiles 교집합이 없음

## Critical Path

1. Track `contract-freeze`
2. Track `core` + `docs` 병렬
3. 통합 검증

## Track Dependency Graph

- `contract-freeze -> core`
- `contract-freeze -> docs`
- `core -> integration`
- `docs -> integration`

## 메인 플랜 산출물

- `plan.md` (마스터 인덱스 + DAG 설명)
- `plan-contract-freeze/plan.md`
- `plan-core/plan.md`
- `plan-docs/plan.md`
- `tests/manifest.md` (track test manifest index)
- `e2e/manifest.md` (track e2e manifest index)

UI feature scope인 경우 planning 단계에서 `plan-e2e-test` 스킬로 runner-appropriate E2E artifact 생성:

- `plans/{task-name}/plan-{track}/e2e/manifest.md` + track-local runner-appropriate E2E artifacts
- 상세 기준은 `references/planning-policy.md`를 따름
- 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve

UI/user-journey 또는 regression-hardening scope인 경우 후속 execution track/phase에 아래를 추가:

- `owner_agent: playwright-guard`
- `primary_skill: guard-e2e-test`
- 산출물: 실제 테스트 디렉토리의 `guard/{domain}/{risk}.spec.ts`

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 병렬 트랙 분해가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함

## 트랙 파일 필수 메타 (각 plan-{track}/plan.md)

- `Track`: 트랙 식별자
- `DependsOn`: 선행 트랙 목록 또는 `none`
- `StartCondition`: 시작 조건
- `ReadyCheck`: 시작 가능 여부 확인 커맨드
- `BlockingFiles`: 동시 수정 금지 파일 목록
- `Outputs`: 트랙 완료 산출물
- `MergeCondition`: 병합 가능 조건
- 각 실행 블록(`Tn`)의 `owner_agent`
  - 상세 규칙은 `references/planning-policy.md`를 따름
- 실행/병합 오케스트레이션:
  - 상세 규칙은 `references/planning-policy.md`를 따름

각 트랙은 아래를 함께 포함해야 한다:

- `plan-{track}/tests/manifest.md` (+ 테스트 파일) 또는 `N/A` 근거
- `plan-{track}/e2e/manifest.md` (+ runner-appropriate E2E 파일) 또는 `N/A` 근거

---

## 샘플 Track 파일 스켈레톤

**Branch:** {type}/{summary}-{track}

# {track} Track Plan

## Track

- `{track}`

## DependsOn

- `none` 또는 `{track-a}, {track-b}`

## StartCondition

- 예: `contract-freeze` 트랙 문서가 머지되었고 공유 스키마가 동결됨

## ReadyCheck

1. `{command}`
2. `{command}`

## BlockingFiles

- `path/to/shared-file-a`
- `path/to/shared-file-b`

## Outputs

- `artifact-a`
- `artifact-b`

## MergeCondition

- [ ] 트랙 검증 명령 통과
- [ ] DependsOn 트랙 산출물 반영 완료
- [ ] BlockingFiles 충돌 없음

## 단계별 실행

### T1

- owner_agent: `{agent-name}`
- primary_skill: `{skill-name}` (선택)
- 작업:
- 단위 테스트 의도: `boundary={hook|service|validator|component}`, `placement_intent={component-local|page-local|shared|api}`, `artifact={boundary-id}.test.ts` (해당 시, plan-unit-test artifact)
- E2E 테스트 의도: `runner={Playwright|Maestro}`, `surface={surface-id}`, `artifact={surface-id}.spec.ts` 또는 `{flow-id}.yaml` (해당 시, plan-e2e-test artifact)

### T2

- owner_agent: `{agent-name}`
- primary_skill: `{skill-name}` (선택)
- 작업:

## 검증 명령

1. {command}
2. {command}

## 종료 기준

- [ ] 기준 1
- [ ] 기준 2
