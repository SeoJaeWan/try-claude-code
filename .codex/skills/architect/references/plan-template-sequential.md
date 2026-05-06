---
plan_slug: {feature-area}
branch: {type}/{feature-area}
owner_agent: {owner-agent}
---

# {계획 제목}

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | {사용자의 원문 요청을 항목별로 보존한 요약} |
| 포함 범위 | {이번 plan에서 실제로 처리하는 범위} |
| 제외 범위 | {제외 항목과 이유. 없으면 `없음`} |
| 완료 기준 | {사용자가 확인할 수 있는 최종 완료 상태} |

## 실행 소유권

| 항목 | 내용 |
| --- | --- |
| `owner_agent` | `{owner-agent}` |
| 변경 경계 | {이 plan이 바꾸는 경계} |
| 유지 경계 | {이 plan이 건드리지 않는 경계} |
| 선행 조건 | {필요한 선행 결정이나 plan 완료 신호. 없으면 `none`} |

## 현재 근거

| 근거 | 확인 내용 | plan에 반영한 결론 |
| --- | --- | --- |
| `{path-or-source}` | {현재 상태 또는 권위 입력} | {실행자가 다시 추론하지 않아도 되는 결론} |

## 기능 계약

| 계약 | 대상 경계 | input | output | negative/no-op | 소유권 | 검증 위치 |
| --- | --- | --- | --- | --- | --- | --- |
| {계약 이름} | `{component-hook-route-service}` | {입력/트리거} | {정상 출력/상태} | {발생하면 안 되는 출력 또는 no-op 규칙} | {상태/API/component 소유자} | {검증 항목 또는 명령} |

## 파일/폴더 구조 계약

| 경로 | 종류 | 상태 | 소유 phase | 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `{source-or-test-path}` | `source` / `test` / `fixture` / `config` / `artifact` / `docs` | `create` / `modify` / `keep` / `forbidden` / `remove` | `P1` | {이 경로가 맡는 책임} | {확인한 기존 구조 또는 중복 방지 근거} |

## 체험 산출물

| id | phase | kind | 경로 | 목적 | 검토 포인트 |
| --- | --- | --- | --- | --- | --- |
| `{artifact-id}` | `P1` | `ui-preview` / `api-contract` / `function-contract` / `backend-contract` / `fixture-view` | `evidence/{artifact}.html` | {HTML/JS로 체험할 계약} | {empty, loading, success, validation-error, forbidden 등} |

## 실행 흐름

| 단계 | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| P1 | {첫 실행 묶음의 목표} | {이 단계가 바꾸는 파일/계약/동작} | {이 단계만으로 확인 가능한 완료 상태} | {이 단계가 소유한 검증 또는 다음 단계 전 확인} | {이 단계 완료 후 하나의 commit으로 남길 경계. 예: `P1: workspace 기반 구성과 test runner 설정`} |
| P2 | {다음 실행 묶음의 목표} | {이 단계가 바꾸는 파일/계약/동작} | {이 단계만으로 확인 가능한 완료 상태} | {이 단계가 소유한 검증 또는 다음 단계 전 확인} | {이 단계 완료 후 하나의 commit으로 남길 경계} |

> 구현 범위가 작아 하나의 단계로 충분하면 `P1`만 둔다. 구현 범위가 여러 공개 경계, runner, registry, UI, migration, 비교, 또는 E2E를 건드리면 단계를 나누고 각 단계가 독립적인 검토와 커밋 경계를 갖게 한다.

## 검증

| 검증 항목 | 검증 단위 | 확인 수단 | 기대 결과 |
| --- | --- | --- | --- |
| {검증이 필요한 계약 또는 상태} | {`unit` / `Component Test` / `E2E` / `command` / `manual/visual`} | {테스트 / story / 비교 / 소스 확인 / 명령} | {기대 결과} |

## 리스크 / 주의점

| 리스크 | failure/validation | 대응 |
| --- | --- | --- |
| {실패 가능성 또는 edge case} | {어떤 실패를 어떻게 확인할지} | {완화, 차단 조건, 후속 조치} |

## 검토 체크리스트

- [ ] YAML frontmatter에 `plan_slug`, `branch`, `owner_agent`가 있다.
- [ ] `owner_agent`가 활성 `실행-라우팅.md` catalog에 있는 값이다.
- [ ] 이 plan 파일 하나만 읽어도 실행 의미가 닫힌다.
- [ ] 포함 범위와 제외 범위가 사용자 요청과 추적 가능하다.
- [ ] 다른 plan, shared contract, 단계 상세 문서를 필수 읽기 대상으로 만들지 않았다.
- [ ] 사람이 읽는 문장에 현재 `용어-정책.md`를 적용했고, 코드 표기 밖 영어는 원문 일치 예외 사유가 있을 때만 남겼다.
- [ ] 기능 계약에 영향받는 공개 경계, `input`, `output`, 소유권/no-op, 검증 위치가 보인다.
- [ ] 관련 프로젝트 구조를 실제 확인했고, 생성/수정/유지/금지 경로를 `파일/폴더 구조 계약`에 확정했다.
- [ ] UI/API/function/backend 계약에 체험 산출물이 필요한지 현재 plan wiki 기준으로 판단했고, 필요하면 `체험 산출물`에 HTML/JS preview 또는 harness를 연결했다.
- [ ] 체험 산출물은 production code가 아니라 plan 이해용 projection이며, 실제 API/server/DB/파일 쓰기를 요구하지 않는다.
- [ ] 검증 책임은 실제 변경 경계와 관찰 가능한 완료 상태를 연결한다.
- [ ] 구현 범위가 있으면 `## 실행 흐름`이 단계 단위로 보이고 각 단계의 완료 신호, 검증, 커밋 경계가 있다.
