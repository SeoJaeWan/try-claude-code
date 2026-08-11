# try-Codex

Codex Workbench 플러그인을 개발·검증하는 저장소입니다. 현재 사용자-facing 제품은 [`codex-plugin/plugins/workbench/`](./codex-plugin/plugins/workbench/)이며, 이전 구현은 [`legacy/`](./legacy/)에 보존합니다. 현재 구조와 책임 경계의 기준 문서는 [`docs/current-architecture.md`](./docs/current-architecture.md)입니다.

## 저장소 구조

```text
.
├── .agent/                         # 프로젝트 작업 규칙 원본
├── .claude/                        # Claude Code용 얇은 지침 어댑터
├── .codex/
│   ├── AGENTS.md                   # .codex 보호 경계
│   ├── config.toml                 # project-local Codex 설정
│   └── skills/evaluate-workbench/  # legacy v2 계약 회귀 벤치마크
├── .github/                        # 활성 Workbench CI
├── codex-plugin/                   # 현재 Workbench 플러그인
├── docs/
│   └── current-architecture.md     # 현재 구조의 canonical 문서
├── legacy/
│   ├── old/                        # Claude Code 플러그인과 과거 planning stack
│   ├── v1/workbench/               # Workbench v1 snapshot
│   └── v2/                         # 직전 활성 Workbench 전체 보존본
├── README.md
├── package.json
└── .gitignore
```

## Codex Workbench

새 Workbench는 개발 흐름의 0~11단계를 다섯 개의 독립 스킬로 나눕니다.

| 스킬 | 단계 | 역할과 주요 산출물 |
|---|---:|---|
| `$workbench:shape` | 0~4 | Local Work Memory와 연결된 Jira/Figma 근거 조회, 저장소 탐색, 요구사항·불변조건·완료 기준, 출처 기반 조사, 설계 결정을 하나의 Shape Report로 정리 |
| `$workbench:memory-update` | 5 | Shape가 준비한 Memory Change Set만 Local Work Memory의 `dev_wiki`에 반영 |
| `$workbench:prepare` | 6~7 | 작업 분해, 의존성 DAG, 실행 전 baseline, 단일 또는 복수 worktree 배치를 Execution Plan으로 확정 |
| `$workbench:execute-task` | 8 | 지정된 worktree에서 task 하나의 계획 → 테스트 기준 → 구현 → 검증 → self-review를 수행 |
| `$workbench:finalize` | 9~11 | 통합 결과의 failure·concurrency·load 검증, 독립 리뷰, README 또는 최종 보고서를 작성 |

모든 스킬은 `$workbench:<skill>` selector로 명시했을 때만 실행됩니다. 자연어 요청만으로 자동 선택하지 않고, 현재 스킬이 다음 스킬을 자동 호출하지도 않습니다. 각 스킬은 독립적으로 사용할 수 있으므로 Shape Report만 확인한 뒤 일반 Codex 요청으로 구현을 이어가거나, 필요한 단계만 명시적으로 선택할 수 있습니다.

```text
$workbench:shape
       │
       ├── 종료하고 Shape Report만 사용
       ├── $workbench:memory-update
       └── $workbench:prepare
                  │
                  ├── $workbench:execute-task TASK-001  ─┐
                  ├── $workbench:execute-task TASK-002  ─┼─ 병렬 가능 시 worker worktree
                  └── $workbench:execute-task INTEGRATE ─┘
                                      │
                                      └── $workbench:finalize
```

화살표는 가능한 handoff만 나타냅니다. 다음 단계로 진행하려면 사용자가 해당 스킬을 별도로 호출해야 합니다.

## 근거 기반 Shape

`$workbench:shape`는 Stage 0에서 먼저 Local Work Memory를 조회한 뒤 현재 저장소의 코드, 설정, 테스트와 함께 해석합니다. 요청에 Jira issue나 Figma URL이 있으면 해당 artifact만 읽어 요구사항·acceptance·디자인 근거로 연결합니다. 기존 memory 문서를 갱신할 가능성이 있으면 `memory_get`으로 본문과 revision까지 확보해 Stage 5용 Memory Change Set에 담습니다. 이 단계는 Local Work Memory, Jira, Figma를 읽기만 하며 쓰지 않습니다.

라이브러리·프레임워크·SDK의 버전, API, 호환성, 보안 또는 권장 패턴이 설계 판단에 영향을 주면 Context7을 사용할 수 있을 때 현재 버전에 맞는 자료를 조사하고 공식 원문을 확인합니다. Context7을 사용할 수 없거나 근거가 부족하면 공식 원문을 직접 조사합니다. 질문 수나 출처 수를 임의의 research mode로 제한하지 않습니다. Shape Report는 다음을 구분해 사람이 링크를 따라 판단할 수 있는 Markdown 문서로 반환합니다.

- 저장소와 Local Work Memory에서 확인한 사실
- 연결된 Jira issue와 Figma node에서 확인한 프로젝트 사실
- 공식 문서로 확인한 기술적 사실과 출처 URL
- 근거를 종합한 추론
- 선택한 결정과 대안
- 아직 검증하지 못한 가정과 열린 질문
- acceptance criteria와 Memory Change Set

Context7이나 공식 문서를 찾을 수 없다는 이유로 모델 기억을 사실처럼 채우지 않습니다. 근거가 부족한 항목은 명시적으로 미검증 상태로 남깁니다.

Jira와 Figma MCP는 Shape의 project evidence retrieval 용도입니다. Shape 계약은 issue/comment/transition 생성과 Figma file/node 변경을 금지하지만, plugin-level MCP 연결 자체가 provider의 write-capable tool을 기술적으로 제거하지는 않습니다. 강제 read-only가 필요하면 provider OAuth scope 또는 host tool policy도 제한해야 합니다.

## Local Work Memory 갱신

`$workbench:memory-update`는 Shape Report에 포함된 완성된 Memory Change Set만 적용합니다. 기본 저장 대상은 Local Work Memory의 `dev_wiki`이며, 일회성 작업 메모가 명시된 경우에만 `note`를 사용합니다. 이 스킬은 별도의 저장소 조사나 문서 병합을 다시 하지 않습니다.

기존 문서의 update 또는 delete에는 Shape가 읽은 `source_revision`을 사용합니다. 서비스가 revision conflict를 감지하면 최신 내용을 임의로 덮어쓰지 않고 Shape로 돌아가 근거와 변경안을 다시 만듭니다. 다만 현재 서버의 revision 검사와 write는 원자적 compare-and-swap이 아니므로 외부 writer와 동시에 경합하면 lost update를 완전히 배제하지 못합니다.

명시 호출 정책은 다섯 **skill의 활성화**를 제어합니다. 현재 Local Work Memory 서버는 read/write 도구를 하나의 MCP endpoint로 제공하므로, plugin-level 연결 자체가 `memory_write`를 암호학적으로 `$workbench:memory-update`에만 한정하지는 못합니다. Workbench 계약은 다른 네 skill에서 write를 금지하고 테스트하지만, host 전체에서 hard tool scope가 필요하다면 Local Work Memory가 read endpoint와 write endpoint/권한을 분리해야 합니다.

## Worktree 실행 원칙

Workbench 작업은 항상 하나 이상의 전용 Git worktree에서 진행합니다. 사용자의 local checkout에서 `$workbench:shape`를 호출하면 Codex가 현재 working-tree 상태를 기준으로 coordinator worktree task를 만들고 원래 요청을 그 task에서 계속합니다. local checkout은 기준 repository와 시작 상태를 제공할 뿐 구현 파일을 수정하지 않습니다.

- Shape가 Codex-native coordinator worktree task를 자동 생성하거나 이미 할당된 전용 worktree를 coordinator로 사용합니다. shell의 `git worktree add`로 현재 task가 이동한 것처럼 처리하지 않습니다.
- Shape는 변경 경계와 병렬화 후보를 기록합니다.
- Prepare는 task dependency와 공유 파일·schema·lockfile·runtime 자원을 분석해 worker worktree가 필요한지 확정합니다.
- 직렬 작업은 coordinator worktree 한 곳에서 순차 실행합니다.
- 독립 작업은 동일한 base commit에서 분기한 worker worktree에 배치하고, coordinator에서 integration task를 수행합니다.
- 같은 파일이나 생성물, migration, lockfile, 공용 fixture를 공유하거나 선행 결과가 필요한 task는 병렬화하지 않습니다.
- commit, push, 최종 merge와 worktree 삭제는 사용자의 명시적 요청 또는 승인된 Execution Plan 범위가 있을 때만 수행합니다.

이 구조 덕분에 Workbench가 작업 A를 수행하는 동안 사용자는 원래 checkout에서 작업 B를 계속할 수 있습니다.

## Project-local evaluator

`.codex/skills/evaluate-workbench/`는 현재 다섯 스킬의 acceptance test가 아닙니다. 이 evaluator는 `$workbench:brainstorm`과 `$workbench:executor`를 사용하는 legacy v2 계약을 회귀 검증하기 위해 그대로 보존되어 있으며, 새 Workbench target을 유효하게 평가할 수 없습니다. evaluator 자체의 변경이나 새 selector로의 migration은 `.codex/` 승인이 필요한 별도 작업입니다.

## 실행

```bash
npm test
npm run codex-plugin:deploy
```

`npm test`는 활성 Workbench의 manifest, 다섯 스킬의 명시 호출 정책과 workflow 계약을 검증합니다. legacy evaluator 테스트가 함께 실행되더라도 이는 evaluator 자체의 회귀 검사일 뿐 새 Workbench 품질 판정이 아닙니다. 배포 manifest는 [`codex-plugin/plugins/workbench/.codex-plugin/plugin.json`](./codex-plugin/plugins/workbench/.codex-plugin/plugin.json), 활성 marketplace 등록은 [`codex-plugin/.agents/plugins/marketplace.json`](./codex-plugin/.agents/plugins/marketplace.json)이 소유합니다.

전용 worktree에서 아직 통합 전이라면 `npm run codex-plugin:deploy -- --dry-run --skip-install`로만 확인합니다. 실제 deploy는 `local-work` marketplace가 현재 실행 checkout의 `codex-plugin/`을 정확히 가리키는지 먼저 검사하며, 다른 primary checkout을 가리키면 cachebuster를 바꾸기 전에 중단합니다.

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI와 active workflow의 입력이 아닙니다. `legacy/v2/`에는 직전의 issue-brief, brainstorm, executor, visual-grounding, openapi, dev-wiki, llm-script, hook, tool과 배포 구성을 함께 보존합니다. `legacy/old/codex-planning-stack/dev-wiki/source/`와 `legacy/old/codex-planning-stack/plan-wiki/source/`는 각 원격 저장소를 유지하는 별도 Git clone이며 root repository에서는 ignore합니다.
