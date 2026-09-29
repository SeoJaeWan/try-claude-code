# Workbench

Codex와 Claude Code에서 함께 쓰는 Workbench 플러그인을 개발·검증하는 저장소입니다. 현재 사용자-facing 제품은 [`plugin/plugins/workbench/`](./plugin/plugins/workbench/)이며, 이전 구현은 [`legacy/`](./legacy/)에 보존합니다. 현재 구조는 [`docs/current-architecture.md`](./docs/current-architecture.md), 설치와 MCP 설정은 [`docs/host-setup.md`](./docs/host-setup.md)를 기준으로 합니다.

## 저장소 구조

```text
.
├── AGENTS.md                       # Codex·Claude Code 공용 작업 규칙
├── plugin/                         # Workbench marketplace와 플러그인
├── docs/                           # 현재 구조·설치 문서
├── legacy/                         # 이전 구현·참고자료 보관
├── README.md
└── package.json
```

## Workbench skills

Workbench는 순서가 정해진 workflow가 아니라 여섯 개의 독립 도구를 제공합니다.

| 스킬 | 역할 |
|---|---|
| `kickoff` | 주어진 정보로 작업에 필요한 결정 사항을 정리하고 사용자와 1번부터 하나씩 검토해 결정 기록 생성 |
| `shape` | 변경 요청을 읽기 전용으로 조사하고 standalone 분석 보고서 생성 |
| `prepare` | task DAG, 격리, 검증, 작업별 모델·effort 계획 |
| `execute-task` | task별 실행·검증 후 로컬 PR source 통합·안전한 task worktree 정리; push 없음 |
| `pr-push` | 저장소 릴리스 관례·필요한 메타데이터 확인 후 명시 요청한 PR source push |
| `memory-update` | 로컬 `.codocs` 지식과 참조를 순차 큐레이션 |

각 스킬은 Codex에서는 `$workbench:<skill>`, Claude Code에서는 `/workbench:<skill>`로 명시 호출해야 하며 일상 대화로는 실행되지 않습니다. 자신의 동작만 수행하고 종료합니다. 다른 Workbench 스킬을 이름으로 참조하거나 선행 조건으로 요구하지 않습니다. 사용자는 필요에 따라 단독으로 사용하거나 자유롭게 조합할 수 있습니다.

호출하는 작업의 모델은 유지합니다. 조사와 구현 worker는 작업의 명확성·난도·위험에 따라 도구 중립 등급(`focused`·`standard`·`deep`)과 effort를 명시적으로 선택합니다. 실행하는 도구가 등급을 자기 모델로 바꿉니다: Codex는 GPT-6 Luna·Sol·Astra, Claude Code는 `haiku`·`sonnet`·`opus`입니다. Claude Code는 보조 AI마다 effort를 지정할 수 없어 세션 effort를 따릅니다. Prepare는 task별 profile과 이유를 계획에 포함하고 Execute Task는 실제 생성 인자로 전달합니다. 명시된 기존 모델은 자동으로 바꾸지 않습니다.

## 설계 원칙

- 입력의 producer보다 완전성, repository identity, digest와 정확한 기준 commit ID를 검증합니다.
- Kickoff는 특정 리소스 종류나 도구를 전제하지 않고 주어진 정보를 읽기 전용으로 검토해, 에이전트가 정할 수 있는 것과 사용자가 정해야 하는 것을 구분합니다. 결정을 대신하거나 설계하지 않습니다.
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
- Execute Task는 검증된 결과를 확인된 로컬 PR source/head에 통합하고, worktree 밖에 증거를 보존한 뒤 안전한 task 소유 worktree만 정리합니다. no-integration/no-cleanup 지시를 우선하며 원격 push는 하지 않습니다.
- PR Push는 독립적인 명시 요청으로 실제 릴리스 관례와 전체 PR diff를 확인하고 필요한 메타데이터만 준비해 정상 push합니다. PR 생성·base merge·배포·릴리스 publish는 포함하지 않습니다.

## MCP 등록

Workbench 플러그인은 MCP를 직접 번들하지 않습니다. Figma, Codocs, Local Work Memory·Context7(`gateway-public`)은 각 도구에 사용자 설정으로 등록하며 등록·확인 방법은 [`docs/host-setup.md`](./docs/host-setup.md)에 있습니다.

Shape·Prepare·Execute Task·Memory Update는 사용 환경에 이미 연결된 Codocs MCP를 우선 사용할 수 있습니다. PR Push는 관련 로컬 프로젝트 규칙과 릴리스 설정을 확인하며 MCP를 필수로 요구하지 않습니다. Codocs는 시작 시 지정한 프로젝트에 연결되므로 조회·수정 대상 checkout과 연결의 프로젝트를 확인합니다. 계획 때 사용한 연결을 실행 worker의 별도 worktree에 그대로 적용하지 않습니다. 플러그인이 Codocs를 자동 설치하거나 MCP 설정을 변경하지 않으며, 연결이 없어도 로컬 파일 방식으로 사용할 수 있습니다.

## Execute Task 실행

Execute Task는 충분한 execution plan, packet 묶음 또는 bounded objective를 받아 producer-neutral runtime packet으로 정규화합니다. Profile 없는 입력은 작업에 맞는 설정을 선택해 기록하며, 공급된 profile은 조용히 변경하지 않습니다. 현재 host의 모델·effort 선택지와 생성 인자를 확인하고, fresh-context worker에 완전한 packet과 등급에 해당하는 모델(지원하는 host에서는 effort도)을 전달합니다. 계획값·요청값·host가 노출한 실제값을 구분하고 실제값을 확인할 수 없으면 `unknown`, Claude Code effort는 `session`으로 표시합니다.

공유 계약·선행 산출물이 확보되고 쓰기와 실행 자원이 격리된 작업은 병렬 실행합니다. Wave 전체가 아니라 각 task의 의존성을 기준으로 시작합니다. 작은 작업은 하나의 task로 끝낼 수 있습니다. 정확한 provisional candidate와 `continuation: ALLOWED`가 있으면 실제 필요한 interface를 확인한 후 downstream도 진행합니다.

질문은 발견 시 보내고 독립 작업은 계속합니다. 사용자가 요구사항을 바꾸면 영향받는 worker만 전달/중단하고 원본 plan을 보존한 새 revision으로 결과 재사용·무효화와 필요한 검증을 기록합니다. 현재 범위에 대한 검사 실패나 미해결 결정을 성공으로 표현하지 않습니다.

검증된 최종 결과는 assigned worker가 확인된 로컬 PR source/head에 통합합니다. Coordinator는 읽기 전용입니다. Source branch가 이미 checkout되어 있으면 ref만 뒤에서 바꾸지 않고, 확인된 clean·idle source checkout에서 통합합니다. 기본 로컬 통합 권한은 그 checkout이 primary/pinned여도 적용되지만 dirty·active·shared 또는 소유권 불명 상태에서는 보존하고 제한을 보고합니다.

Worker는 제거할 worktree 밖에 결과 SHA·검증·revision 등 재개 증거를 저장한 뒤, 정확한 결과가 로컬 source에 도달 가능하고 더 이상 쓰이지 않는 clean task 소유 worktree만 정리합니다. Dirty/unmerged·shared·pinned·primary·계속 필요한 checkout은 보존하고 branch는 삭제하지 않습니다. 요청한 정리를 완료하지 못하면 성공으로 감추지 않습니다. 원격 push는 `NOT_REQUESTED`로 결과를 반환하고 종료합니다. 수정 요청은 현재 로컬 source와 checkpoint를 확인해 새 worktree에서 재개할 수 있으며 살아 있는 worker나 삭제된 경로에 의존하지 않습니다. 예약·자동화·주기적 확인·대기 루프는 만들지 않습니다.

## PR Push

`$workbench:pr-push` 또는 `/workbench:pr-push`는 별도 명시 요청으로 source repository/remote/ref, 전체 PR diff, 프로젝트 정책·실제 도구·script·CI·기존 릴리스 기록을 확인합니다. Changesets는 관련 미소비 entry를 추가/갱신하고 실제 manifest version은 바꾸지 않습니다. Commit/PR 기반 자동 릴리스, custom script, 수동 버전 정책은 그 저장소 규칙을 따르며, 릴리스 관례가 없으면 메타데이터 없이 정상 push할 수 있습니다.

미해결 결정이 있을 때만 실제 영향 target과 적절한 선택·no-release 대안을 이유와 함께 묶어 묻습니다. 이미 수락한 결정과 pending 기록을 재사용해 반복 push에 중복 메타데이터를 만들지 않습니다. 필요한 메타데이터·검증·허용된 commit을 준비한 뒤 로컬 source와 정확한 commit을 맞추고 정상 push해 원격 반영을 확인한 다음 응답을 마칩니다. PR 생성·base merge·배포·release publish·force-push·댓글·CI 모니터링은 포함하지 않습니다.

Memory Update도 독립적인 조사에는 적절한 모델을 선택할 수 있지만 실제 `.codocs` 수정은 한 writer가 순차 처리합니다. 최종 구성에는 별도의 Finalize 스킬이 없으며 그 절차를 실행의 필수 단계로 옮기지 않았습니다.

## 배포

```bash
npm run deploy          # Codex와 Claude Code 모두
npm run deploy:codex
npm run deploy:claude
```

배포는 각 도구의 `workbench` marketplace가 현재 checkout의 `plugin/`을 가리키는지 먼저 검사하고, 등록되지 않았으면 등록 명령을 안내한 뒤 중단합니다. 설치할 때만 임시 cachebuster 버전을 적용하고 완료 후 source manifest를 원래 상태로 복원하므로, 배포가 추가한 version 변경은 Git에 남지 않습니다. 실행 명령만 확인하려면 다음을 사용합니다.

```bash
npm run deploy -- --dry-run
```

## Legacy 정책

`legacy/`는 현재 runtime, marketplace와 active skill contract의 입력이 아닙니다.
