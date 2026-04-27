# Phase {n}. {phase-title}

- owner_agent: `{agent-name}`

## 목표와 완료 신호

| 항목 | 내용 |
| --- | --- |
| 목표 | {이번 phase가 남기는 구체적 결과} |
| 선행 조건 | {직전 phase 또는 local prerequisite 계약. 없으면 `none`} |
| output | {phase 완료 후 다음 phase나 사용자에게 제공되는 canonical output} |
| 완료 신호 | {리뷰어/실행자가 확인할 수 있는 완료 상태} |

## 작업 흐름

| 순서 | 작업 | 이유 | 완료 조건 |
| --- | --- | --- | --- |
| 1 | {작업} | {이 순서가 필요한 이유} | {완료 조건} |
| 2 | {작업} | {이 순서가 필요한 이유} | {완료 조건} |

## 변경 경계

| boundary | 변경 내용 | 유지할 것 | 제약 |
| --- | --- | --- | --- |
| `{boundary-name}` | {변경할 동작/구조} | {건드리지 않을 경계} | {제약. 없으면 `없음`} |
| `{boundary-name}` | {변경할 동작/구조} | {건드리지 않을 경계} | {제약. 없으면 `없음`} |

## 시나리오 / 계약

| scenario | input | output | negative/no-op | owner |
| --- | --- | --- | --- | --- |
| {scenario/trigger} | {입력, precondition, 시작 state} | {반드시 발생해야 하는 canonical output} | {발생하면 안 되는 출력 또는 no-op 규칙} | {state/API/component/test owner} |
| {scenario/trigger} | {입력, precondition, 시작 state} | {반드시 발생해야 하는 canonical output} | {발생하면 안 되는 출력 또는 no-op 규칙} | {state/API/component/test owner} |

> visual acceptance가 이 phase의 일부라면 comparison mode, gating metric, non-gating metric, comparison policy, metric treatment를 이 section의 별도 row나 짧은 보조 표로 추가한다.

## 파일 영향

| 파일 | 작업 방식 | 완료 조건 |
| --- | --- | --- |
| `path/to/file` | {변경 / 연결 / 확인 / 비공개} | {파일 기준 완료 상태} |
| `path/to/file` | {변경 / 연결 / 확인 / 비공개} | {파일 기준 완료 상태} |

## 검증

| 검증 항목 | 확인 수단 | 기대 결과 |
| --- | --- | --- |
| {검증이 필요한 계약 또는 state} | {test / story / compare / source inspection / command} | {기대 결과} |
| {검증이 필요한 계약 또는 state} | {test / story / compare / source inspection / command} | {기대 결과} |

## 리스크 / 주의점

| 리스크 | failure/validation | 대응 |
| --- | --- | --- |
| {실패 가능성 또는 edge case} | {어떤 실패를 어떻게 확인할지} | {완화, 차단 조건, 후속 조치} |
| {실패 가능성 또는 edge case} | {어떤 실패를 어떻게 확인할지} | {완화, 차단 조건, 후속 조치} |
