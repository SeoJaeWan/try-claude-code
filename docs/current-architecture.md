# Current Architecture — Codex Workbench

> 기준일: 2026-08-25

현재 Workbench는 `codex-plugin/plugins/workbench/`에 있는 다섯 개의 독립적인 explicit-only 스킬입니다. 스킬 집합은 고정 파이프라인을 정의하지 않으며, 각 스킬은 자기 입력·동작·산출물·안전 경계만 소유합니다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| 플러그인 | `codex-plugin/plugins/workbench/` | 독립 스킬과 Figma MCP 설정 |
| marketplace | `codex-plugin/.agents/plugins/marketplace.json` | 로컬 Workbench 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | 임시 cachebuster와 로컬 install |
| 역사 보관 | `legacy/` | 이전 구현과 문서 |

## 독립 스킬

| Skill | 입력 | 결과 |
|---|---|---|
| `shape` | 소프트웨어 변경 요청과 프로젝트 근거 | 독립적인 변경 분석 보고서 |
| `prepare` | 충분한 변경 정의 | 실행 DAG와 self-contained task/worktree packet |
| `execute-task` | execution plan, packet 묶음 또는 bounded objective | Sol/high worker들의 task 결과와 통합 실행 결과 |
| `memory-update` | 하나 이상의 bounded project-knowledge 주제 | 모든 안전한 주제의 순차 Wiki 큐레이션 결과와 정확한 reference |
| `finalize` | 정확한 Git `base..head` | 위험 기반 검증·독립 리뷰·최종 보고 |

모든 `agents/openai.yaml`은 `allow_implicit_invocation: false`입니다. 각 스킬은 자신의 `$workbench:<skill>` selector로만 명시 호출됩니다.

## 결합 제거 원칙

- 선행 스킬의 실행 여부를 entry gate로 사용하지 않습니다.
- 생산 스킬 이름이 아니라 입력 내용의 완전성과 식별자·digest·Git 상태를 검증합니다.
- Execute Task는 Prepare가 아닌 다른 생산자가 만든 호환 가능한 plan도 실행합니다.
- Wiki 큐레이션은 요청 범위의 모든 bounded 주제를 처리하지만 승인, 단계 전환 또는 범위 밖 실행 권한은 부여하지 않습니다.
- 사용자가 여러 스킬을 조합할 수 있지만 그 조합은 다른 스킬의 강제 선행 조건이 아닙니다.

## Shape

Shape는 현재 checkout을 읽기 전용으로 조사합니다. Git content-sensitive snapshot, Local Work Memory, 연결된 Jira/Figma 근거, 저장소 코드·CI와 공식 자료를 사용해 요구사항·불변조건·수락 기준·결정을 작성합니다. 구현, 저장, worktree 생성, 외부 시스템 mutation은 하지 않습니다.

## Prepare

Prepare는 요청, 이슈, 요구사항 문서, 설계 노트, 분석 보고서 등 충분한 변경 정의를 입력으로 받습니다. Clean base를 검증하고 task DAG, collision surface, runtime resource, 고유 worktree/branch, baseline과 integration packet을 계획하지만 worktree를 만들거나 파일을 수정하지 않습니다.

각 task packet은 대화 이력이 없는 worker가 단독 실행할 수 있을 만큼 self-contained해야 합니다. Worker 모델과 reasoning effort는 계획에 넣지 않고 Execute Task의 runtime policy가 소유합니다.

## Execute Task

Execute Task는 읽기 전용 coordinator입니다. Execution plan, self-contained packet 묶음 또는 하나의 bounded objective를 받아 dependency DAG에서 runnable task를 계산합니다. Standalone objective는 내부적으로 task 하나짜리 plan으로 정규화합니다.

모든 implementation과 integration task는 다음 profile의 별도 worker에 배정합니다.

```yaml
fork_turns: none
model: gpt-5.6-sol
reasoning_effort: high
context: complete_task_packet_only
```

Write surface와 runtime resource가 격리된 runnable task는 host capacity 안에서 병렬 실행합니다. 각 worker는 자기 packet 하나와 자기 standard Git worktree만 소유합니다. 검증을 통과하면 verified result commit을 반환하고, 구현은 소비 가능하지만 검증 실패가 남으면 provisional candidate commit과 명시적인 continuation 판단을 반환합니다.

구현 중 충돌, 실패한 검사 또는 계획 당시의 부정확한 가정은 자동 중단 사유가 아닙니다. Coordinator는 정확한 candidate commit과 `continuation: ALLOWED`가 있는 downstream 및 integration packet을 계속 실행하고, 물질적 선행 산출물이 없을 때만 영향을 받는 descendants를 실행하지 않습니다. Integration은 권한 범위 안에서 기계적으로 결정 가능한 호환성 문제를 복구하고 의미 있는 검사를 끝까지 수행합니다. 최종 결과는 계획 대비 발견, 복구 시도, verified/provisional commit, 미해결 조치와 실행하지 못한 task를 구분합니다.

Coordinator는 worktree를 만들거나 파일을 수정·stage·commit하지 않습니다. Worker profile을 사용할 수 없으면 다른 모델이나 effort로 fallback하지 않고 `BLOCKED`를 반환합니다.

## Memory Update

Memory Update는 요청에 포함된 모든 bounded project-knowledge 주제를 기존 Wiki 구조와 대조해 dependency-aware queue로 정규화하고 순차 처리합니다. 같은 canonical 경계의 주제는 하나로 합치며, 각 queue unit마다 기존 Wiki 갱신·새 Wiki 생성·변경 없음·쓰기 전 차단 중 하나를 결정합니다. 확정적 실패나 주제 단위 차단 뒤에도 안전한 독립 주제는 계속 처리하고, 공유 identity·concurrency·current-state 불확실성이 후속 결정을 위험하게 만들 때만 관련 remainder를 중단합니다.

Local Work Memory MCP는 discovery, identity, revision, reference, persistence, concurrency와 relationship 표현을 소유합니다. Memory Update는 각 write 뒤 결과를 검증하고 후속 판단에 필요한 상태를 갱신하며, 첫 Wiki가 아니라 전체 queue의 주제별 결과를 반환합니다.

## Finalize

Finalize는 어떤 도구나 사람이 만든 결과인지와 무관하게 정확한 `base_commit..head_sha`를 검증합니다. 실제 위험에 맞는 failure/concurrency/load 검증과 독립 리뷰를 수행하며, acceptance-critical evidence가 없거나 실패하면 `FINALIZED`를 반환하지 않습니다.

## 공통 안전 경계

- explicit invocation만 허용합니다.
- 사용자 checkout을 stash, reset, clean하지 않습니다.
- Git identity, 정확한 commit ID, digest, path와 clean 상태를 검증합니다.
- push, PR, 사용자 branch merge, handoff와 cleanup은 별도 사용자 권한입니다.
- 수행하지 않은 검사를 통과로 표현하지 않습니다.
- 플러그인이 직접 등록하는 Figma의 hard authorization은 OAuth scope, MCP provider와 host policy가 소유합니다.
- Context7, Local Work Memory, Atlassian MCP는 플러그인 설치·인증 의존성에 포함하지 않습니다.

## Project-local 설정

`.codex/config.toml`은 병렬 task 실행을 위해 agent thread 한도를 20으로 둡니다. `.codex/`에는 project-local skill이나 evaluator를 두지 않습니다.

## 배포

`npm run codex-deploy`가 실행하는 `codex-plugin/scripts/deploy-workbench-plugin.mjs`는 `local-work` marketplace가 현재 checkout의 `codex-plugin/`을 가리키는지 확인합니다. 설치 직전에 cachebuster 버전을 임시 적용하고 설치가 성공하거나 실패하면 source manifest의 원본 바이트를 복원하므로 배포가 추가한 version 변경은 Git에 남지 않습니다.
