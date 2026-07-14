# Codex Skill Drift Audit

## Scope

이 문서는 `claude-plugin/` 쪽 Claude 스킬과 `codex-plugin/` Workbench 스킬을 제외하고 `.codex/skills/**` 안의 Codex planning 스킬 문서만 전수조사한 결과다.

> 이 문서는 2026-06-05 기준의 `.codex` planning stack drift audit이다. 현재 사용자-facing Codex 스킬의 기준 경로는 `codex-plugin/plugins/workbench/`이며, 현재 구조와 책임 경계는 [`docs/current-architecture.md`](../../docs/current-architecture.md)를 참조한다.

- 조사 대상: `.codex/skills/**/SKILL.md`, `.codex/skills/**/references/*.md`
- 제외 대상: `.codex/skills/**/assets/**`, `.codex/skills/**/scripts/**`, `.codex/skills/**/agents/**`, `claude-plugin/**`, `codex-plugin/**`
- 조사 규모: 스킬 14개, 문서 65개, 약 5,602라인
- 목적: 같은 정책이 여러 문서에 분산되어 향후 수정 시 드리프트가 생길 수 있는 지점을 찾는다.

## Implementation Status

2026-06-05 기준 High Priority 1-3은 1차 정리를 적용했다.

| 항목 | 상태 | 반영 내용 |
| --- | --- | --- |
| First-time TDD 계약 | 완료 | `plan-tdd/references/contracts.md`에 First-Time Test Contract Fields를 두고 workflow/layer/plan-maker/plan-review 문서는 참조하도록 축소 |
| Plan wiki Git safety | 완료 | `plan-wiki-setup/references/platform-commands.md` Git Sync를 공통 소유자로 두고 plan-wiki maintenance skill은 current operation boundary만 남김 |
| Operation history model | 완료 | `plan-wiki-setup/references/history-model.md`를 공통 모델로 추가하고 apply-feedback/ingest history 문서는 operation-specific extension으로 축소 |
| Medium Priority 4-6 | 미적용 | dev wiki routing, Figma authority, planning docs lifecycle은 후속 정리 후보로 유지 |

## 판단 기준

| 구분 | 의미 | 처리 방향 |
| --- | --- | --- |
| 유지 가능한 반복 | 각 스킬 입구에서 반드시 보여야 하는 안전 경고나 짧은 라우팅 문구 | 짧게 유지하되 공통 근거 문서를 링크한다 |
| 구조적 중복 | 같은 정책의 필드 목록, 차단 조건, 완료 상태가 여러 파일에 반복됨 | 한 문서를 소유자로 정하고 다른 문서는 참조만 남긴다 |
| 충돌 위험 | 한쪽 문구가 바뀌면 다른 skill이 이전 행동을 유도할 수 있음 | 우선 리팩터링 대상 |
| 단순 형식 반복 | `Required Reading`, `Workflow`, `Guardrails` 같은 제목 반복 | 문제로 보지 않는다 |

## High Priority

### 1. First-time TDD 계약 정책이 여러 단계에 분산됨

이번 `plan-tdd` 수정에서 실제로 드러난 문제다. 테스트 환경이 없을 때 red contract test를 쓸지, `blocked`로 둘지 판단하는 조건이 여러 문서에 나뉘어 있다.

| 위치 | 현재 역할 |
| --- | --- |
| `.codex/skills/brainstorm/references/guardrails.md:24` | first-time TDD와 future source/test topology가 planning-ready 전에 잠겨야 한다고 말함 |
| `.codex/skills/plan-maker/references/workflow.md:64` | first-time runner, command, spec root, config ownership 등을 plan에서 잠그라고 말함 |
| `.codex/skills/plan-maker/references/workflow.md:120` | test environment가 없을 때 expected red reason까지 잠그라고 말함 |
| `.codex/skills/plan-review/references/guardrails.md:18` | first-time TDD 필드 누락 plan을 승인하지 말라고 말함 |
| `.codex/skills/plan-review/references/review-policy.md:41` | 같은 누락을 blocker signal로 분류함 |
| `.codex/skills/plan-tdd/references/contracts.md:21` | 환경이 없어도 plan이 잠그면 source-tree test를 만들라고 말함 |
| `.codex/skills/plan-tdd/references/workflow.md:13-36` | `TDD contract mode` 진입 조건과 blocker taxonomy를 정의함 |
| `.codex/skills/plan-tdd/references/unit-test-conventions.md:10-11` | unit setup 부재 판단을 반복함 |
| `.codex/skills/plan-tdd/references/component-test-conventions.md:18-19` | Component Test setup 부재 판단을 반복함 |
| `.codex/skills/plan-tdd/references/e2e-test-conventions.md:19-21` | E2E setup 부재 판단을 반복함 |

리스크:

- 필드 목록이 한 곳에서만 바뀌면 다른 단계가 이전 필드 목록으로 block/pass를 판단할 수 있다.
- `plan-maker`, `plan-review`, `plan-tdd`가 같은 정책을 각자 다른 표현으로 소유하게 된다.
- layer convention 문서가 공통 blocker taxonomy를 다시 정의하면서 이번처럼 4개 파일 동시 수정이 필요해진다.

추천:

- 공통 정책 소유자는 plan wiki의 테스트/리뷰 handoff 계층 또는 `plan-tdd/references/contracts.md` 중 하나로 고정한다.
- `plan-tdd/references/workflow.md`는 실행 절차와 report frontmatter mechanics만 유지한다.
- `unit/component/e2e` 문서는 "first-time setup 판단은 workflow의 TDD contract mode를 따른다" 한 줄만 남기고, 레이어별 runner/bootstrap 차이만 둔다.
- `plan-maker`와 `plan-review`는 필드 목록을 직접 반복하지 말고 "first-time TDD contract 필수 필드"를 공통 문서에서 읽게 한다.

### 2. Plan wiki source repo Git safety 규칙이 여러 skill에 그대로 반복됨

`plan-wiki-*` maintenance skill들이 모두 nested plan wiki repo를 만지기 때문에 안전 규칙 반복은 필요하다. 하지만 현재는 같은 문장이 여러 파일에 중복되고 일부 표현이 조금씩 다르다.

| 위치 | 현재 역할 |
| --- | --- |
| `.codex/skills/plan-wiki-apply-feedback/SKILL.md:61-64` | status 확인, 현재 batch만 commit, unrelated dirty 제외, explicit approval 후 commit/push |
| `.codex/skills/plan-wiki-ingest/SKILL.md:71-74` | ingest batch에 대해 같은 정책 반복 |
| `.codex/skills/plan-wiki-lint/SKILL.md:37-40` | lint cleanup에 대해 같은 정책 반복 |
| `.codex/skills/plan-wiki-setup/SKILL.md:45-50` | setup/bootstrap에 대해 같은 정책 반복 |
| `.codex/skills/plan-wiki-setup/references/platform-commands.md:38-44` | nested source repo commit boundary 정책을 별도 reference로 이미 설명 |
| `.codex/skills/plan-wiki-setup/references/staging-contract.md:38` | explicit approval 규칙 반복 |

리스크:

- 안전 규칙은 중요한데, 표현이 여러 곳에 있으면 한 skill만 최신 safety policy를 놓칠 수 있다.
- "commit and push"와 "push only after approval" 같은 문구 차이가 나중에 commit 허용 범위 오해로 번질 수 있다.
- 현재 이미 `platform-commands.md`가 공통 소유자 역할을 일부 하고 있지만 다른 skill이 직접 읽도록 되어 있지 않다.

추천:

- `plan-wiki-setup/references/platform-commands.md` 또는 새 `plan-wiki-source-safety.md`를 공통 소유자로 둔다.
- apply-feedback, ingest, lint, setup의 `SKILL.md`에는 짧은 safety reminder만 남긴다.
- 각 skill은 "current operation changed files only"처럼 자기 operation boundary만 추가한다.

### 3. Operation history model이 apply-feedback와 ingest에 중복됨

두 history model 파일은 의도적으로 operation type 차이가 있지만, 공통 schema와 docs exposure 규칙이 거의 같다.

| 위치 | 현재 역할 |
| --- | --- |
| `.codex/skills/plan-wiki-apply-feedback/references/history-model.md` | feedback history schema |
| `.codex/skills/plan-wiki-ingest/references/history-model.md` | ingest history schema |

확인 결과:

- `Purpose`, `Path Contract`, `Operation Types`, `Docs Exposure`, `Guardrails`의 상당 부분이 동일하거나 거의 동일하다.
- 차이는 `type`, 예시 `inputs`, `changes`, `status` 의미, cleanup 정책 정도다.

리스크:

- history root, status enum, docs exposure 규칙이 바뀌면 두 파일을 동시에 수정해야 한다.
- 공통 schema와 operation-specific extension이 섞여 있어서 "어느 필드가 모든 operation 공통인지"가 흐려진다.

추천:

- 공통 history schema를 하나의 reference로 분리한다.
- `apply-feedback`와 `ingest` 문서는 operation-specific fields/status nuance만 둔다.
- `plan-wiki-lint`와 `plan-wiki-setup`도 같은 history schema를 쓸 계획이 있으면 지금 공통화하는 편이 좋다.

## Medium Priority

### 4. Dev wiki setup/consumer routing 정책이 여러 skill에 걸쳐 있음

dev wiki는 setup skill, graph/update skill, orchestrator, planning roles가 모두 소비한다. 현재도 `consumer-context.md`가 공통 소비 규칙을 어느 정도 맡고 있어 구조는 괜찮은 편이다. 다만 missing config, source refresh, repair routing 문구가 여러 곳에 퍼져 있다.

| 위치 | 현재 역할 |
| --- | --- |
| `.codex/skills/dev-wiki-setup/references/staging-contract.md` | config/source/project root 계약 |
| `.codex/skills/dev-wiki-setup/references/sync-policy.md` | sync/repair 정책 |
| `.codex/skills/dev-wiki-setup/references/consumer-context.md` | planning role 소비 규칙 |
| `.codex/skills/dev-wiki-graph/SKILL.md:22-24` | config missing 시 setup route |
| `.codex/skills/dev-wiki-update/SKILL.md:20-22` | config missing 시 setup route |
| `.codex/skills/orchestrator/references/workflow.md:26-32` | opt-in, refresh, repair route |
| `.codex/skills/plan-maker/references/workflow.md:30` | dev wiki 소비 방식 |
| `.codex/skills/plan-review/references/workflow.md:24` | dev wiki 소비 방식 |
| `.codex/skills/plan-tdd/references/workflow.md:9` | dev wiki 소비 방식 |

리스크:

- setup owner와 consumer owner는 나뉘어야 하는데, 일부 consumer 문서가 setup/repair 세부를 다시 말한다.
- orchestrator refresh 정책이 바뀌면 setup skill, consumer-context, orchestrator references가 같이 바뀔 가능성이 있다.

추천:

- setup/repair 소유자는 `dev-wiki-setup/references/sync-policy.md`로 고정한다.
- planning role 소비 규칙은 `consumer-context.md`만 소유한다.
- graph/update skill은 config missing route 정도만 유지한다.

### 5. Figma authority / inventory prerequisite 정책이 여러 planning skill에 반복됨

Figma inventory는 `figma-inventory-snapshot`이 capture를 소유하고, brainstorm/plan-maker/plan-review/ui-spec/orchestrator가 prerequisite 판단을 나눠 가진다.

| 위치 | 현재 역할 |
| --- | --- |
| `.codex/skills/figma-inventory-snapshot/SKILL.md:21-31` | capture artifact 권위와 tool/data blocker |
| `.codex/skills/brainstorm/references/guardrails.md:25-26` | Figma authority 없으면 planning-ready 금지 |
| `.codex/skills/brainstorm/references/workflow.md` | Figma inventory artifact gate 설명 |
| `.codex/skills/plan-maker/references/workflow.md:50-53` | verified manifest/snapshot 없으면 blocker |
| `.codex/skills/plan-review/references/review-policy.md:42-43` | Figma authority를 implementation phase로 미루면 blocker |
| `.codex/skills/ui-spec/references/workflow.md` | UI direction과 reference authority 판단 |

리스크:

- "이 inventory가 authority인지 evidence인지" 기준이 skill별로 조금씩 달라질 수 있다.
- Figma-first gate 변경 시 planning stack 전체를 같이 수정해야 한다.

추천:

- authority 판단은 plan wiki core 또는 별도 common reference가 소유한다.
- `figma-inventory-snapshot`은 capture mechanics만 소유한다.
- planning skills는 "authority artifact required/available/missing" 상태만 참조한다.

### 6. Planning docs approval / feedback / learning lifecycle이 orchestrator references에 퍼져 있음

orchestrator 내부 reference가 커지고 있으며, planning docs UI, approval, feedback routing, learning capture가 여러 파일에 걸쳐 있다.

| 위치 | 현재 역할 |
| --- | --- |
| `.codex/skills/orchestrator/references/planning-docs.md` | approval gate, feedback routing, learning reference |
| `.codex/skills/orchestrator/references/planning-docs-ui.md` | browser UI artifact contract |
| `.codex/skills/orchestrator/references/planning-docs-learning.md` | non-blocking learning capture |
| `.codex/skills/orchestrator/references/workflow.md` | planning loop에서 docs gate 호출 |

리스크:

- approval gate와 UI schema가 함께 바뀔 때 수정 위치가 흐려질 수 있다.
- learning capture가 non-blocking이라는 정책이 `planning-docs.md`와 `workflow.md` 양쪽에 반복된다.

추천:

- approval gate는 `planning-docs.md`가 소유한다.
- UI data schema는 `planning-docs-ui.md`가 소유한다.
- learning capture는 `planning-docs-learning.md`가 소유한다.
- `workflow.md`는 호출 순서와 outcome routing만 유지한다.

## Low Priority / 유지 가능

### 7. Korean-first terminology policy 반복

여러 skill이 `용어-정책.md`를 required reading으로 지정한다. 이는 공통 정책을 실제로 중앙화하고 있는 좋은 반복이다.

유지 방향:

- 각 skill의 entrypoint에는 "Korean-first prose" 정도의 짧은 reminder를 유지한다.
- 용어 목록이나 번역 규칙을 skill-local prose로 복제하지 않는다.

### 8. 공통 heading 반복

`Required Reading`, `Workflow`, `Guardrails`, `Controller Rules` 같은 heading은 구조 반복일 뿐 정책 중복은 아니다.

유지 방향:

- 조사 대상에서 제외한다.
- heading 반복을 줄이려고 문서 구조를 깨지 않는다.

## Recommended Refactor Order

| 순서 | 대상 | 이유 | 예상 수정 범위 |
| --- | --- | --- | --- |
| 1 | `plan-tdd` first-time TDD 계약 중복 축소 | 이미 실제 block/completed 판단 오류로 이어졌고, layer 문서 3개가 공통 정책을 반복한다 | `plan-tdd/references/workflow.md`, `unit/component/e2e`, 필요 시 `contracts.md` |
| 2 | `plan-wiki` source repo safety 공통화 | exact duplicate가 많고 안전 정책이라 드리프트 비용이 큼 | `plan-wiki-setup/references/*`, `plan-wiki-{apply-feedback,ingest,lint,setup}/SKILL.md` |
| 3 | operation history model 공통화 | 두 파일이 거의 같은 schema를 따르며 앞으로 lint/setup도 history를 쓰면 더 퍼질 수 있음 | `plan-wiki-*/references/history-model.md` |
| 4 | dev wiki setup/consumer boundary 정리 | 이미 공통 문서가 있으므로 작은 정리로 드리프트를 줄일 수 있음 | `dev-wiki-setup/references/*`, graph/update/orchestrator/planning role references |
| 5 | Figma authority gate 공통화 | planning stack 전체 정책이지만 현재 큰 장애는 아님 | figma inventory, brainstorm, plan-maker, plan-review, ui-spec |
| 6 | planning docs lifecycle ownership 정리 | orchestrator 내부 복잡도 관리용 | orchestrator references |

## Suggested Rule For Future Skill Edits

새로운 skill 문구를 추가하거나 기존 정책을 바꿀 때 다음 규칙을 적용한다.

1. 공통 차단 조건, 상태 값, frontmatter 값, 필수 필드 목록은 한 문서만 소유한다.
2. 레이어별 reference는 공통 정책을 다시 정의하지 않고 "공통 정책을 따른다"라고만 말한다.
3. 각 skill entrypoint에는 안전상 꼭 필요한 짧은 reminder만 둔다.
4. 같은 문장을 세 skill 이상에 복사해야 한다면 먼저 common reference 후보로 본다.
5. "이 문구가 틀리면 agent 행동이 바뀌는가?"에 해당하면 단순 설명이 아니라 정책 소유권 문제로 분류한다.

## Next Decision

가장 먼저 손볼 후보는 `plan-tdd`다. 이번 수정으로 동작 방향은 맞췄지만 구조상 layer 문서가 여전히 공통 setup 판단을 일부 반복한다. 다음 정리에서는 `TDD contract mode` 판단을 한 곳에 묶고, unit/component/e2e 문서는 레이어별 차이만 남기는 편이 좋다.
