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
| `$workbench:memory-update` | 요청에 포함된 모든 bounded 지식 주제를 기존 Wiki 구조에 순차 큐레이션 |
| `$workbench:finalize` | 정확한 Git `base..head` 변경을 위험 기반으로 검증하고 독립 리뷰 |

각 스킬은 `$workbench:<skill>`로 명시 호출해야 하며 자신의 동작만 수행하고 종료합니다. 다른 Workbench 스킬을 이름으로 참조하거나 선행 조건으로 요구하지 않습니다. 사용자는 필요에 따라 단독으로 사용하거나 자유롭게 조합할 수 있습니다.

## 설계 원칙

- 입력의 producer보다 완전성, repository identity, digest와 정확한 기준 commit ID를 검증합니다.
- Shape와 Prepare는 현재 checkout을 읽기 전용으로 사용합니다.
- Prepare는 immutable plan YAML 뒤에 같은 DAG에서 파생한 짧은 작업 단계 설명을 항상 덧붙입니다.
- Execute Task의 coordinator는 읽기 전용이며, 각 task를 `gpt-5.6-sol`/`high` worker에게 배정합니다.
- Execute Task는 특정 planner나 source field 이름을 요구하지 않고 호환 가능한 입력을 strict runtime packet으로 정규화하며, 원본 digest와 별도의 execution binding을 유지합니다.
- 각 worker는 자기 standard Git worktree에서 task 하나만 변경하고 검증 성공 시 result commit, 검증 실패가 남아도 후속 작업이 소비 가능한 구현이면 provisional candidate commit을 만듭니다.
- Memory Update는 요청 범위의 모든 Wiki 주제를 dependency-aware queue로 순차 처리합니다. 각 주제는 중복·관계·충돌을 독립 판단하며, 한 주제의 확정적 실패는 안전한 후속 독립 주제를 막지 않습니다.
- Finalize는 구현 이력과 무관하게 선택된 `base..head` 전체 변경을 검증합니다.
- push, PR, 사용자 branch merge, handoff와 cleanup은 자동 수행하지 않습니다.

## MCP 등록

Workbench 플러그인은 Figma MCP만 직접 등록합니다. Context7, Local Work Memory, Atlassian MCP는 플러그인 설치·인증 의존성에 포함하지 않습니다.

## Execute Task 실행

Execute Task는 충분한 execution plan, task packet 묶음 또는 하나의 bounded objective를 받습니다. 원본 필드명을 강제하지 않고 plan-level identity와 동등한 contract 표현을 strict runtime packet으로 정규화한 뒤 Dependency DAG에서 실행 가능한 task를 찾습니다. Write surface와 runtime resource가 격리된 task는 병렬로 실행하며, 각 worker는 대화 이력 없이 자기 normalized packet만 받고 `gpt-5.6-sol` 모델과 `high` reasoning effort로 실행됩니다.

구현 중 충돌이나 검증 실패는 즉시 전체 실행을 중단하지 않습니다. 정확한 provisional candidate와 `continuation: ALLOWED`가 있으면 downstream과 integration도 계속 실행하며, 물질적 선행 산출물이 없을 때만 영향을 받는 task를 실행하지 않습니다. 최종 결과는 최초 계획, 실행 중 발견, 시도한 복구, 미해결 조치와 verified/provisional commit을 구분해 보고합니다. coordinator와 worker 모두 원본 checkout, push, PR, 사용자 branch merge, handoff와 cleanup을 수행하지 않습니다.

## 배포

```bash
npm run codex-deploy
```

배포는 `local-work` marketplace가 현재 checkout의 `codex-plugin/`을 가리키는지 먼저 검사합니다. 설치할 때만 임시 cachebuster 버전을 적용하고 완료 후 source manifest를 원래 상태로 복원하므로, 배포가 추가한 version 변경은 Git에 남지 않습니다. 변경 검증만 하려면 다음을 사용합니다.

```bash
npm run codex-deploy -- --dry-run --skip-install
```

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI와 active skill contract의 입력이 아닙니다.
