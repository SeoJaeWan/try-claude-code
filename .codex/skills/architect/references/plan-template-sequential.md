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

## 구조화 세부 계약

이 섹션은 dense schema, RLS, API, function, state-machine, validation matrix처럼 `실행 흐름`의 `주요 변경` 한 칸에 넣으면 읽기 어려운 계약이 있을 때만 둔다. 해당 범위가 없으면 생략한다.

### DB schema 계약

| phase | table | 주요 컬럼 | RLS / 권한 정책 | 이번 계획에서 하지 않는 것 |
| --- | --- | --- | --- | --- |
| `P1` | `{schema.table}` | `{column and constraint summary}` | `{role and owner policy summary}` | {제외되는 column/table/policy} |

## 파일/폴더 구조 계약

| 경로 | 종류 | 상태 | 소유 phase | 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `{source-or-test-path}` | `source` / `test` / `fixture` / `config` / `artifact` / `docs` | `create` / `modify` / `keep` / `forbidden` / `remove` | `P1` | {이 경로가 맡는 책임} | {확인한 기존 구조 또는 중복 방지 근거} |

## 체험 산출물

| id | phase | kind | 경로 | 목적 | 검토 포인트 |
| --- | --- | --- | --- | --- | --- |
| `{artifact-id}` | `P1` | `ui-preview` / `api-contract` / `function-contract` / `backend-contract` / `fixture-view` | `evidence/{artifact}.html` | {HTML/JS로 체험할 계약} | {empty, loading, success, validation-error, forbidden 등} |

`ui-preview`는 검토자가 직접 승인 여부를 판단할 수 있는 HTML/CSS preview evidence다. 최종 구현 코드는 아니지만, 계획한 화면 또는 component의 구조, 주요 control, 실제에 가까운 내용 밀도, 중요한 상태, 필요한 viewport 단서를 보여준다. `검토 포인트`에는 검토자가 봐야 할 화면 영역, 상태, viewport, 핵심 UI 요소를 적는다.

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | {첫 실행 묶음의 목표} | {이 phase가 바꾸는 파일/계약/동작} | {이 phase만으로 확인 가능한 완료 상태} | {이 phase가 소유한 검증 또는 다음 phase 전 확인} | {이 phase 완료 후 하나의 commit으로 남길 경계. 예: `phase 1: scaffold and test runners`} |
| Phase 2 | {다음 실행 묶음의 목표} | {이 phase가 바꾸는 파일/계약/동작} | {이 phase만으로 확인 가능한 완료 상태} | {이 phase가 소유한 검증 또는 다음 phase 전 확인} | {이 phase 완료 후 하나의 commit으로 남길 경계} |

> 구현 범위가 작아 하나의 phase로 충분하면 `Phase 1`만 둔다. 구현 범위가 여러 공개 경계, runner, registry, UI, migration, 비교, 또는 E2E를 건드리면 phase를 나누고 각 phase가 독립적인 검토와 커밋 경계를 갖게 한다.
> `주요 변경`은 검토자가 훑을 수 있는 짧은 요약이다. 긴 column list, RLS matrix, route schema, state table은 `구조화 세부 계약` 또는 별도 계약 표로 올리고, `주요 변경`에 comma-separated field list를 길게 넣지 않는다.

## 개발자 리뷰 반영 내역

첫 draft에서는 `없음`으로 둔다. Browser developer review에서 `needs-change` 또는 `question`이 제출된 뒤 plan을 개정할 때는 해당 feedback이 어떤 phase에 반영됐고 어떻게 처리됐는지 기록한다.

| round | phase | target / anchor | 요청 유형 | 리뷰 요청 | 처리 방식 | 반영 위치 |
| --- | --- | --- | --- | --- | --- | --- |
| `R1` | `P1` | `P1 / contracts` | `needs-change` | {검토자가 요청한 내용의 한국어 요약} | {plan에 반영한 처리 방식} | `{section-or-table}` |

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
- [ ] UI/API/function/backend 계약이 문장만으로 다르게 해석될 수 있으면 `체험 산출물`에 HTML/CSS/JS preview 또는 harness를 연결했다.
- [ ] schema/RLS/API/function/state-machine처럼 dense한 계약은 `실행 흐름`의 긴 문장 대신 구조화 표로 분리했다.
- [ ] developer review feedback으로 개정한 plan이면 `개발자 리뷰 반영 내역`에 요청과 처리 방식이 phase별로 남아 있다.
- [ ] UI preview evidence는 검토자가 직접 판단할 수 있도록 계획한 화면 또는 component의 구조, 상태, 내용 밀도, 필요한 viewport 단서를 보여준다.
- [ ] 체험 산출물은 production code가 아니라 plan 이해용 projection이며, 실제 API/server/DB/파일 쓰기를 요구하지 않는다.
- [ ] 검증 책임은 실제 변경 경계와 관찰 가능한 완료 상태를 연결한다.
- [ ] 구현 범위가 있으면 `## 실행 흐름`이 phase 단위로 보이고 각 phase의 완료 신호, 검증, 커밋 경계가 있다.
