# Current Architecture — Codex Workbench

> 기준일: 2026-08-10

이 문서는 현재 사용자-facing Codex Workbench의 canonical 구조와 책임 경계를 설명합니다. 활성 제품은 `codex-plugin/`에 두고, 이전 구현은 `legacy/`에 보존합니다. 새 Workbench는 근거를 먼저 확인하고, 기억 갱신과 구현 권한을 분리하며, 모든 repository 작업을 전용 worktree에 격리하는 다섯 개의 명시 호출 스킬로 구성됩니다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| Codex 메인 플러그인 | `codex-plugin/plugins/workbench/` | 다섯 개의 explicit-only workflow skill, Local Work Memory·Context7 MCP 설정, 계약 테스트 |
| Codex marketplace | `codex-plugin/.agents/plugins/marketplace.json` | 활성 Workbench 로컬 marketplace 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | manifest cachebuster와 로컬 plugin install |
| 활성 CI | `.github/workflows/workbench-test.yml` | 현재 Workbench의 정적 계약과 Node 테스트 |
| 현재 문서 | `docs/current-architecture.md` | 현재 구조와 책임 경계의 canonical 문서 |
| Project-local evaluator | `.codex/skills/evaluate-workbench/` | legacy v2의 `brainstorm`/`executor` 계약 회귀 검사; 현재 다섯 스킬의 평가기는 아님 |
| Project-local Codex 설정 | `.codex/config.toml` | evaluator용 agent thread 설정; 활성 plugin 배포 대상이 아님 |
| 역사 보관 | `legacy/old/` | Claude Code 플러그인, 과거 planning stack, 제거된 skill과 문서 |
| v1 보존본 | `legacy/v1/workbench/` | Workbench v1 snapshot |
| v2 보존본 | `legacy/v2/` | 직전 활성 Workbench의 plugin, marketplace, hook, tools와 배포 구성 전체 |

## 루트 구조

```text
.
├── .agent/
├── .claude/
├── .codex/
│   ├── AGENTS.md
│   ├── config.toml
│   └── skills/evaluate-workbench/
├── .github/workflows/workbench-test.yml
├── codex-plugin/
├── docs/current-architecture.md
├── legacy/
│   ├── old/
│   ├── v1/workbench/
│   └── v2/
├── README.md
├── package.json
└── .gitignore
```

## 활성 Workbench 구조

```text
codex-plugin/
├── .agents/plugins/marketplace.json
├── plugins/workbench/
│   ├── .codex-plugin/plugin.json
│   ├── .mcp.json
│   ├── __tests__/
│   └── skills/
│       ├── shape/
│       │   ├── SKILL.md
│       │   ├── agents/openai.yaml
│       │   └── references/
│       ├── memory-update/
│       │   ├── SKILL.md
│       │   ├── agents/openai.yaml
│       │   └── references/
│       ├── prepare/
│       │   ├── SKILL.md
│       │   ├── agents/openai.yaml
│       │   └── references/
│       ├── execute-task/
│       │   ├── SKILL.md
│       │   ├── agents/openai.yaml
│       │   └── references/
│       └── finalize/
│           ├── SKILL.md
│           ├── agents/openai.yaml
│           └── references/
└── scripts/deploy-workbench-plugin.mjs
```

`SKILL.md`에는 해당 단계의 핵심 절차와 금지 조건만 두고, 상세 schema와 handoff 계약은 바로 연결된 `references/`에 둡니다. 플러그인 manifest와 각 `agents/openai.yaml`은 활성 skill selector와 설명을 동일하게 유지합니다.

## 명시 호출 경계

활성 skill은 정확히 다음 다섯 개입니다.

```text
$workbench:shape
$workbench:memory-update
$workbench:prepare
$workbench:execute-task
$workbench:finalize
```

모든 `agents/openai.yaml`은 implicit invocation을 비활성화합니다. 일반 자연어가 skill description과 일치하더라도 자동 호출하지 않으며, 한 skill이 다른 Workbench skill을 자동 호출해서도 안 됩니다. 각 결과는 가능한 다음 handoff를 안내할 수 있지만 다음 단계 시작에는 새로운 명시 selector가 필요합니다.

이 분리는 사용자가 다음처럼 일부 단계만 사용할 수 있게 합니다.

- Shape Report만 받은 뒤 종료
- Shape Report를 일반 Codex 구현 요청의 근거로 사용
- 기억 갱신을 생략하고 Prepare부터 진행
- 이미 승인된 Execution Plan의 특정 task만 실행
- 같은 Workbench run에서 이미 통합된 결과에 Finalize만 적용

## 다섯 단계 계약

| Skill | 원래 단계 | 입력 | 핵심 책임 | 출력 |
|---|---:|---|---|---|
| `shape` | 0~4 | 사용자 목표와 대상 repository | memory 조회, repository 탐색, 요구사항 분석, invariant·acceptance criteria, 공식 근거 조사, architecture decision | 출처가 연결된 Shape Report와 Memory Change Set |
| `memory-update` | 5 | 승인 가능한 Shape Report와 Memory Change Set | 준비된 Local Work Memory 변경만 Shape가 확보한 revision으로 방어해 적용 | 적용·충돌·미적용 항목을 담은 Memory Update Result |
| `prepare` | 6~7 | 동일 run의 READY Shape Report | task 분해, dependency DAG, baseline 실행, worktree topology와 검증 명령 확정 | 실행 가능한 Execution Plan과 Baseline Report |
| `execute-task` | 8 | Execution Plan의 task 하나 | task plan, 성공 기준, 구현, focused verification, self-review, 승인된 경우 checkpoint commit | Task Result와 다음 integration 정보 |
| `finalize` | 9~11 | coordinator worktree의 통합 결과 | concurrency·load·failure 검사, 독립 리뷰, 문서·최종 보고 | Final Report와 알려진 한계 |

어떤 skill도 입력 계약이 없는 상태에서 앞 단계의 결과를 추측해 만들지 않습니다. 입력이 불충분하면 가능한 읽기 전용 검사를 끝낸 뒤 부족한 항목을 보고합니다.

## Shape와 근거 모델

Workbench Shape를 호출하기 전에 Codex UI에서 coordinator worktree를 시작하거나 이 task를 해당 worktree로 handoff해야 합니다. Shape는 현재 linked worktree를 coordinator로 채택한 뒤 다음 순서로 진행합니다.

1. **Stage 0 — Local Work Memory 조회와 Repository Exploration**
   - 대상 repository와 project identity를 확인합니다.
   - Local Work Memory에서 관련 `dev_wiki`와 `note`를 검색합니다.
   - update 또는 delete 후보는 `memory_get`으로 전체 본문과 `source_revision`까지 확보합니다.
   - 저장소 구조, manifest, lockfile, entrypoint, 기존 pattern, 테스트와 빌드 방식을 읽습니다.
2. **Stage 1 — Requirements Analysis**
   - 사용자 요청을 기능 요구사항, 비기능 요구사항, 제약과 예외 상황으로 분해합니다.
3. **Stage 2 — Invariants와 Acceptance Criteria**
   - 구현 중 유지할 조건과 완료 판정 기준을 분리해 명시합니다.
4. **Stage 3 — Research**
   - 현재 코드만으로 판단할 수 없는 라이브러리·프레임워크·SDK 사실이 결정에 영향을 주면 Context7을 사용할 수 있을 때 사용하고, 사용할 수 없거나 부족하면 공식 원문을 직접 조사합니다.
   - manifest와 lockfile에서 실제 버전을 먼저 확인하고, 그 버전과 구체적인 기술 질문에 맞는 자료를 찾습니다.
   - 공식 원문을 우선하고 Shape Report에 사람이 열 수 있는 링크를 남깁니다.
   - 질문 수나 출처 수를 research mode로 제한하지 않습니다. 관련 기술 사실이 충분히 검증될 때까지 필요한 근거를 사용합니다.
5. **Stage 4 — Architecture와 Decision Log**
   - 확인된 사실, 가능한 대안, 선택 이유와 trade-off를 연결합니다.
   - 설계 선택 자체를 공식 문서가 증명한다고 표현하지 않고, 문서는 선택의 기술적 전제를 뒷받침하는 근거로 사용합니다.

Shape Report의 주요 문장은 다음 provenance를 구분합니다.

- **Fact**: repository, Local Work Memory 또는 공식 문서에서 직접 확인
- **Inference**: 여러 사실을 결합한 해석
- **Decision**: 근거와 trade-off를 바탕으로 선택
- **Assumption**: 아직 확인하지 못한 전제

공식 근거가 없거나 Context7 결과의 버전·원문을 확인할 수 없으면 이를 `unverified`로 표시합니다. 모델 기억만으로 사실을 보완하지 않습니다. Context7 질의에는 필요한 library, version, topic만 보내고 repository secret이나 내부 코드를 포함하지 않습니다.

## Local Work Memory 상태 전이

Shape와 Memory Update의 책임은 의도적으로 분리합니다.

```text
Stage 0: memory_search / memory_get / memory_graph
                  │
                  └── Shape Report + Memory Change Set
                                      │
                     별도 명시 호출: $workbench:memory-update
                                      │
                                      └── memory_write
```

- Stage 0은 읽기 전용입니다.
- Memory Change Set은 create, update, delete 의도와 대상 type, 식별자, 완성된 본문, 근거를 포함합니다.
- 기본 durable 대상은 Local Work Memory의 `dev_wiki`입니다. `note`도 TTL 없는 durable record이므로 사용자가 그 지속성과 중복 생성 위험을 명시적으로 선택한 경우만 사용합니다.
- `memory-update`는 조사, 검색, 자동 병합 또는 문서 재작성 결정을 새로 하지 않습니다.
- update와 delete는 Shape가 확보한 `expected_revision`을 사용합니다.
- 서비스가 revision conflict를 반환하면 최신 문서를 덮어쓰지 않고 Shape로 돌아가 새 snapshot과 변경안을 만듭니다. 현재 비교와 write는 원자적 CAS가 아니므로 외부 동시 writer까지 차단한다고 보장하지 않습니다.
- 외부 시스템 mutation이나 repository 파일 수정은 Stage 5의 권한이 아닙니다.

`allow_implicit_invocation: false`는 skill 선택 정책이지 MCP tool-level authorization이 아닙니다. 현재 Local Work Memory의 단일 endpoint는 `memory_search`, `memory_get`, `memory_graph`, `memory_write`를 함께 제공하므로 Workbench는 skill 계약과 테스트로 write 경계를 지키되, direct MCP 호출 자체를 plugin package에서 강제 차단할 수는 없습니다. 강제 격리가 필요하면 server 측 read/write endpoint 또는 OAuth scope 분리가 후속으로 필요합니다.

## Worktree 실행 모델

Workbench run 전체는 항상 하나 이상의 전용 Git worktree context에서 실행합니다. local checkout은 사용자 작업을 위해 유지하며 Workbench가 repository 파일을 수정하지 않습니다.

### Coordinator

- Codex UI가 합의한 base에서 coordinator worktree를 시작하거나 task를 handoff합니다. 첫 Shape invocation은 이미 할당된 linked worktree만 coordinator로 채택하며 shell에서 worktree를 만들고 task가 이동한 것처럼 가장하지 않습니다.
- Shape Report, baseline, integration 상태와 Final Report의 기준은 coordinator가 소유합니다.
- local checkout에 uncommitted 변경이 있고 그 내용이 목표에 필요하면 이를 조용히 제외하지 않고 사용자에게 기준 commit 또는 포함 방법을 확인합니다.

### Worker 배치

Shape는 변경 경계와 병렬화 후보를 기록하지만 정확한 topology는 Prepare가 task dependency DAG를 만든 뒤 확정합니다.

```text
local checkout (Workbench 변경 없음)
        │
        └── coordinator worktree
               ├── 직렬 task를 순차 실행
               ├── worker worktree A ─┐
               ├── worker worktree B ─┼── coordinator integration task
               └── worker worktree C ─┘
                                      └── finalize
```

Worker worktree는 다음 조건을 모두 만족하는 task에만 추가합니다.

- 동일한 합의 base commit에서 시작할 수 있음
- 선행 task 결과가 필요하지 않음
- owned path와 public contract가 겹치지 않음
- schema migration, generated artifact, lockfile, snapshot, 공용 fixture가 충돌하지 않음
- port, database, queue와 같은 mutable runtime resource를 분리할 수 있음

하나라도 충족하지 못하면 coordinator에서 직렬 실행합니다. Task 수가 아니라 실제 독립적인 parallel group 수가 worker 수를 결정합니다.

### Task와 통합

- `execute-task` invocation 하나는 Execution Plan의 task 하나만 소유합니다.
- task는 지정된 worktree와 owned path 밖을 임의로 변경하지 않습니다.
- 관련 focused test를 먼저 실행하고 필요할 때 broader verification을 수행합니다.
- checkpoint commit은 사용자가 명시했거나 승인된 Execution Plan에 commit 권한이 있을 때만 만듭니다.
- 별도의 여섯 번째 integration skill을 만들지 않습니다. Prepare가 `kind: integration` task를 만들고 `$workbench:execute-task`로 coordinator에서 실행합니다.
- push, local branch merge, worktree 삭제와 원격 PR 생성은 자동 후속 동작이 아니며 각각 명시적 권한이 필요합니다.
- Finalize는 worker의 고립된 결과가 아니라 coordinator의 `integrated_head`를 검증합니다.

## Handoff 불변조건

각 skill 결과에는 다음 단계가 판단에 필요한 최소 상태를 남깁니다.

- repository identity, coordinator path, base commit과 현재 head
- 사용자 목표, 범위 밖 항목과 미해결 질문
- 근거 출처와 확인 시점 또는 revision
- acceptance criteria와 verification command
- task dependency, owned paths, parallel group와 integration order
- 수행한 mutation, commit 여부, 실패와 알려진 한계
- `recommended_next`와 그 이유

`recommended_next`는 자동 실행 명령이 아닙니다. 사용자는 결과를 검토하고 다음 skill 호출 여부를 결정합니다.

## Project-local evaluator 경계

`.codex/skills/evaluate-workbench/`는 `$workbench:brainstorm`, Goal Contract와 `$workbench:executor`를 전제로 합니다. 따라서 새 다섯 skill entrypoint를 가진 활성 plugin을 평가 대상으로 받을 수 없습니다.

- evaluator 파일은 이번 Workbench 재구성의 수정 대상이 아닙니다.
- evaluator test가 `npm test`에 포함되더라도 이는 legacy v2 evaluator 자체의 regression test입니다.
- evaluator 성공을 새 `shape → prepare → execute-task` 흐름의 acceptance evidence로 사용하지 않습니다.
- 새 Workbench benchmark는 `.codex/` 변경 승인을 받은 별도 작업에서 설계해야 합니다.

## 책임 경계

- `codex-plugin/plugins/workbench/`는 현재 사용자-facing skill, manifest, MCP 연결과 계약 테스트를 소유합니다.
- Local Work Memory server는 기억의 검색·조회·graph·write와 revision 비교를 소유합니다. Workbench는 이를 임의의 local wiki clone으로 복제하거나 원자적 compare-and-swap을 보장한다고 과장하지 않습니다.
- Context7은 외부 라이브러리 자료 탐색을 돕지만, repository 사실이나 사용자 결정을 대신하지 않습니다.
- local checkout은 Workbench 구현 대상이 아니며 coordinator와 worker worktree가 repository 변경을 소유합니다.
- `.codex/skills/evaluate-workbench/`는 legacy v2 evaluator로 격리합니다.
- `.agent/`는 이 저장소의 프로젝트 작업 규칙 원본이고 `.claude/CLAUDE.md`는 Claude Code용 얇은 어댑터입니다.
- `.github/`에는 활성 Workbench CI만 둡니다.
- `docs/`에는 현재 기준 문서만 둡니다.
- `legacy/`는 보관 영역이며 활성 manifest, marketplace, CI, test 또는 workflow contract의 입력으로 사용하지 않습니다.

## Legacy 매핑

| 이전 영역 | 보관 경로 |
|---|---|
| Claude Code plugin | `legacy/old/claude-code/plugin/` |
| Claude marketplace | `legacy/old/claude-code/marketplace.json` |
| 과거 plans와 CI | `legacy/old/claude-code/` |
| 과거 project-local Codex planning stack | `legacy/old/codex-planning-stack/` |
| 과거 역사 문서와 제거된 skill | `legacy/old/docs/`, `legacy/old/workbench-skills/` |
| Workbench v1 snapshot | `legacy/v1/workbench/` |
| 직전 활성 Workbench v2 전체 | `legacy/v2/` |

`legacy/v2/`의 issue-brief, brainstorm, executor, visual-grounding, openapi, dev-wiki, llm-script, hook, tool, marketplace와 deploy script는 참고용 보존본입니다. 활성 plugin entrypoint나 현재 workflow contract로 취급하지 않습니다.

`legacy/old/codex-planning-stack/dev-wiki/source/`와 `legacy/old/codex-planning-stack/plan-wiki/source/`는 별도 Git 경계를 유지하고 root repository에서는 ignore합니다.

## 검증 기준

- 활성 skill directory는 `shape`, `memory-update`, `prepare`, `execute-task`, `finalize` 다섯 개뿐이어야 합니다.
- 모든 skill은 namespaced selector와 `allow_implicit_invocation: false` metadata를 제공해야 합니다.
- manifest와 marketplace는 활성 `codex-plugin/` 경로만 참조해야 합니다.
- active tests와 CI는 `legacy/` 파일을 runtime 또는 fixture로 불러오지 않아야 합니다.
- OpenAPI Ruby tool, LLM script hook, 중앙 dev-wiki clone은 활성 Workbench test 경계에 포함하지 않습니다.
- `npm test`는 활성 plugin 계약을 검증해야 하며 legacy evaluator 결과를 새 Workbench 품질 증거로 집계하지 않아야 합니다.
- `.codex/`는 별도 승인 없이 수정하지 않습니다.
