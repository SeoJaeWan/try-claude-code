# .codex 에이전트 가이드

`.codex/`는 이 저장소에서 Codex가 소유하는 planning stack이다. Codex planning workflow가 사용하는 planning skill, planning review 도구, project-local plan wiki 연결을 정의한다.

## 소유권 경계

- `.codex/skills/`는 Codex planning/control 문서 영역이다. 각 skill entrypoint는 작게 유지하고, 상세 절차는 직접 연결된 `references/` 파일로 분리한다.
- `.codex/tools/`는 planning docs package 생성처럼 Codex planning artifact가 사용하는 보조 스크립트와 로컬 서버를 둔다.
- `.codex/plan-wiki/source/`는 shared plan wiki를 위한 nested Git repository다. 이 repo의 commit과 working tree는 root repository와 분리해서 다룬다.
- `codex-plugin/`은 Codex 실행/워크벤치 플러그인 영역이다. issue brief, brainstorm, test brief, executor, visual grounding, branch work report, OpenAPI/dev-wiki helper 같은 실행 전후 workflow skill을 둔다. `.codex` planning stack과 협력하지만 소유권은 별도다.
- `claude-plugin/`은 Claude Code 호환 실행 플러그인과 statusline 플러그인 영역이다. Codex-owned planning stack 코드가 아니다.
- Codex는 execution agent, hook, script, runtime behavior를 이해하기 위해 `codex-plugin/`과 `claude-plugin/`을 읽고 참고할 수 있지만, `.codex` planning docs가 소유하는 영역처럼 다루지 않는다.
- 사용자가 plugin/runtime 구현 작업을 명시적으로 요청했거나 승인된 실행 plan이 해당 plugin 작업을 라우팅한 경우에만 `codex-plugin/` 또는 `claude-plugin/`을 수정한다. `.codex` planning docs를 정비하는 중에는 plugin 파일을 가볍게 함께 수정하지 않는다.

## Planning Skill 목록

| Skill | 역할 |
| --- | --- |
| `brainstorm` | executable planning 전에 request scope, public boundary, exclusion, execution area, diagnostic inventory를 잠근다. |
| `ui-spec` | screen, layout, state, interaction, responsive behavior가 아직 불명확할 때 user-visible UI direction을 잠근다. |
| `figma-inventory-snapshot` | 이후 planning input으로 사용할 controller-verified Figma hierarchy 또는 component inventory evidence를 캡처한다. |
| `plan-maker` | 잠긴 upstream decision과 active plan wiki rule을 바탕으로 `./plans` 아래 self-contained executable plan file을 작성한다. |
| `plan-tdd` | production code를 수정하지 않고 executable plan을 source-tree TDD contract test와 `tdd.md`로 구체화한다. |
| `plan-review` | plan을 다시 쓰지 않고 현재 `plan.md`와 `tdd.md`를 active plan wiki contract 기준으로 cold review한다. |
| `orchestrator` | plan wiki refresh, `plan-maker`, `plan-tdd`, `plan-review`, planning docs approval을 포함한 artifact-driven planning loop를 조율한다. |
| `plan-wiki-setup` | project-local plan wiki source clone과 planning root를 생성하거나 검증한다. |
| `plan-wiki-lint` | plan wiki consistency를 점검하고, 승인된 cleanup 전에 proposed cleanup report를 작성한다. |
| `plan-wiki-ingest` | 수집된 review output을 durable raw evidence와 promoted plan wiki pattern으로 변환한다. |
| `plan-wiki-apply-feedback` | plan wiki inbox의 docs feedback JSON을 source wiki document와 history에 반영한다. |

## `codex-plugin/plugins/workbench/` — 실행 워크벤치 경계

`codex-plugin/plugins/workbench/`는 `.codex` planning stack의 대체물이 아니라, 구현 전후의 실제 작업 흐름을 돕는 Codex plugin이다. Jira가 없어도 사용자 프롬프트, QA 리포트, pasted issue text, Figma/OpenAPI/repo evidence를 바탕으로 작업 단위를 정리하고 실행할 수 있어야 한다.

| Skill | 역할 |
| --- | --- |
| `fable5` | 복잡하거나 불확실한 작업을 fact-first operating mode로 운영한다. 사실/추측/사용자 결정을 분리하고, 재현-계측-가설 기각-최소 수정-정량 검증 루프를 적용한다. |
| `issue-brief` | Jira 또는 프롬프트/QA 리포트 기반 issue evidence를 confirmed facts, unconfirmed assumptions, bug/reproduction evidence, work units로 정리한다. |
| `brainstorm` | 선택된 work unit의 current context, diagnostic plan, implementation notes, risks, checks를 정리한다. 원인 불명 버그는 바로 수정 계획이 아니라 재현/계측/가설 기각 계획을 먼저 세운다. |
| `test-brief` | 구현 전 contract/regression test 또는 measurement brief를 작성한다. 영구 테스트와 임시 계측/승격 기준을 구분한다. |
| `executor` | 선택된 work unit 하나를 구현하거나 진단한다. 원인 불명 버그는 재현 → 계측 → 가설 기각 → 원인 확정 → 최소 수정 → 정량 재검증 루프를 따른다. |
| `visual-grounding` | Figma/source UI/reference screenshot과 local target을 비교하고, 필요하면 click/drag/focus/scroll 같은 interaction evidence까지 수집한다. |
| `branch-work-report` | 현재 work branch를 commit 단위로 설명하고, 버그 수정의 원인 근거, 임시 계측 제거/승격 여부, 검증 공백을 리뷰한다. |
| `openapi` | 등록된 Swagger/OpenAPI 서비스를 검색, 갱신, inspect하고 endpoint 후보 evidence를 제공한다. |
| `dev-wiki` | Workbench-owned dev wiki를 setup/audit/update/lint/graph 흐름으로 관리한다. |

## 핵심 Flow

- Request locking: executable planning 전에 `brainstorm`을 먼저 사용하고, UI direction이 충분히 구체적이지 않으면 `ui-spec`을 사용한다.
- Orchestrated planning: `orchestrator`가 plan wiki를 fast-forward pull로 1회 refresh한 뒤 `plan-maker -> plan-tdd -> plan-review -> planning docs` 순서로 라우팅한다.
- Direct planning: upstream scope, UI direction, execution area, exclusion, verification expectation이 이미 잠겨 있을 때만 `plan-maker`를 직접 사용한다.
- Direct implementation: plan을 만들지 않고 바로 처리하는 작은 작업에서도 `.codex/dev-wiki/config.json`이 있고 `.codex/dev-wiki/source/{project}`가 존재하면, 작업 범위에 맞는 dev wiki 문서를 먼저 참고한다. 예: 파일 배치와 naming은 `conventions/`, 구조와 경계는 `architecture/`, 실행/검증/Git 절차는 `workflows/`, 탐색 시작점은 `graph/`를 본다.
- Dev wiki precedence: dev wiki는 프로젝트별 개발 참고자료이며, 현재 source/config/test와 충돌하면 source를 우선하고 dev wiki를 stale 가능성으로 본다. dev wiki 자체를 갱신해야 할 때는 명시적 규칙 반영은 `dev-wiki-update`, repository와 wiki의 전체 동기화는 `dev-wiki-sync`, graph 산출물 갱신은 `dev-wiki-graph`를 사용한다.
- Plan wiki maintenance: wiki source 작업에는 `plan-wiki-setup`, `plan-wiki-lint`, `plan-wiki-ingest`, `plan-wiki-apply-feedback`를 사용한다. root repository commit과 `.codex/plan-wiki/source` commit은 분리한다.
- Figma inventory: complete Figma hierarchy, component-set inventory, Resource/* coverage, platform marker가 plan boundary에 영향을 주면 planning 전에 `figma-inventory-snapshot`을 사용한다.
- Workbench execution flow: 복잡하거나 불확실한 작업은 `fable5`를 operating mode로 삼고, Jira 없이도 사용자 프롬프트가 충분하면 `issue-brief`가 범용 issue brief를 만들며, `brainstorm -> test-brief(optional) -> executor`가 하나의 reviewable work unit을 진행한다. 원인 불명 버그는 별도 debug skill을 만들지 않고 이 흐름 안에서 diagnostic depth를 높인다.

## 편집 규칙

- 각 skill의 `SKILL.md`는 entrypoint로 유지한다. trigger description, required reading, controller rule만 둔다.
- skill-local execution procedure, input/output, artifact schema, template, blocker handling, report mechanics, tool-specific workflow detail은 해당 skill의 `references/` 아래에 둔다.
- cross-skill policy, quality criteria, learned review rule, test-strategy policy, planning contract meaning, durable review guidance는 plan wiki source에 둔다.
- cross-skill workflow ownership은 `orchestrator`에만 둔다. non-orchestrator skill은 자기 role, accepted input, produced artifact, blocker/result state, local execution rule만 설명한다.
- non-orchestrator skill 안에 upstream/downstream skill call order, next-skill routing, producer-specific assumption을 넣지 않는다. artifact name, artifact state, neutral contract를 사용한다.
- skill reference 안에서 plan wiki policy를 중복 작성하지 않는다. active plan wiki로 link하거나 route한다.
- durable planning rule 또는 review rule을 추가할 때는 plan wiki source와 registry 또는 pattern link를 함께 갱신한다.
- `.codex` skill 문서는 간결하게 유지한다. 직접 연결된 reference file을 통한 progressive disclosure를 우선한다.
- skill 또는 planning tool을 수정한 뒤에는 가능한 가장 좁은 validation을 실행한다. skill-local validator가 있으면 사용하고, `git diff --check`와 관련 root test(예: `npm test`)를 함께 고려한다.
