**Branch:** {type}/{task-slug}

> Worktree dir: `worktrees/{task-slug}` (plan 기준 디렉터리)

# {task-title}

| # | Phase | Agent |
| --- | --- | --- |
| 1 | `./phases/01-{phase-slug}.md` | `{agent-name}` |
| 2 | `./phases/02-{phase-slug}.md` | `{agent-name}` |
| 3 | `./phases/03-{phase-slug}.md` | `{agent-name}` |

## 요청 추적

| 사용자 요청 항목 | 이번 plan에서 다루는 방식 | 연결 작업 단위 | 비고 |
| --- | --- | --- | --- |
| {user-request-item} | {plan에서 어떻게 다루는지} | {작업 단위 / phase / 파일} | {없음 / 추가 확인 필요} |
| {user-request-item} | {plan에서 어떻게 다루는지} | {작업 단위 / phase / 파일} | {없음 / 추가 확인 필요} |

## 작업 단위 요약

| 작업 단위 | 관련 파일/경계 | 현재 문제 | 목표 상태 | 검증 메모 |
| --- | --- | --- | --- | --- |
| `{boundary-name}` | `path/to/file` | {현재 드러난 문제 또는 결함} | {이번 변경으로 도달해야 하는 상태} | {검증 시 확인할 핵심 포인트} |
| `{boundary-name}` | `path/to/file` | {현재 드러난 문제 또는 결함} | {이번 변경으로 도달해야 하는 상태} | {검증 시 확인할 핵심 포인트} |

## 공개 계약 요약

| 대상 | public surface | state ownership | callback / handoff | invalid / no-op |
| --- | --- | --- | --- | --- |
| `{component-or-hook}` | {props / inputs / outputs} | {controlled / default / internal} | {callback 의미 또는 handoff 규칙} | {무시 규칙 / no-op 규칙} |
| `{component-or-hook}` | {props / inputs / outputs} | {controlled / default / internal} | {callback 의미 또는 handoff 규칙} | {무시 규칙 / no-op 규칙} |

## 소유권/상태 규칙

| surface | owner | 규칙 | 검증 수단 |
| --- | --- | --- | --- |
| `{state-or-surface}` | {internal / controlled / host} | {winner rule / open-close / invalid-no-op} | {story / test / compare} |
| `{state-or-surface}` | {internal / controlled / host} | {winner rule / open-close / invalid-no-op} | {story / test / compare} |

## 시각 패리티 계약

| 비교 상태/범위 | comparison mode | gating metric | non-gating metric | 로컬 surface 메모 |
| --- | --- | --- | --- | --- |
| `{state-or-scope}` | `structural parity` | {blocking metric} | {advisory metric / `none`} | {task-local noun -> canonical surface role mapping} |
| `{state-or-scope}` | `full-fidelity parity` | {blocking metric} | {advisory metric / `none`} | {task-local noun -> canonical surface role mapping} |

## 제외 범위

| 제외 항목 | 이번 plan에서 제외한 이유 | 승인 상태 | 사용자 요청과의 관계 |
| --- | --- | --- | --- |
| {excluded-item} | {범위 제외 / 후속 처리 / 별도 slug} | {명시적 사유} | {요청에 있었는지 / 없었는지 / 승인 여부} |
| {excluded-item} | {범위 제외 / 후속 처리 / 별도 slug} | {명시적 사유} | {요청에 있었는지 / 없었는지 / 승인 여부} |

## 단계 개요

| Phase | 연결 작업 단위 | 이번 단계에서 해결하는 핵심 | 완료 후 보이는 변화 | 다음 단계로 넘기는 것 |
| --- | --- | --- | --- | --- |
| Phase 1. {phase-title} | `{boundary-name}`, `{boundary-name}` | {가장 먼저 잠가야 하는 경계 또는 계약} | {이 단계 완료 후 관찰 가능한 결과} | {다음 단계 전제 계약} |
| Phase 2. {phase-title} | `{boundary-name}`, `{boundary-name}` | {중간 구현 또는 정합화 경계} | {이 단계 완료 후 관찰 가능한 결과} | {다음 단계 전제 계약} |
| Phase 3. {phase-title} | `{boundary-name}`, `{boundary-name}` | {마무리 검증 또는 후속 조정 경계} | {이 단계 완료 후 관찰 가능한 결과} | {다음 단계 전제 계약} |

## Phase 단계 설명

### Phase 1. {phase-title}

| 항목 | 내용 |
| --- | --- |
| 목표 | {이번 phase가 잠그는 핵심 결과} |
| 연결 작업 단위 | `{boundary-name}`, `{boundary-name}` |
| 선행 조건 | `none` (없으면) |
| 검증 메모 | {리뷰어가 이 phase에서 바로 확인할 핵심 포인트} |
| 상세 문서 | `./phases/01-{phase-slug}.md` |

### Phase 2. {phase-title}

| 항목 | 내용 |
| --- | --- |
| 목표 | {이번 phase가 잠그는 핵심 결과} |
| 연결 작업 단위 | `{boundary-name}`, `{boundary-name}` |
| 선행 조건 | {직전 phase 또는 로컬 prerequisite 계약} |
| 검증 메모 | {리뷰어가 이 phase에서 바로 확인할 핵심 포인트} |
| 상세 문서 | `./phases/02-{phase-slug}.md` |

### Phase 3. {phase-title}

| 항목 | 내용 |
| --- | --- |
| 목표 | {이번 phase가 잠그는 핵심 결과} |
| 연결 작업 단위 | `{boundary-name}`, `{boundary-name}` |
| 선행 조건 | {직전 phase 또는 로컬 prerequisite 계약} |
| 검증 메모 | {리뷰어가 이 phase에서 바로 확인할 핵심 포인트} |
| 상세 문서 | `./phases/03-{phase-slug}.md` |

## 검토 체크리스트

- [ ] 요청 추적 표에서 사용자 요청 항목이 빠짐없이 보인다.
- [ ] 작업 단위 요약 표만 읽어도 어떤 경계가 바뀌는지 알 수 있다.
- [ ] 공개 계약 요약에서 touched public surface, callback, ownership, invalid/no-op 규칙이 보인다.
- [ ] 제외 범위가 있다면 항목별 이유와 승인 상태가 분리되어 있다.
- [ ] visual parity acceptance가 있으면 시각 패리티 계약 표에 comparison mode, gating metric, non-gating metric, 로컬 surface 매핑이 분리되어 있다.
- [ ] 단계 개요와 Phase 단계 설명만 읽어도 실행 순서와 완료 조건을 이해할 수 있다.
