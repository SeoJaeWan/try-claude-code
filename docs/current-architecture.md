# Current Architecture — Codex Workbench

> 기준일: 2026-08-13

현재 Workbench는 `codex-plugin/plugins/workbench/`에 있는 다섯 개의 독립적인 explicit-only 스킬입니다. 스킬 집합은 고정 파이프라인을 정의하지 않으며, 각 스킬은 자기 입력·동작·산출물·안전 경계만 소유합니다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| 플러그인 | `codex-plugin/plugins/workbench/` | 독립 스킬, MCP 설정, 계약 테스트 |
| marketplace | `codex-plugin/.agents/plugins/marketplace.json` | 로컬 Workbench 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | cachebuster와 로컬 install |
| 활성 CI | `.github/workflows/workbench-test.yml` | Node 계약 테스트 |
| legacy evaluator | `.codex/skills/evaluate-workbench/` | 이전 brainstorm/executor 회귀 검사 |
| 역사 보관 | `legacy/` | 이전 구현과 문서 |

## 독립 스킬

| Skill | 입력 | 결과 |
|---|---|---|
| `shape` | 소프트웨어 변경 요청과 프로젝트 근거 | 독립적인 변경 분석 보고서 |
| `prepare` | 충분한 변경 정의 | 실행 DAG와 task/worktree packet |
| `execute-task` | bounded task objective 또는 완전한 packet | 격리된 task 결과와 commit |
| `memory-update` | MCP가 지원하는 완료 artifact 하나 | 정확한 Artifact reference 또는 실패 결과 |
| `finalize` | 정확한 immutable Git `base..head` | 위험 기반 검증·독립 리뷰·최종 보고 |

모든 `agents/openai.yaml`은 `allow_implicit_invocation: false`입니다. 각 스킬은 자신의 `$workbench:<skill>` selector만 광고하며 다른 Workbench selector를 알지 못합니다.

## 결합 제거 원칙

- 선행 스킬의 실행 여부를 entry gate로 사용하지 않습니다.
- 생산 스킬 이름이 아니라 입력 내용의 완전성과 식별자·digest·Git 상태를 검증합니다.
- persistence는 저장 기능이며 승인, 단계 전환, 실행 권한이 아닙니다.
- 다음 단계 추천이나 자동 진행 문구를 스킬 계약에 두지 않습니다.
- 사용자가 여러 스킬을 조합할 수 있지만 그 조합은 스킬 자체의 제품 계약이 아닙니다.

## Shape

Shape는 현재 checkout을 읽기 전용으로 조사합니다. Git content-sensitive snapshot, Local Work Memory, 연결된 Jira/Figma 근거, 저장소 코드·테스트·CI, 공식 자료를 사용해 요구사항·불변조건·수락 기준·결정을 작성합니다. 구현, 저장, worktree 생성, 외부 시스템 mutation은 하지 않습니다.

## Prepare

Prepare는 요청, 이슈, 요구사항 문서, 설계 노트, 분석 보고서 등 충분한 변경 정의를 입력으로 받습니다. 특정 producer를 요구하지 않습니다. clean base를 검증하고 task DAG, collision surface, runtime resource, 고유 worktree/branch, baseline과 integration packet을 계획하지만 worktree를 만들거나 파일을 수정하지 않습니다.

## Execute Task

Execute Task는 standalone task objective 또는 완전한 execution packet 하나를 실행합니다. standalone 입력에는 mutation 전에 최소 실행 계약을 만들고, packet 입력에는 digest와 binding을 검증합니다. 사용자 checkout 밖의 전용 standard Git worktree에서만 작업하고, 성공 시 검증된 task-local commit과 clean status를 반환합니다.

## Memory Update

Memory Update는 MCP가 지원하는 완료 artifact 하나를 의미 변경 없이 저장합니다. producer는 provenance일 뿐 eligibility를 결정하지 않습니다. MCP tool contract가 artifact kind, folder, transfer, idempotency와 Typed Reference를 소유합니다.

## Finalize

Finalize는 어떤 도구나 사람이 만든 결과인지와 무관하게 정확한 `base_commit..head_sha`를 검증합니다. 요구사항·계획·task result·artifact reference는 선택적 근거입니다. 실제 위험에 맞는 failure/concurrency/load 검증과 독립 리뷰를 수행하며, acceptance-critical evidence가 없거나 실패하면 `FINALIZED`를 반환하지 않습니다.

## 공통 안전 경계

- explicit invocation만 허용합니다.
- 사용자 checkout을 stash, reset, clean하지 않습니다.
- Git identity, immutable SHA, digest, path와 clean 상태를 검증합니다.
- push, PR, 사용자 branch merge, handoff와 cleanup은 별도 사용자 권한입니다.
- 수행하지 않은 검사를 통과로 표현하지 않습니다.
- Local Work Memory, Jira, Figma의 hard authorization은 OAuth scope, MCP provider와 host policy가 소유합니다.

## Project-local evaluator 경계

`.codex/skills/evaluate-workbench/`는 `$workbench:brainstorm`과 `$workbench:executor`를 전제로 하는 legacy v2 evaluator입니다. 현재 다섯 스킬의 acceptance evidence가 아니며 별도 승인 없이 수정하지 않습니다.

## 검증 기준

- 활성 skill directory는 다섯 개뿐이어야 합니다.
- 각 skill은 자기 selector만 포함해야 합니다.
- 다른 Workbench skill, 단계 순서 또는 선행 producer를 요구하거나 추천하지 않아야 합니다.
- SKILL.md는 핵심 절차만 유지하고 상세 schema는 직접 연결된 reference에 둡니다.
- active tests와 CI는 `legacy/`를 runtime 또는 fixture로 사용하지 않아야 합니다.
- `.codex/`는 별도 승인 없이 수정하지 않습니다.
