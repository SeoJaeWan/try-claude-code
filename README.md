# try-Codex

Codex Workbench 플러그인을 개발·검증하는 저장소입니다. 현재 사용자-facing 제품은 [`codex-plugin/plugins/workbench/`](./codex-plugin/plugins/workbench/)이며, 이전 구현은 [`legacy/`](./legacy/)에 보존합니다. 현재 구조는 [`docs/current-architecture.md`](./docs/current-architecture.md)를 기준으로 합니다.

## 저장소 구조

```text
.
├── .agent/                         # 프로젝트 작업 규칙 원본
├── .codex/                         # project-local Codex 실행 설정
├── codex-plugin/                   # 현재 Workbench 플러그인
├── docs/current-architecture.md    # 현재 구조 문서
├── legacy/                         # 이전 구현 보관
├── README.md
└── package.json
```

## Workbench skills

Workbench는 순서가 정해진 workflow가 아니라 다섯 개의 독립 도구를 제공합니다.

| 스킬 | 역할 |
|---|---|
| `$workbench:shape` | 변경 요청을 읽기 전용으로 조사하고 standalone 분석 보고서 생성 |
| `$workbench:prepare` | 어떤 충분한 변경 정의든 task DAG와 격리 실행 계획으로 변환 |
| `$workbench:execute-task` | 실행 계획을 task별 Sol/high 서브에이전트와 전용 Git worktree로 실행 |
| `$workbench:memory-update` | MCP가 지원하는 완료 artifact 하나를 선택 저장 |
| `$workbench:finalize` | 정확한 Git `base..head` 변경을 위험 기반으로 검증하고 독립 리뷰 |

각 스킬은 `$workbench:<skill>`로 명시 호출해야 하며 자신의 동작만 수행하고 종료합니다. 다른 Workbench 스킬을 이름으로 참조하거나 선행 조건으로 요구하지 않습니다. 사용자는 필요에 따라 단독으로 사용하거나 자유롭게 조합할 수 있습니다.

## 설계 원칙

- 입력의 producer보다 완전성, repository identity, digest와 정확한 기준 commit ID를 검증합니다.
- Shape와 Prepare는 현재 checkout을 읽기 전용으로 사용합니다.
- Execute Task의 coordinator는 읽기 전용이며, 각 task를 `gpt-5.6-sol`/`high` worker에게 배정합니다.
- 각 worker는 자기 standard Git worktree에서 task 하나만 변경하고 성공 시 task 결과 commit을 만듭니다.
- Memory Update는 저장 기능일 뿐 승인이나 workflow transition이 아닙니다.
- Finalize는 구현 이력과 무관하게 선택된 `base..head` 전체 변경을 검증합니다.
- push, PR, 사용자 branch merge, handoff와 cleanup은 자동 수행하지 않습니다.

## MCP 등록

Workbench 플러그인은 Figma MCP만 직접 등록합니다. Context7, Local Work Memory, Atlassian MCP는 플러그인 설치·인증 의존성에 포함하지 않습니다.

## Execute Task 실행

Execute Task는 완전한 execution plan, task packet 묶음 또는 하나의 bounded objective를 받습니다. Dependency DAG에서 실행 가능한 task를 찾고, write surface와 runtime resource가 격리된 task를 병렬로 실행합니다. 각 worker는 대화 이력 없이 자기 packet만 받고 `gpt-5.6-sol` 모델과 `high` reasoning effort로 실행됩니다.

실패한 task의 downstream은 실행하지 않지만 독립 task는 계속 진행합니다. coordinator와 worker 모두 원본 checkout, push, PR, 사용자 branch merge, handoff와 cleanup을 수행하지 않습니다.

## 배포

```bash
npm run codex-plugin:deploy
```

배포는 `local-work` marketplace가 현재 checkout의 `codex-plugin/`을 가리키는지 먼저 검사합니다. 변경 검증만 하려면 다음을 사용합니다.

```bash
npm run codex-plugin:deploy -- --dry-run --skip-install
```

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI와 active skill contract의 입력이 아닙니다.
