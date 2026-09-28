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

Workbench는 순서가 정해진 workflow가 아니라 네 개의 독립 도구를 제공합니다.

| 스킬 | 역할 |
|---|---|
| `$workbench:shape` | 변경 요청을 읽기 전용으로 조사하고 standalone 분석 보고서 생성 |
| `$workbench:prepare` | task DAG, 격리, 검증, 작업별 모델·effort 계획 |
| `$workbench:execute-task` | task별 실행·검증 후 PR head에 결과 반영·푸시하고 사용자 리뷰 대기 |
| `$workbench:memory-update` | 로컬 `.codocs` 지식과 참조를 순차 큐레이션 |

각 스킬은 `$workbench:<skill>`로 명시 호출해야 하며 자신의 동작만 수행하고 종료합니다. 다른 Workbench 스킬을 이름으로 참조하거나 선행 조건으로 요구하지 않습니다. 사용자는 필요에 따라 단독으로 사용하거나 자유롭게 조합할 수 있습니다.

호출하는 작업의 모델은 유지합니다. 조사와 구현 worker는 작업의 명확성·난도·위험에 따라 현재 지원되는 Astra·Sol·Luna와 effort를 명시적으로 선택합니다. Prepare는 task별 profile과 이유를 계획에 포함하고 Execute Task는 실제 생성 인자로 전달합니다. 부모가 high라고 모든 worker가 high를 상속하지 않습니다. 새 프로필은 지원되는 GPT-6 Luna/high·Sol/medium·Astra/low를 시작점으로 작업에 맞게 조정합니다. Sol은 복잡한 여러 모듈의 구현도 후보이며, 명시된 기존 모델·effort는 자동으로 업그레이드하지 않습니다.

## 설계 원칙

- 입력의 producer보다 완전성, repository identity, digest와 정확한 기준 commit ID를 검증합니다.
- Shape와 Prepare는 현재 checkout을 읽기 전용으로 사용합니다. Shape·Prepare·Execute Task는 해당 checkout에 연결된 Codocs MCP를 우선 사용해 `.codocs` 지식을 확인하고, 연결이 없으면 로컬 파일을 읽습니다. 원문 digest와 MCP revision을 구분해 근거를 기록하며, 제공된 Wiki Artifact는 작업 입력으로 사용합니다. Jira는 조회하지 않습니다.
- Prepare는 immutable plan YAML 뒤에 같은 DAG에서 파생한 짧은 작업 단계 설명을 항상 덧붙입니다.
- Shape와 Prepare는 이득이 있는 독립적인 조사만 읽기 전용으로 위임합니다. 단순 작업에는 추가 agent가 필요하지 않습니다.
- Execute Task의 coordinator는 읽기 전용이며 각 task의 모델·effort를 명시적으로 적용합니다.
- Execute Task는 특정 planner나 source field 이름을 요구하지 않고 호환 가능한 입력을 strict runtime packet으로 정규화하며, 원본 digest와 별도의 execution binding을 유지합니다.
- 각 worker는 자기 standard Git worktree에서 task 하나만 변경하고 검증 성공 시 result commit, 검증 실패가 남아도 후속 작업이 소비 가능한 구현이면 provisional candidate commit을 만듭니다.
- Execute Task의 worker는 실제 자기 worktree에 대한 Codocs 연결을 다시 확인합니다. `.codocs` 수정은 승인된 task 소유 경로 안에서 수행하고 revision 충돌·저장/색인 결과를 검토합니다. Coordinator는 MCP로도 문서를 쓰지 않습니다.
- Memory Update는 요청 범위의 모든 `.codocs` 지식 주제를 dependency-aware queue로 순차 처리합니다. 각 주제는 중복·관계·충돌을 독립 판단하며, 한 주제의 확정적 실패는 안전한 후속 독립 주제를 막지 않습니다.
- Memory Update는 실제 작업 checkout에 연결된 Codocs MCP를 우선 사용해 로컬 `.codocs`를 조회·수정·검증합니다. 해당 checkout에 사용할 MCP가 없으면 로컬 파일 방식으로 진행하며, 실제 문서 경로·저장/색인 결과·검증 한계를 보고합니다. Wiki 갱신이나 동기화는 하지 않습니다.
- 기존 작업별·통합 검증을 유지하며 필수 독립 리뷰나 별도 최종 gate는 추가하지 않습니다.
- Execute Task의 리뷰 전달 흐름은 검증된 결과를 확인된 PR source/head에 반영·푸시합니다. 명시적인 로컬 전용/no-push 정책은 유지하며, PR 생성·base merge·배포·cleanup은 별도 권한입니다.

## MCP 등록

Workbench 플러그인은 Figma MCP만 직접 등록합니다. Context7, Local Work Memory, Atlassian MCP는 플러그인 설치·인증 의존성에 포함하지 않습니다.

네 스킬 모두 사용 환경에 이미 연결된 Codocs MCP를 우선 사용할 수 있습니다. Codocs는 시작 시 지정한 프로젝트에 연결되므로 조회·수정 대상 checkout과 연결의 프로젝트를 확인합니다. 계획 때 사용한 연결을 실행 worker의 별도 worktree에 그대로 적용하지 않습니다. 플러그인이 Codocs를 자동 설치하거나 MCP 설정을 변경하지 않으며, 연결이 없어도 로컬 파일 방식으로 사용할 수 있습니다.

## Execute Task 실행

Execute Task는 충분한 execution plan, packet 묶음 또는 bounded objective를 받아 producer-neutral runtime packet으로 정규화합니다. Profile 없는 입력은 작업에 맞는 설정을 선택해 기록하며, 공급된 profile은 조용히 변경하지 않습니다. 현재 host의 모델·effort 선택지와 생성 인자를 확인하고, fresh-context worker에 완전한 packet과 두 설정을 전달합니다. 계획값·요청값·host가 노출한 실제값을 구분하고 실제값을 확인할 수 없으면 `unknown`으로 표시합니다.

공유 계약·선행 산출물이 확보되고 쓰기와 실행 자원이 격리된 작업은 병렬 실행합니다. Wave 전체가 아니라 각 task의 의존성을 기준으로 시작합니다. 작은 작업은 하나의 task로 끝낼 수 있습니다. 정확한 provisional candidate와 `continuation: ALLOWED`가 있으면 실제 필요한 interface를 확인한 후 downstream도 진행합니다.

질문은 발견 시 보내고 독립 작업은 계속합니다. 사용자가 요구사항을 바꾸면 영향받는 worker만 전달/중단하고 원본 plan을 보존한 새 revision으로 결과 재사용·무효화와 필요한 검증을 기록합니다. 현재 범위에 대한 검사 실패나 미해결 결정을 성공으로 표현하지 않습니다.

검증된 최종 결과는 publisher worker가 격리된 worktree에서 확인된 PR source/head 이력에 통합하고 정확한 commit을 푸시합니다. Coordinator는 계속 읽기 전용이며 사용자의 원래 checkout을 수정하지 않습니다. 푸시 확인 후 `AWAITING_REVIEW`로 응답을 마치고 같은 대화의 다음 메시지에 이어서 반응합니다. 예약·자동화·주기적 PR 확인·대기 루프는 만들지 않습니다. 리뷰 수정 요청에는 현재 원격 head와 작업 상태를 다시 확인하고 수정·검증·재전달하며, 승인만으로 base merge나 배포를 수행하지 않습니다.

Memory Update도 독립적인 조사에는 적절한 모델을 선택할 수 있지만 실제 `.codocs` 수정은 한 writer가 순차 처리합니다. 최종 구성에는 별도의 Finalize 스킬이 없으며 그 절차를 실행의 필수 단계로 옮기지 않았습니다.

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
