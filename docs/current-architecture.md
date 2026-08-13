# Current Architecture — Codex Workbench

> 기준일: 2026-08-13

현재 사용자-facing Workbench는 `codex-plugin/plugins/workbench/`의 다섯 explicit-only 스킬입니다. 핵심 원칙은 스킬 독립성, 선택적 persistence, MCP-backed project evidence, task별 Git worktree 격리입니다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| 플러그인 | `codex-plugin/plugins/workbench/` | 다섯 workflow skill, MCP 설정, 계약 테스트 |
| marketplace | `codex-plugin/.agents/plugins/marketplace.json` | 로컬 Workbench 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | cachebuster와 로컬 install |
| 활성 CI | `.github/workflows/workbench-test.yml` | Node 계약 테스트 |
| legacy evaluator | `.codex/skills/evaluate-workbench/` | 이전 brainstorm/executor 회귀 검사 |
| 역사 보관 | `legacy/` | 이전 구현과 문서 |

## 활성 스킬

```text
$workbench:shape
$workbench:memory-update
$workbench:prepare
$workbench:execute-task
$workbench:finalize
```

모든 `agents/openai.yaml`은 `allow_implicit_invocation: false`입니다. 스킬은 다른 Workbench 스킬을 자동 호출하거나 특정 후속 스킬을 필수로 만들지 않습니다.

| Skill | 책임 | 독립 산출물 |
|---|---|---|
| `shape` | 읽기 전용 근거 수집, 요구사항·수락 기준·결정 | 완전한 Shape Report |
| `memory-update` | 사용자가 선택한 Shape/Prepare 결과를 MCP로 저장 | Artifact reference 또는 실패 결과 |
| `prepare` | Shape를 실행 가능한 DAG와 packet으로 변환 | Execution Plan과 Task Packets |
| `execute-task` | packet 하나를 전용 worktree에서 실행 | Task Result와 선택적 integration head |
| `finalize` | 최종 통합 결과 검증·독립 리뷰·보고 | Final Report |

## 독립 handoff와 선택적 persistence

Shape와 Prepare 결과는 현재 대화나 사용자 입력에 완전한 본문으로 존재하면 다음 스킬이 직접 사용할 수 있습니다.

```text
Shape Report ──────────────────────────────→ Prepare
     └─ 선택: Memory Update → Artifact ref ─┘

Execution Plan + Task Packet ─────────────→ Execute Task
     └─ 선택: Memory Update → Artifact ref ─┘
```

Memory Update는 저장 기능이며 승인 단계나 workflow database가 아닙니다.

- `shape → prepare`에 Memory Update가 필요하지 않습니다.
- `prepare → execute-task`에 Memory Update가 필요하지 않습니다.
- `finalize`도 완전한 inline workflow 결과를 받을 수 있습니다.
- 다른 task나 나중 대화에서 본문이 없으면 사용자가 MCP Artifact reference를 제공할 수 있습니다.
- 입력이 부족하면 “저장하지 않음”이 아니라 “완전한 계약을 읽을 수 없음”을 이유로 차단합니다.

Inline과 MCP-referenced 결과는 동일한 semantic authority를 가집니다. Persistence는 durable retrieval을 제공하지만 사용자 승인이나 다음 단계 실행 권한을 부여하지 않습니다.

## Local Work Memory MCP 경계

Workbench 스킬에는 MCP를 사용하는 목적과 시점만 둡니다. 구체적인 도구 schema, Typed Reference, 목록 탐색, 본문 분할 읽기, artifact transfer, idempotency와 성공 판정은 MCP tool contract가 소유합니다.

- 개발 작업 시작 시 현재 project Convention을 참고합니다.
- 관련 Wiki·Work Item·Workbench Artifact가 필요하면 MCP로 canonical 본문을 읽습니다.
- 사용자가 Artifact reference를 입력하면 MCP로 정확한 결과를 해소합니다.
- Memory Update는 Shape 또는 Prepare 결과를 immutable Workbench Artifact로 commit합니다.

Shape와 Prepare 결과는 Dev Wiki knowledge가 아닙니다. Dev Wiki는 현재 프로젝트 지식을 소유하고, Workbench Artifact는 특정 Work Item과 repository snapshot의 실행 기록입니다.

MCP read/write capability의 hard authorization은 provider scope와 host policy가 소유합니다. 스킬의 `Do NOT` 계약은 실행 정책이지 보안 경계 그 자체가 아닙니다.

## Shape

Shape는 primary Local 또는 linked worktree인 현재 checkout을 읽기 전용으로 분석합니다. Codex task나 coordinator worktree를 만들지 않습니다.

1. Git identity와 content-sensitive snapshot을 기록합니다.
2. Local Work Memory MCP에서 현재 Convention과 관련 프로젝트 문서를 참고합니다.
3. 연결된 Jira/Figma 근거가 있으면 필요한 범위만 읽습니다.
4. repository, 공식 문서, 외부 근거를 연결해 요구사항·불변조건·수락 기준을 만듭니다.
5. 아키텍처 결정과 예상 작업 경계를 기록합니다.
6. 완전한 Shape Report를 반환하고 종료합니다.

Shape는 Memory Update용 Change Set을 만들지 않으며, 결과 저장을 다음 단계의 조건으로 두지 않습니다.

## Prepare

Prepare는 완전한 `READY` Shape Report를 입력으로 받습니다. 입력은 inline 본문 또는 MCP Artifact reference일 수 있습니다.

- repository identity와 Shape snapshot을 검증합니다.
- clean baseline을 확인합니다.
- acceptance와 결정을 task DAG로 분해합니다.
- direct/indirect write surface와 runtime resource 충돌을 분석합니다.
- implementation 및 integration packet마다 고유 branch와 worktree path를 계획합니다.
- 모든 plan에 final integration-seal packet을 둡니다.
- worktree는 만들지 않고 완전한 Execution Plan과 Task Packets를 반환합니다.

Prepare 역시 persistence를 수행하거나 요구하지 않습니다.

## Task-scoped worktree 모델

현재 Workbench에는 coordinator worktree가 없습니다.

```text
Local checkout (읽기 기준, 구현 변경 없음)
  ├── TASK-001 worktree / codex/<run>/TASK-001
  ├── TASK-002 worktree / codex/<run>/TASK-002
  ├── INT-001 worktree  / codex/<run>/INT-001
  └── final seal worktree
```

- Execute Task invocation 하나가 Task Packet 하나를 소유합니다.
- 직렬 task는 이전 Task Result SHA를 다음 task의 base로 사용합니다.
- 병렬 task는 같은 immutable base에서 시작하고 integration packet이 pinned result SHA를 통합합니다.
- integration도 별도 task이자 별도 worktree입니다.
- successful mutating task는 task-local commit과 clean status로 끝납니다.
- 실패한 task worktree는 진단 근거로 보존할 수 있습니다.

Push, PR, Local merge/rebase, handoff, worktree 및 branch 정리는 별도 사용자 권한입니다.

## Finalize

Finalize는 final integration packet의 정확한 clean worktree와 integrated head를 검증합니다.

- Shape/Plan/Task Result의 run, plan digest, packet, dependency와 result SHA를 교차 검증합니다.
- acceptance-critical 검사가 실패하거나 수행되지 않았으면 `FINALIZED`를 반환하지 않습니다.
- failure, concurrency, load 시나리오를 실제 위험에 맞춰 수행합니다.
- 독립 reviewer에게 raw diff와 계약·검증 근거를 제공합니다.
- 문서 변경은 plan에 선언된 안전한 repository-relative path와 명시적 commit 권한이 있을 때만 수행합니다.
- 최종 branch, HEAD, diff, clean status를 다시 확인합니다.

## Project-local evaluator 경계

`.codex/skills/evaluate-workbench/`는 `$workbench:brainstorm`과 `$workbench:executor`를 전제로 하는 legacy v2 evaluator입니다. 현재 다섯 스킬의 acceptance evidence가 아니며 별도 승인 없이 수정하지 않습니다.

## 검증 기준

- 활성 skill directory는 다섯 개뿐이어야 합니다.
- 모든 skill은 namespaced selector와 `allow_implicit_invocation: false`를 유지해야 합니다.
- Shape와 Prepare는 독립적인 완전한 결과를 반환해야 합니다.
- Memory Update는 optional Artifact persistence여야 합니다.
- Prepare와 Execute는 Memory Update Result를 entry gate로 요구하지 않아야 합니다.
- 모든 implementation/integration packet은 고유 worktree와 branch를 가져야 합니다.
- active tests와 CI는 `legacy/`를 runtime 또는 fixture로 사용하지 않아야 합니다.
- `.codex/`는 별도 승인 없이 수정하지 않습니다.
