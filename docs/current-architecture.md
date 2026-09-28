# Current Architecture — Workbench

> 기준일: 2026-09-28

현재 Workbench는 `plugin/plugins/workbench/`에 있는 네 개의 독립적인 explicit-only 스킬이며, 같은 스킬 폴더를 Codex와 Claude Code가 함께 사용합니다. 사용자가 필요한 스킬을 선택하며, 스킬끼리 자동 연결하거나 다른 스킬을 선행 조건으로 요구하지 않습니다.

## 소유권과 진입점

| 영역 | 경로 | 역할 |
|---|---|---|
| 플러그인 | `plugin/plugins/workbench/` | 스킬, 도구별 manifest(`.codex-plugin/`, `.claude-plugin/`) |
| marketplace | `plugin/.agents/plugins/marketplace.json`, `plugin/.claude-plugin/marketplace.json` | 도구별 `workbench` marketplace 등록 |
| 배포 | `plugin/scripts/deploy-workbench-plugin.mjs` | 도구별 임시 cachebuster와 로컬 install |
| 프로젝트 규칙 | `AGENTS.md` | 두 도구 공용 저장소 작업 원칙 |
| 설치 안내 | `docs/host-setup.md` | 도구별 설치·MCP 등록·확인 방법 |
| 역사 보관 | `legacy/` | 이전 구현과 문서, 현재 계약의 입력 아님 |

| 스킬 | 입력 | 결과 |
|---|---|---|
| `shape` | 소프트웨어 변경 요청과 근거 | 범위에 맞춘 변경 분석 |
| `prepare` | 충분한 변경 정의 | task DAG, worktree, 검증, 모델·effort 계획 |
| `execute-task` | execution plan, packet 묶음 또는 bounded objective | 작업별 검증 결과, PR head 전달 상태, 사용자 리뷰 checkpoint |
| `memory-update` | bounded project-knowledge 주제 | 로컬 `.codocs` 갱신·참조 검증 결과 |

명시 호출은 Codex `$workbench:<skill>`, Claude Code `/workbench:<skill>`입니다. 모든 `agents/openai.yaml`은 `allow_implicit_invocation: false`, 모든 `SKILL.md`는 `disable-model-invocation: true`를 유지해 일상 대화로는 실행되지 않습니다. 스킬 description에는 도구별 호출 문법을 넣지 않습니다. 입력 생산자가 아니라 입력의 의미·정확한 Git identity·제공된 digest를 검증합니다. 메인 모델은 호출자가 선택하며 스킬이 전환하지 않습니다.

## 모델 선택과 위임

서브에이전트는 부모의 모델·effort를 암묵적으로 상속하지 않습니다. 작업의 명확성, 여러 모듈의 관계, 실패 영향, 검증 가능성을 보고 도구 중립 등급과 effort를 명시적으로 선택합니다. 계획에는 등급과 effort만 기록하므로 어느 도구에서든 같은 계획을 실행할 수 있고, 실행하는 도구가 등급을 자기 모델로 바꿉니다.

| 등급 | 용도 | 시작 effort | Codex | Claude Code |
|---|---|---|---|---|
| `focused` | bounded 탐색·반복 수정·명확한 소규모 구현 | high | `gpt-6-luna` | `haiku` |
| `standard` | 일반 및 복잡한 구현·디버깅 | medium | `gpt-6-sol` | `sonnet` |
| `deep` | 가장 어려운 다단계 설계·통합 판단 | low | `gpt-6-astra` | `opus` |

단순하고 검증이 쉬우면 `focused`/low 또는 medium, 더 깊은 분석이 필요하면 `standard`/high나 `deep`/medium 또는 high로 조정할 수 있습니다. 여러 모듈에 걸친 작업이라는 이유만으로 `deep`을 선택하지 않습니다. 등급 간 동일 effort 이름은 동일한 능력·사용량을 뜻하지 않습니다. 이는 고정 성능·가격 순위가 아니며 사용자 선택과 한도를 우선합니다. Claude Code의 `fable`은 사용자가 명시적으로 선택할 때만 사용합니다.

Shape의 초기 조사 예시는 코드 위치·호출 관계 `focused`/high, 여러 모듈의 영향 `standard`/medium, 어려운 설계 대안·실패 조건 `deep`/medium 또는 high입니다. Prepare의 조사 예시는 파일 소유권·충돌 `standard`/medium, 선행 조건·통합 위험은 확립된 계약이면 `standard`/medium, 어려운 미확정 상호작용이면 `deep`/medium 또는 high입니다. 필요성 없이 에이전트를 만들지 않으며 작은 조회는 직접 처리하거나 도구 호출을 묶습니다.

독립적인 입력·결과와 시간 또는 품질 이득이 있는 읽기 전용 조사만 위임하고, 메인은 독립 작업과 최종 통합을 담당합니다. 각 helper는 근거·불확실성을 반환하고 파일을 수정하지 않습니다. 내부 위임은 subagent 도구를 사용하며 사용자 소유의 별도 task나 thread를 만들지 않습니다.

실행 프로필은 YAML만으로 적용되지 않습니다. 사용 가능한 subagent 도구로 현재 host를 판별하고, 새 context에 완전한 packet과 함께 생성 인자를 전달합니다.

- Codex: `model`과 `reasoning_effort`를 함께 전달하고, `fork_turns: none`을 지원하면 사용합니다. 전체 이력 fork의 override 제한과 custom agent 설정 우선순위를 고려합니다.
- Claude Code: non-fork subagent에 `model` 별칭만 전달합니다. subagent별 effort를 지정할 수 없어 세션 effort를 따르며, 이는 profile 불일치가 아닙니다.

계획값·요청값·host가 알려준 실제값을 구분하고, 실제값이 노출되지 않으면 `unknown`, Claude Code effort는 `session`으로 보고합니다. 모델 자신의 진술은 실행 설정의 증거가 아닙니다.

신규 선택의 후보가 없으면 사용자 한도 안에서 지원되는 대안을 선택하고 이유를 남깁니다. 명시된 기존 모델 프로필(`model`, `reasoning_effort`만 있는 이전 형식 포함)은 보존하며 릴리스만으로 업그레이드하지 않습니다. 실행 프로필 변경을 승인받으면 원본과 digest를 유지한 채 binding revision으로 추적합니다. 모델 비교가 필요한 경우 기존 지원 effort를 유지해 대표 작업의 결과·재시도·시간·사용량을 비교한 후 조정합니다. 이는 매 작업에 추가되는 검증 gate가 아닙니다. 선택 기준은 Codex [공식 모델 가이드](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna)(2026-09-23 확인)와 Claude [models overview](https://platform.claude.com/docs/en/models/overview)(2026-09-28 확인)이며 실행 가능 여부는 실제 host가 제공하는 조합으로 판단합니다.

## Shape

현재 checkout을 읽기 전용으로 조사합니다. 해당 analysis checkout으로 확인된 Codocs MCP의 list/get/guide를 우선 사용하고, 연결이 없으면 로컬 `.codocs`를 읽습니다. 원문 digest와 별도로 MCP revision·탐색/확인 상태를 기록합니다. partial 결과의 확인된 사실은 제한된 분석에 쓸 수 있지만 부재·유일성·미확인 정책을 확정하지 않습니다. 프로젝트 규칙, 코드·테스트·CI, 제공된 Wiki Artifact와 연결된 Figma, 버전에 맞는 공식 자료도 근거로 사용합니다. 문서 쓰기와 canonical Wiki/Jira 조회는 하지 않습니다.

작은 질문은 HEAD·dirty 상태·조사한 소스 identity와 관련 결론을 담은 `focused` 보고서로 충분합니다. 재현 가능한 인계나 넓은 dirty 변경에 의존하는 분석은 `snapshot_bound`로 전체 content-sensitive fingerprint를 계산합니다. focused 결과를 전체 checkout이 고정됐다는 보증으로 표현하지 않습니다.

## Prepare

현재 checkout은 읽기 전용이며 clean/stable execution base를 정합니다. planning checkout에 연결된 Codocs MCP를 우선 사용하거나 로컬 `.codocs`를 읽고, 관련 제약·원문 digest·조회 방식을 self-contained packet에 담습니다. MCP revision은 Git base나 원문 digest를 대신하지 않습니다. 실제 실행 base에 해당 지식이 있는지 확인하고 필요한 dirty 변경을 누락하거나 임의로 checkpoint하지 않습니다. 미래 worker가 자기 worktree의 연결을 확인하도록 전달하며 planning 연결의 재사용을 전제하지 않습니다.

각 task의 목표·수락 조건·소유 파일·금지 범위·실행 자원·검증·고유 branch/worktree·정확한 base selector와 `execution_profile`을 계획합니다. 프로필은 tier, effort, 사용자가 명시한 경우의 model, rationale, 기본 `escalation: none`을 포함합니다. 작업 branch는 `<PR head branch>--<run-id>-<task-id>`이며, PR head branch가 정해지지 않으면 이름 기준을 사용자에게 묻습니다. 필요한 작업에만 명시한 조건·등급·effort·추가 agent 수 한도를 갖는 읽기 전용 diagnosis를 계획합니다. 환경 장애나 사용자 결정 누락은 effort 상향으로 해결하지 않습니다. 미래 실행 host를 확인하지 못하면 가용성 미확인으로 표시하고 실행 시 preflight하도록 합니다.

API/type producer-consumer 관계 자체를 직렬화 사유로 삼지 않습니다. 정확한 공유 계약·타입을 먼저 확정한 뒤 쓰기와 자원이 분리된 서버·클라이언트를 병렬 구현하고 실제 통합을 검사할 수 있습니다. 계약이 아직 없다면 선행 dependency가 필요합니다. Wave는 설명용이며 각 task의 의존성 충족이 실제 실행 기준입니다.

작은 작업은 하나의 packet으로 유지할 수 있습니다. 별도 결과를 합치거나 cross-task 검증이 필요할 때만 integration packet을 추가합니다. 원본 YAML/digest와 별도로 짧은 단계 설명 및 task/model/effort/선정 이유 표를 제공합니다. 실행 계획은 그 자체로 commit이나 외부 작업 권한을 부여하지 않습니다.

## Execute Task

Coordinator는 읽기 전용으로 입력을 정규화하고 실행을 조정합니다. 공급된 profile은 보존하며, profile 없는 호환 입력은 동일한 판단 기준으로 선택해 execution binding에 이유를 기록합니다. 원본 byte/digest는 보존하고 정규화된 packet에는 별도 binding digest를 부여합니다.

각 implementation/integration worker는 완전한 packet, 명시된 model/effort, 고유 standard Git worktree를 사용합니다. Coordinator는 파일을 수정하거나 worktree를 만들지 않습니다. 독립적이고 자원이 격리된 runnable task를 host capacity까지 실행하고 나머지는 대기시킵니다. 특정 profile을 요청할 수 없으면 해당 task를 막고 설명하며 독립 작업은 계속합니다. 조용한 profile 대체나 coordinator 직접 구현으로 우회하지 않습니다.

Worker는 실제 자기 worktree에 연결된 Codocs MCP를 우선 사용하거나 그 worktree의 로컬 `.codocs`를 읽어 규칙과 packet 근거를 다시 확인합니다. 승인된 task가 문서 수정을 요구하면 소유/공유 경로 안에서 최신 revision으로 수정하고 충돌·저장/색인 결과·진단을 검토합니다. Coordinator는 MCP로도 문서를 쓰지 않습니다. Worker는 구현·작업별 검사·self-review를 수행하고 정확한 verified result 또는 소비 가능한 provisional candidate와 명시적인 continuation 판단을 반환합니다. 검사 실패만으로 전체 실행을 멈추지 않으며, 실제 필요한 interface가 없는 descendants만 보류합니다. 한 task로 끝나는 작업은 추가 integration packet 없이 그 결과가 최종 head가 될 수 있습니다.

필요한 질문은 발견 시 비동기로 보내고 답변이 필요한 작업만 보류합니다. 사용자 지시가 바뀌면 영향받는 worker를 전달/중단하고 진행 중 도구까지 멈췄는지 확인한 뒤 새 intent/binding revision을 발행합니다. 원본 plan은 보존하고 결과 재사용·무효화와 재검증 범위를 기록합니다. 기존 task의 알려진 미커밋 변경은 소유권과 상태를 확인해 명시적으로 재바인딩하여 재개할 수 있지만, 다른 task와 worktree를 공유하지 않습니다. 알 수 없는 사용자 변경을 임의로 흡수하지 않습니다. 전체 취소 지시에는 전체 실행을 멈춥니다.

모든 완료 판정은 최신 승인 범위에 적용합니다. 계획한 진단 정책 안에서는 coordinator가 읽기 전용 helper를 추가할 수 있지만 수정 주체는 한 명입니다. 기록에는 task별 planned/requested/effective profile과 revision·diagnosis 결과를 구분합니다.

기존 작업별 검사·자기 검토·통합 검사·verified/provisional 구분을 유지합니다. **필수 독립 agent 리뷰, 일괄 부하/실패 검사, 전달 전 별도 승인 gate를 추가하지 않습니다.** 특별 검증이나 리뷰는 사용자 요청이나 실제 변경의 위험에 맞게 포함합니다. 기존 `finalize` 진입점은 제거하고 별도 스킬로 요구하지 않습니다.

명시 호출한 review-delivery 흐름은 검증된 최종 결과를 확인된 PR source/head 이력에 통합하고 정확한 commit을 푸시합니다. 대상 repository/remote/head와 현재 원격 commit을 전달 binding으로 기록하며 explicit no-push/local-only 정책을 보존합니다. Coordinator는 계속 읽기 전용이고 publisher worker가 자기 격리 worktree에서 전달을 수행합니다. 기존 final worker를 이어 사용할 수 있으며 새로운 결합 검증이 필요할 때만 별도 integration worker를 둡니다. provisional continuation은 리뷰 전달 권한이나 검증 성공을 의미하지 않습니다.

원격 반영을 확인하면 `AWAITING_REVIEW`로 응답을 마치고 같은 대화의 다음 사용자 메시지를 기다립니다. 예약·heartbeat·리뷰 polling·sleep loop를 만들지 않으며 계속 실행 중이라고 표현하지 않습니다. 다음 질문에는 답하고, 리뷰 수정은 현재 head/작업 상태를 확인해 revision과 필요한 검증·재전달로 처리합니다. 승인만으로 PR base merge·배포·cleanup을 수행하지 않습니다.

## Memory Update

프로젝트 `.codocs`의 bounded 지식 주제를 다룹니다. 실제 작업 checkout에 연결된 Codocs MCP를 우선 사용하고, 해당 checkout에 사용할 연결이 없으면 로컬 파일 방식으로 진행합니다. 서버의 시작 프로젝트가 실제 write worktree와 같은지 설정/세션 근거로 확인하며, 같은 repository나 문서 내용만으로 연결을 재사용하지 않습니다. MCP 설치·설정 변경은 이 흐름에 자동 포함하지 않습니다.

MCP 사용 시 필요한 `codocs_guide` 주제를 읽고 `codocs_list`의 페이지를 따라 목록을 수집합니다. `codocs_get`으로 담당 원문·참조·revision을 읽고, 최신 검토 revision으로 `codocs_write`를 실행합니다. 큰 요청의 독립적인 사실 확인·중복 분석만 명시적 profile로 읽기 전용 위임할 수 있습니다. 메인이 의미·문서 소유권·충돌을 종합하고 한 명의 writer가 의존 순서대로 문서를 수정합니다.

프로젝트의 명시적 schema/version, authoring rule과 연결된 버전의 계약을 확인하며 bundled baseline은 이에 부합할 때 사용합니다. revision 충돌은 최신 원문을 재검토한 뒤 해결하고, 저장 완료 후 색인 갱신만 실패하면 재저장하지 않고 refresh로 복구합니다. partial scan이나 불확실한 저장 결과를 직접 파일 쓰기로 우회하지 않습니다. 불명확한 중요한 충돌은 질문하고 해당 쓰기만 보류합니다.

문서 갱신 후 `codocs_validate` 또는 로컬 도구로 영향받는 참조를 검사하고 마지막에 전체 ID/이름 중복과 참조·navigation 정합성을 확인합니다. validate 요청 성공과 문서 오류 유무를 구분하고 경고도 검토합니다. 변경 없는 전체 scan은 매 문서마다 반복하지 않습니다. MCP revision 검사도 다중 파일 트랜잭션이나 프로세스 간 잠금을 보장하지 않습니다.

Wiki 조회/갱신·동기화와 실행 로그 저장은 하지 않습니다. 이미 같은 내용은 그대로 두고, 모든 주제의 실제 경로·접근 방식·저장/색인 결과·검증 한계와 미처리 사유를 보고합니다.

## 공통 경계와 배포

사용자 checkout과 무관한 변경을 보존합니다. 리뷰 전달의 PR head 통합·push는 명시 호출한 해당 흐름과 확인된 대상 범위에서 수행합니다. PR 생성, base merge, 배포, cleanup은 별도 사용자 권한입니다.

플러그인은 MCP를 번들하지 않습니다. Figma, Codocs, `gateway-public`(Local Work Memory·Context7)은 각 도구의 사용자 설정으로 등록하며 [`host-setup.md`](host-setup.md)를 따릅니다.

`npm run deploy`(또는 `deploy:codex`, `deploy:claude`)는 각 도구의 `workbench` marketplace가 실행 checkout의 `plugin/`을 가리키는지 검사합니다. 임시 cachebuster로 install한 뒤 source manifest를 복원합니다. 격리 worktree의 소스 수정과 기존 설치본 갱신은 별개이며, marketplace 경로를 몰래 변경하거나 설치 캐시를 직접 수정하지 않습니다. 자동 테스트는 없으며 변경한 동작은 대상 도구에서 직접 확인합니다.
