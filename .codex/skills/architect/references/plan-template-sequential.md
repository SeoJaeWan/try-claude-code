**Branch:** {type}/{task-slug}

> Worktree dir: `worktrees/{task-slug}` (plan 기준 디렉터리)

# {task-title}

| # | Phase | Agent |
| --- | --- | --- |
| 1 | `./phases/01-{phase-slug}.md` | `{agent-name}` |
| 2 | `./phases/02-{phase-slug}.md` | `{agent-name}` |
| 3 | `./phases/03-{phase-slug}.md` | `{agent-name}` |

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | {사용자의 원문 요청을 항목별로 보존한 요약} |
| 포함 범위 | {이번 plan에서 실제로 처리하는 범위} |
| 제외 범위 | {제외 항목과 이유. 없으면 `없음`} |
| 완료 기준 | {사용자가 확인할 수 있는 최종 완료 상태} |

## 변경 형상

{이번 변경이 어떤 구조와 흐름으로 바뀌는지 3-6문장으로 설명한다. 필요할 때만 Mermaid 또는 ASCII diagram을 추가한다.}

| 변경 축 | 현재 | 목표 |
| --- | --- | --- |
| {boundary-or-flow} | {현재 구조/흐름} | {변경 후 구조/흐름} |
| {boundary-or-flow} | {현재 구조/흐름} | {변경 후 구조/흐름} |

## 잠긴 계약

| 계약 | 대상 경계 | input | output | ownership / no-op | 검증 위치 |
| --- | --- | --- | --- | --- | --- |
| {contract-name} | `{component-hook-route-service}` | {입력/trigger} | {정상 출력/state} | {소유권, winner rule, invalid/no-op} | {phase 또는 검증 수단} |
| {contract-name} | `{component-hook-route-service}` | {입력/trigger} | {정상 출력/state} | {소유권, winner rule, invalid/no-op} | {phase 또는 검증 수단} |

> visual acceptance가 포함되면 이 section에 comparison mode, gating metric, non-gating metric, local surface -> canonical surface role mapping을 추가한다.
> 이 section은 cross-phase/public-surface 계약만 다룬다. phase-local API grammar, 파일별 작업, 상세 검증표는 linked phase detail file로 내린다.

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 상세 문서 |
| --- | --- | --- | --- | --- |
| Phase 1. {phase-title} | {이 phase가 남기는 결과} | {변경 경계} | {관찰 가능한 완료 상태} | `./phases/01-{phase-slug}.md` |
| Phase 2. {phase-title} | {이 phase가 남기는 결과} | {변경 경계} | {관찰 가능한 완료 상태} | `./phases/02-{phase-slug}.md` |
| Phase 3. {phase-title} | {이 phase가 남기는 결과} | {변경 경계} | {관찰 가능한 완료 상태} | `./phases/03-{phase-slug}.md` |

> phase마다 한 row만 둔다. phase-local field table, 파일별 작업 table, scenario/검증 table을 여기서 반복하지 않는다.

## 리스크와 검증

| 리스크 / edge case | 영향 | 완화 또는 검증 |
| --- | --- | --- |
| {risk-or-edge-case} | {영향받는 경계/사용자 결과} | {검증 phase, test, compare, source inspection} |
| {risk-or-edge-case} | {영향받는 경계/사용자 결과} | {검증 phase, test, compare, source inspection} |

## 검토 체크리스트

- [ ] `요청과 범위`만 읽어도 사용자 요청, 포함 범위, 제외 범위, 완료 기준이 보인다.
- [ ] `변경 형상`이 전체 구조와 흐름을 설명하고 phase detail을 열지 않아도 큰 그림을 이해할 수 있다.
- [ ] `잠긴 계약`에 touched public surface, input, output, ownership/no-op, 검증 위치가 보인다.
- [ ] `실행 흐름`이 phase 순서, 목적, 주요 변경, 완료 신호를 중복 없이 보여준다.
- [ ] `plan.md`는 phase-local file map, scenario/검증 matrix, phase field summary를 반복하지 않고 overview 역할만 유지한다.
- [ ] `리스크와 검증`은 주요 failure mode와 검증 위치를 연결한다.
