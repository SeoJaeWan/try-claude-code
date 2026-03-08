**Branch:** {type}/{summary}

# {작업명} 실행 계획 (DAG)

## 요약

- 목표:
- 배경:
- 실행 모드: `partial-parallel` 또는 `parallel`

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
- `plan-contract-freeze.md`
- `plan-core.md`
- `plan-docs.md`

UI/user-flow scope인 경우 E2E 트랙(또는 후속 phase)을 추가:
- `playwright-test-planner` -> `playwright-test-generator`
- `playwright-test-healer`는 실패 시 조건부 실행

## 트랙 파일 필수 메타 (각 plan-{track}.md)

- `Track`: 트랙 식별자
- `DependsOn`: 선행 트랙 목록 또는 `none`
- `StartCondition`: 시작 조건
- `ReadyCheck`: 시작 가능 여부 확인 커맨드
- `BlockingFiles`: 동시 수정 금지 파일 목록
- `Outputs`: 트랙 완료 산출물
- `MergeCondition`: 병합 가능 조건
- 각 실행 블록(`Tn`)의 `owner_agent`
    - `owner_agent`: `./.claude/agents/{owner_agent}.md`와 일치
    - 필요 시 `primary_skill`로 에이전트 내부 실행 스킬 고정
- 실행/병합 오케스트레이션:
    - 트랙별로 `planner-lite` 스킬 세션 1개 실행 (메인 대화에서)
    - `planner-lite`가 각 페이즈 디스패치에서 `Agent(... isolation: "worktree")`를 강제하고 페이즈별 머지
    - 최종 병합 대상은 각 파일의 `Branch` (`--no-ff`)

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
- 테스트: `tests/{mirrored-source-path}` (해당 시)

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
