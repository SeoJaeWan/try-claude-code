# try-Codex

Codex Workbench 플러그인을 개발·검증하는 저장소입니다. 현재 사용자-facing 제품은 [`codex-plugin/plugins/workbench/`](./codex-plugin/plugins/workbench/)이며, 이전 구현은 [`legacy/`](./legacy/)에 보존합니다. 현재 구조와 책임 경계는 [`docs/current-architecture.md`](./docs/current-architecture.md)에 정리합니다.

## 저장소 구조

```text
.
├── .agent/                         # 프로젝트 작업 규칙 원본
├── .claude/                        # Claude Code용 얇은 지침 어댑터
├── .codex/                         # 보호된 legacy evaluator와 project 설정
├── .github/                        # 활성 Workbench CI
├── codex-plugin/                   # 현재 Workbench 플러그인
├── docs/current-architecture.md    # 현재 구조 문서
├── legacy/                         # 이전 Workbench 및 planning stack
├── README.md
└── package.json
```

## Codex Workbench

Workbench는 개발 흐름을 다섯 개의 독립 스킬로 나눕니다.

| 스킬 | 단계 | 역할과 주요 산출물 |
|---|---:|---|
| `$workbench:shape` | 0~4 | 저장소와 프로젝트 근거를 조사해 독립적인 Shape Report 생성 |
| `$workbench:memory-update` | 선택 | 사용자가 선택한 Shape 또는 Prepare 결과 하나를 immutable Workbench Artifact로 저장 |
| `$workbench:prepare` | 6~7 | 완전한 Shape Report를 task DAG, baseline, Task Packet으로 변환 |
| `$workbench:execute-task` | 8 | Task Packet 하나의 전용 worktree를 생성해 구현 또는 통합 |
| `$workbench:finalize` | 9~11 | 최종 통합 결과의 위험 기반 검증, 독립 리뷰, 보고 |

모든 스킬은 `$workbench:<skill>` selector로 명시했을 때만 실행되며 서로 자동 호출하지 않습니다. 각 스킬은 자기 산출물을 완성하면 종료합니다.

```text
$workbench:shape
  ├── 종료
  ├── $workbench:prepare에 완전한 결과를 직접 전달
  ├── $workbench:memory-update로 선택 저장
  └── 일반 Codex 작업의 근거로 사용

$workbench:prepare
  ├── 종료
  ├── $workbench:execute-task에 완전한 Plan/Packet을 직접 전달
  └── $workbench:memory-update로 선택 저장
```

Memory Update는 workflow gate가 아닙니다. Shape를 저장하지 않아도 Prepare가 완전한 Shape Report를 직접 받을 수 있고, Prepare를 저장하지 않아도 Execute Task가 완전한 Execution Plan과 Task Packet을 직접 받을 수 있습니다. 다른 task나 나중 대화에서는 사용자가 Local Work Memory Artifact reference를 제공해 동일한 결과를 다시 불러올 수 있습니다.

## Local Work Memory MCP

Workbench는 Local Work Memory MCP를 다음 목적으로 사용합니다.

- Shape·Prepare·Execute·Finalize에서 현재 프로젝트 Convention과 관련 Wiki, Work Item, 기존 Workbench Artifact를 참고
- 사용자가 Artifact reference를 제공했을 때 canonical 본문 조회
- `$workbench:memory-update`에서 선택한 Shape 또는 Prepare 결과를 immutable Workbench Artifact로 저장

구체적인 목록 탐색, Typed Reference, canonical 조회, artifact commit, inline/staging 및 결과 판정은 MCP tool contract가 소유합니다. Workbench 스킬은 도구 사용 시점과 결과 활용만 정의합니다.

Shape와 Prepare 결과는 현재 프로젝트 지식인 Dev Wiki 문서가 아니라 특정 작업과 repository snapshot에 묶인 workflow artifact입니다. Dev Wiki mutation과 Workbench Artifact commit은 구분합니다.

Local Work Memory, Jira, Figma의 read/write 격리는 스킬 지침만으로 hard authorization을 보장하지 않습니다. 강제 격리가 필요하면 provider OAuth scope, MCP server 권한 또는 host tool policy를 함께 제한해야 합니다.

## Worktree 실행 원칙

Shape와 Prepare는 현재 checkout에서 읽기 전용으로 실행하며 worktree를 생성하지 않습니다. Execute Task가 Task Packet마다 고유한 표준 Git worktree와 branch를 생성합니다.

```text
사용자 checkout (Workbench가 수정하지 않음)
  ├── TASK-001 전용 worktree
  ├── TASK-002 전용 worktree
  ├── INT-001 전용 integration worktree
  └── final integration-seal 전용 worktree
```

- 직렬 task도 각자 고유 worktree와 branch를 사용합니다.
- 병렬 wave는 동일한 immutable base와 분리된 write/runtime surface가 보장될 때만 허용합니다.
- 각 병렬 wave 뒤에는 integration packet을 둡니다.
- 모든 plan은 최종 integration-seal packet으로 끝납니다.
- push, PR, Local merge/rebase, handoff, worktree/branch 삭제는 자동 후속 동작이 아닙니다.

## 검증과 배포

```bash
npm test
npm run codex-plugin:deploy
```

`npm test`는 활성 Workbench의 manifest, 명시 호출 정책, 독립 스킬 handoff, 선택적 persistence, task-scoped worktree 계약과 배포 안전장치를 검증합니다. `.codex/skills/evaluate-workbench/`는 legacy v2의 `$workbench:brainstorm`·`$workbench:executor` 회귀 evaluator이므로 현재 다섯 스킬의 품질 증거가 아닙니다.

배포 manifest는 [`codex-plugin/plugins/workbench/.codex-plugin/plugin.json`](./codex-plugin/plugins/workbench/.codex-plugin/plugin.json), 활성 marketplace 등록은 [`codex-plugin/.agents/plugins/marketplace.json`](./codex-plugin/.agents/plugins/marketplace.json)이 소유합니다.

실제 deploy는 `local-work` marketplace가 현재 checkout의 `codex-plugin/`을 가리키는지 먼저 검사합니다. 변경 검증만 필요하면 다음을 사용합니다.

```bash
npm run codex-plugin:deploy -- --dry-run --skip-install
```

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI와 active workflow의 입력이 아닙니다. `legacy/v2/`에는 직전 Workbench의 issue-brief, brainstorm, executor, visual-grounding, openapi, dev-wiki, llm-script, hook, tool과 배포 구성을 보존합니다.
