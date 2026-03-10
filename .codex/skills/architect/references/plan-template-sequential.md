**Branch:** {type}/{summary}

# {작업명} 실행 계획 (Sequential)

## 요약

- 목표:
- 배경:
- 실행 모드: `sequential`

## Resolved Decisions

- 구현/테스트/UX 결과를 바꾸는 정책, 계약, 스키마, 상태, 권한, 검증 결정:

## Explicit Defaults

- 비차단(non-blocking) 기본값과 그 이유:

## Assumptions and Risks

- Assumptions:
- Risks:

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부       | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------------- | --------- |
| unit-a    | path/a/\*        | 없음             | 높음(공유 파일) | 아니오    |
| unit-b    | path/a/\*        | unit-a 결과      | 높음(공유 파일) | 아니오    |

결론:

- 모든 주요 작업이 공유 파일/선행 산출물에 묶여 있어 순차 실행이 적합함.

## Execution Mode Decision

- `sequential`
- 근거:
    - 공유 핵심 파일군 집중
    - 선행 산출물 의존도가 높음

## Critical Path

1. Phase 1
2. Phase 2
3. Phase 3

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## 범위

- In Scope:
- Out of Scope:

## 단계별 실행

`owner_agent` 값은 `./.claude/agents/{owner_agent}.md`와 일치해야 함.
필요 시 `primary_skill`로 에이전트 내부 실행 스킬을 고정할 수 있음.
실행은 `planner-lite` 스킬이 메인 대화에서 오케스트레이션하며, 각 페이즈 디스패치에서 `Agent(... isolation: "worktree")`를 강제함. 페이즈별 머지 후 최종 `Branch`로 `--no-ff` 병합함.

### Phase 1

- owner_agent: `{agent-name}`
- primary_skill: `{skill-name}` (선택)
- 작업:
- 산출물:
- 단위 테스트: `tests/{mirrored-source-path}` (해당 시, plan-unit-test artifact)
- E2E 테스트: `e2e/{domain}/{scenario}.spec.ts` (해당 시, plan-e2e-test artifact)

### Phase 2

- owner_agent: `{agent-name}`
- primary_skill: `{skill-name}` (선택)
- 작업:
- 산출물:

### Phase 3

- owner_agent: `{agent-name}`
- primary_skill: `{skill-name}` (선택)
- 작업:
- 산출물:

### E2E Test Artifacts (UI/user-flow scope)

E2E 테스트는 planning 단계에서 `plan-e2e-test` 스킬로 생성된 frozen artifact임.
별도의 E2E 실행 phase는 불필요 - 구현 phase에서 E2E artifact를 참조하여 `data-testid` 적용.

- 산출물 위치: `plans/{task-name}/e2e/manifest.md`, `plans/{task-name}/e2e/{domain}/{scenario}.spec.ts`
- E2E 실패 시 구현을 수정 (테스트를 수정하지 않음)

## 파일 변경 목록

- 수정:
- 신규:
- 삭제:

## 검증 명령

1. {command}
2. {command}

## 종료 기준

- [ ] 기준 1
- [ ] 기준 2

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함

## 롤백/폴백

- 롤백 방법:
- 폴백 조건:

## 품질 게이트 결정

- E2E: run/skip + 이유

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
