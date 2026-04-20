# Phase {n}. {phase-title}

## Phase 요약

| 항목 | 내용 |
| --- | --- |
| 목표 | {이번 phase가 잠그는 핵심 결과} |
| 연결 작업 단위 | `{boundary-name}`, `{boundary-name}` |
| 선행 조건 | `none` (없으면) |
| 검증 메모 | {리뷰어가 이 phase에서 바로 확인할 핵심 포인트} |
| 로컬 전제 계약 | {다음 또는 이전 phase와 주고받는 계약. 없으면 `없음`} |

## 작업 순서

| 순서 | 작업 단위 | 이번 단계에서 처리하는 내용 | 완료 조건 |
| --- | --- | --- | --- |
| 1 | `{boundary-name}` | {가장 먼저 처리해야 하는 이유와 변경 범위} | {phase 내부 완료 기준} |
| 2 | `{boundary-name}` | {중간 구현 또는 정합화 범위} | {phase 내부 완료 기준} |
| 3 | `{boundary-name}` | {후속 검증 또는 마무리 범위} | {phase 내부 완료 기준} |

## 작업 단위 A. {boundary-name}

| 항목 | 내용 |
| --- | --- |
| 변경 이유 | {사용자 요청과 현재 문제를 연결한 변경 이유} |
| 현재 문제 | {현재 드러난 결함 또는 부족한 점} |
| 목표 상태 | {이번 phase에서 달성해야 하는 상태} |
| 유지 경계 | {이번 phase에서 건드리지 않는 경계} |

### 관련 파일

| 파일 | 작업 역할 | 검증 메모 |
| --- | --- | --- |
| `path/to/file` | {변경 / 연결 / 확인 / 비교} | {이 파일에서 확인할 핵심 포인트} |
| `path/to/file` | {변경 / 연결 / 확인 / 비교} | {이 파일에서 확인할 핵심 포인트} |

### 공개 계약

| 항목 | 내용 |
| --- | --- |
| public surface | {props / inputs / outputs} |
| state ownership | {controlled / default / internal} |
| callback / handoff | {callback 의미 또는 handoff 규칙} |
| no-op / invalid rule | {무시 또는 no-op 규칙} |
| 추가 관찰 포인트 | {API / route / state / selector 등} |

### 시각 패리티 계약

| 항목 | 내용 |
| --- | --- |
| comparison mode | {`structural parity` / `full-fidelity parity` / `none`} |
| gating metric | {blocking metric / `n/a`} |
| non-gating metric | {advisory metric / `none`} |
| local surface | {task-local noun / `n/a`} |
| canonical surface role | {`frame-surface` / `navigation-surface` / `control-surface` / `content-surface` / `media-surface` / `text-detail-surface` / `ornament-surface` / `fixture-payload-surface` / `n/a`} |
| comparison policy | {`gating` / `advisory` / `noise` / `ignore` / `n/a`} |
| metric treatment | {`full-compare` / `boundary-and-geometry` / `layout-only` / `text-metrics-only` / `masked-out` / `n/a`} |

### 검증 근거

| 항목 | 확인 수단 |
| --- | --- |
| {검증이 필요한 계약 또는 상태} | {test / story / compare / source inspection} |
| {검증이 필요한 계약 또는 상태} | {test / story / compare / source inspection} |

## 작업 단위 B. {boundary-name}

| 항목 | 내용 |
| --- | --- |
| 변경 이유 | {사용자 요청과 현재 문제를 연결한 변경 이유} |
| 현재 문제 | {현재 드러난 결함 또는 부족한 점} |
| 목표 상태 | {이번 phase에서 달성해야 하는 상태} |
| 유지 경계 | {이번 phase에서 건드리지 않는 경계} |

### 관련 파일

| 파일 | 작업 역할 | 검증 메모 |
| --- | --- | --- |
| `path/to/file` | {변경 / 연결 / 확인 / 비교} | {이 파일에서 확인할 핵심 포인트} |
| `path/to/file` | {변경 / 연결 / 확인 / 비교} | {이 파일에서 확인할 핵심 포인트} |

### 공개 계약

| 항목 | 내용 |
| --- | --- |
| public surface | {props / inputs / outputs} |
| state ownership | {controlled / default / internal} |
| callback / handoff | {callback 의미 또는 handoff 규칙} |
| no-op / invalid rule | {무시 또는 no-op 규칙} |
| 추가 관찰 포인트 | {API / route / state / selector 등} |

### 시각 패리티 계약

| 항목 | 내용 |
| --- | --- |
| comparison mode | {`structural parity` / `full-fidelity parity` / `none`} |
| gating metric | {blocking metric / `n/a`} |
| non-gating metric | {advisory metric / `none`} |
| local surface | {task-local noun / `n/a`} |
| canonical surface role | {`frame-surface` / `navigation-surface` / `control-surface` / `content-surface` / `media-surface` / `text-detail-surface` / `ornament-surface` / `fixture-payload-surface` / `n/a`} |
| comparison policy | {`gating` / `advisory` / `noise` / `ignore` / `n/a`} |
| metric treatment | {`full-compare` / `boundary-and-geometry` / `layout-only` / `text-metrics-only` / `masked-out` / `n/a`} |

### 검증 근거

| 항목 | 확인 수단 |
| --- | --- |
| {검증이 필요한 계약 또는 상태} | {test / story / compare / source inspection} |
| {검증이 필요한 계약 또는 상태} | {test / story / compare / source inspection} |

## Phase 검증

| 검증 항목 | 확인 수단 | 기대 결과 |
| --- | --- | --- |
| {phase-level validation} | {command 또는 수단} | {기대 결과} |
| {phase-level validation} | {command 또는 수단} | {기대 결과} |
