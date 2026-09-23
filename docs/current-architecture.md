# Current Architecture — Codex Workbench

> 기준일: 2026-09-22

현재 Workbench는 `codex-plugin/plugins/workbench/`에 있는 네 개의 독립적인 explicit-only 스킬입니다. 사용자가 필요한 스킬을 선택하며, 스킬끼리 자동 연결하거나 다른 스킬을 선행 조건으로 요구하지 않습니다.

## 소유권과 진입점

| 영역 | 경로 | 역할 |
|---|---|---|
| 플러그인 | `codex-plugin/plugins/workbench/` | 스킬, manifest, Figma MCP 설정, 계약 검사 |
| marketplace | `codex-plugin/.agents/plugins/marketplace.json` | 로컬 Workbench 등록 |
| 배포 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | 임시 cachebuster와 로컬 install |
| 프로젝트 규칙 | `.agent/AGENTS.md` | 저장소 작업 원칙 |
| 역사 보관 | `legacy/` | 이전 구현과 문서, 현재 계약의 입력 아님 |

| 스킬 | 입력 | 결과 |
|---|---|---|
| `shape` | 소프트웨어 변경 요청과 근거 | 범위에 맞춘 변경 분석 |
| `prepare` | 충분한 변경 정의 | task DAG, worktree, 검증, 모델·effort 계획 |
| `execute-task` | execution plan, packet 묶음 또는 bounded objective | 작업별 실행·검증 결과와 미해결 사항 |
| `memory-update` | bounded project-knowledge 주제 | 로컬 `.codocs` 갱신·참조 검증 결과 |

모든 `agents/openai.yaml`은 `allow_implicit_invocation: false`를 유지합니다. 입력 생산자가 아니라 입력의 의미·정확한 Git identity·제공된 digest를 검증합니다. 메인 모델은 호출자가 선택하며 스킬이 전환하지 않습니다.

## 모델 선택과 위임

서브에이전트는 부모의 모델·effort를 암묵적으로 상속하지 않습니다. 현재 host가 제공하는 모델과 effort 중 작업의 명확성, 여러 모듈의 관계, 실패 영향, 검증 가능성을 보고 둘을 명시적으로 선택합니다. 새 프로필은 지원되는 GPT-6 모델을 우선 후보로 삼습니다. Luna/high는 bounded 탐색·반복 수정·명확한 소규모 구현, Sol/medium은 일반 및 복잡한 구현·디버깅, Astra/low는 가장 어려운 다단계 설계·통합 판단의 시작점입니다. 단순하고 검증이 쉬우면 Luna/low 또는 medium, 더 깊은 분석이 필요하면 Sol/high나 Astra/medium 또는 high로 조정할 수 있습니다. 여러 모듈에 걸친 작업이라는 이유만으로 Astra를 선택하지 않습니다. 모델 간 동일 effort 이름은 동일한 능력·사용량을 뜻하지 않습니다. 이는 고정 성능·가격 순위가 아니며 사용자 선택과 한도를 우선합니다.

Shape의 초기 조사 예시는 코드 위치·호출 관계 GPT-6 Luna/high, 여러 모듈의 영향 GPT-6 Sol/medium, 어려운 설계 대안·실패 조건 Astra/medium 또는 high입니다. Prepare의 조사 예시는 파일 소유권·충돌 GPT-6 Sol/medium, 선행 조건·통합 위험은 확립된 계약이면 GPT-6 Sol/medium, 어려운 미확정 상호작용이면 Astra/medium 또는 high입니다. 필요성 없이 에이전트를 만들지 않으며 작은 조회는 직접 처리하거나 도구 호출을 묶습니다.

독립적인 입력·결과와 시간 또는 품질 이득이 있는 읽기 전용 조사만 위임하고, 메인은 독립 작업과 최종 통합을 담당합니다. 각 helper는 근거·불확실성을 반환하고 파일을 수정하지 않습니다. 내부 위임은 subagent 도구를 사용하며 사용자 소유의 별도 앱 task를 만들지 않습니다.

실행 프로필은 YAML만으로 적용되지 않습니다. host의 생성 인자와 모델 선택지를 확인하고 새 context에 완전한 packet과 함께 model/effort를 전달해야 합니다. `fork_turns: none`을 지원하면 이를 사용하며 전체 이력 fork의 override 제한과 custom agent 설정 우선순위를 고려합니다. 계획값·요청값·host가 알려준 실제값을 구분하고, 실제값이 노출되지 않으면 `unknown`으로 보고합니다. 모델 자신의 진술은 실행 설정의 증거가 아닙니다.

신규 선택의 후보가 없으면 사용자 한도 안에서 지원되는 대안을 선택하고 이유를 남깁니다. 명시된 기존 5.6 프로필은 보존하며 릴리스만으로 업그레이드하지 않습니다. 실행 프로필 변경을 승인받으면 원본과 digest를 유지한 채 binding revision으로 추적합니다. 모델 비교가 필요한 경우 기존 지원 effort를 유지해 대표 작업의 결과·재시도·시간·사용량을 비교한 후 조정합니다. 이는 매 작업에 추가되는 검증 gate가 아닙니다. 선택 기준은 [공식 모델 가이드](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna)를 2026-09-23에 확인했으며 실행 가능 여부는 실제 host가 제공하는 조합으로 판단합니다.

## Shape

현재 checkout을 읽기 전용으로 조사합니다. 관련 `.codocs`와 프로젝트 규칙, 코드·테스트·CI, 제공된 Wiki Artifact와 연결된 Figma, 버전에 맞는 공식 자료를 근거로 사용합니다. canonical Wiki/Jira 조회나 외부 mutation은 하지 않습니다.

작은 질문은 HEAD·dirty 상태·조사한 소스 identity와 관련 결론을 담은 `focused` 보고서로 충분합니다. 재현 가능한 인계나 넓은 dirty 변경에 의존하는 분석은 `snapshot_bound`로 전체 content-sensitive fingerprint를 계산합니다. focused 결과를 전체 checkout이 고정됐다는 보증으로 표현하지 않습니다.

## Prepare

현재 checkout은 읽기 전용이며 clean/stable execution base를 정합니다. 필요한 dirty 변경을 누락하거나 임의로 checkpoint하지 않습니다. `.codocs`의 관련 제약과 source identity를 self-contained packet에 담습니다.

각 task의 목표·수락 조건·소유 파일·금지 범위·실행 자원·검증·고유 branch/worktree·정확한 base selector와 `execution_profile`을 계획합니다. 프로필은 model, reasoning_effort, rationale, 기본 `escalation: none`을 포함합니다. 필요한 작업에만 명시한 조건·모델·effort·추가 agent 수 한도를 갖는 읽기 전용 diagnosis를 계획합니다. 환경 장애나 사용자 결정 누락은 effort 상향으로 해결하지 않습니다. 미래 실행 host를 확인하지 못하면 가용성 미확인으로 표시하고 실행 시 preflight하도록 합니다.

API/type producer-consumer 관계 자체를 직렬화 사유로 삼지 않습니다. 정확한 공유 계약·타입을 먼저 확정한 뒤 쓰기와 자원이 분리된 서버·클라이언트를 병렬 구현하고 실제 통합을 검사할 수 있습니다. 계약이 아직 없다면 선행 dependency가 필요합니다. Wave는 설명용이며 각 task의 의존성 충족이 실제 실행 기준입니다.

작은 작업은 하나의 packet으로 유지할 수 있습니다. 별도 결과를 합치거나 cross-task 검증이 필요할 때만 integration packet을 추가합니다. 원본 YAML/digest와 별도로 짧은 단계 설명 및 task/model/effort/선정 이유 표를 제공합니다. 실행 계획은 그 자체로 commit이나 외부 작업 권한을 부여하지 않습니다.

## Execute Task

Coordinator는 읽기 전용으로 입력을 정규화하고 실행을 조정합니다. 공급된 profile은 보존하며, profile 없는 호환 입력은 동일한 판단 기준으로 선택해 execution binding에 이유를 기록합니다. 원본 byte/digest는 보존하고 정규화된 packet에는 별도 binding digest를 부여합니다.

각 implementation/integration worker는 완전한 packet, 명시된 model/effort, 고유 standard Git worktree를 사용합니다. Coordinator는 파일을 수정하거나 worktree를 만들지 않습니다. 독립적이고 자원이 격리된 runnable task를 host capacity까지 실행하고 나머지는 대기시킵니다. 특정 profile을 요청할 수 없으면 해당 task를 막고 설명하며 독립 작업은 계속합니다. 조용한 profile 대체나 coordinator 직접 구현으로 우회하지 않습니다.

Worker는 자기 worktree의 `.codocs`와 규칙을 확인하고 구현·작업별 검사·self-review를 수행합니다. 정확한 verified result 또는 소비 가능한 provisional candidate와 명시적인 continuation 판단을 반환합니다. 검사 실패만으로 전체 실행을 멈추지 않으며, 실제 필요한 interface가 없는 descendants만 보류합니다. 한 task로 끝나는 작업은 추가 integration packet 없이 그 결과가 최종 head가 될 수 있습니다.

필요한 질문은 발견 시 비동기로 보내고 답변이 필요한 작업만 보류합니다. 사용자 지시가 바뀌면 영향받는 worker를 전달/중단하고 진행 중 도구까지 멈췄는지 확인한 뒤 새 intent/binding revision을 발행합니다. 원본 plan은 보존하고 결과 재사용·무효화와 재검증 범위를 기록합니다. 기존 task의 알려진 미커밋 변경은 소유권과 상태를 확인해 명시적으로 재바인딩하여 재개할 수 있지만, 다른 task와 worktree를 공유하지 않습니다. 알 수 없는 사용자 변경을 임의로 흡수하지 않습니다. 전체 취소 지시에는 전체 실행을 멈춥니다.

모든 완료 판정은 최신 승인 범위에 적용합니다. 계획한 진단 정책 안에서는 coordinator가 읽기 전용 helper를 추가할 수 있지만 수정 주체는 한 명입니다. 기록에는 task별 planned/requested/effective profile과 revision·diagnosis 결과를 구분합니다.

기존 작업별 검사·자기 검토·통합 검사·verified/provisional 구분을 유지합니다. **필수 독립 리뷰, 일괄 부하/실패 검사, 별도 최종 승인·보고 단계를 추가하지 않습니다.** 특별 검증이나 리뷰는 사용자 요청이나 실제 변경의 위험에 맞게 포함합니다. 기존 `finalize` 진입점은 제거하고 그 절차를 이 스킬의 필수 단계로 흡수하지 않습니다.

## Memory Update

프로젝트 `.codocs`의 bounded 지식 주제를 다룹니다. parser/script로 목록·ID·참조를 수집하고, 큰 요청의 독립적인 사실 확인·중복 분석만 명시적 profile로 읽기 전용 위임할 수 있습니다. 메인이 의미·문서 소유권·충돌을 종합하고 한 명의 writer가 의존 순서대로 문서를 수정합니다.

프로젝트의 명시적 schema/version, authoring rule, validator가 기준이며 bundled baseline은 이에 부합할 때 사용합니다. 불명확한 중요한 충돌은 질문하고 해당 쓰기만 보류합니다. 문서 갱신 후 영향받는 참조를 검사하고 마지막에 전체 ID/이름 중복과 참조·navigation 정합성을 확인합니다. 변경 없는 전체 scan은 매 문서마다 반복하지 않습니다.

Wiki 조회/갱신·동기화와 실행 로그 저장은 하지 않습니다. 이미 같은 내용은 그대로 두고, 모든 주제의 실제 경로·결과·검증 한계와 미처리 사유를 보고합니다.

## 공통 경계와 배포

사용자 checkout과 무관한 변경을 보존합니다. Push, PR, 사용자 branch merge, handoff, cleanup은 별도 사용자 권한입니다. `.codex/` 설정은 이 변경의 대상이 아닙니다. 프로젝트 설정의 agent 한도는 20입니다.

Figma MCP만 플러그인이 직접 등록합니다. Context7, Local Work Memory, Atlassian은 설치·인증 의존성에 포함하지 않습니다.

`npm run codex-deploy`는 `local-work` marketplace가 실행 checkout의 `codex-plugin/`을 가리키는지 검사합니다. 임시 cachebuster로 install한 뒤 source manifest를 복원합니다. 격리 worktree의 소스 수정과 기존 설치본 갱신은 별개이며, marketplace 경로를 몰래 변경하거나 설치 캐시를 직접 수정하지 않습니다.
