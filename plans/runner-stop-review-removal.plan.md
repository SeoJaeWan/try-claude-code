---
plan_slug: runner-stop-review-removal
branch: refactor/runner-stop-review-removal
owner_agent: general-developer
---

# runner: stop-review 게이트 제거와 state machine 슬림화

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | 자동 Codex 리뷰 게이트(stop-review)는 dev-review와 중복이고 false-positive 비용이 더 크다. dev-review만을 단일 인적 게이트로 남기고, stop-review를 위해 무거워진 state machine 인프라(`status` enum, 전이 검증, schema versioning, mutator API, fixup CLI)를 함께 정리한다. plan-state.json 자체는 **dev-review skill의 깨끗한 `state_path` 인터페이스를 보존하기 위해 유지**하되, dev-review가 필요로 하는 최소 필드만 남긴다. |
| 포함 범위 | (1) Stop hook 등록·구현·관련 Codex 인프라 전체 제거, (2) `runner-state.mjs` 슬림화 (status enum / stop_review 블록 / schema_version / validateState walker / transition API 삭제, dev_review phase mutator만 남김), (3) `runner-state-machine.mjs` 흡수·삭제, (4) `runner-state-cli.mjs` 슬림화 (phase mutator + reset만), (5) `runner-state-fixup.mjs` 삭제, (6) UserPromptSubmit 훅에서 status 라우팅·terminal 거부 로직을 `.merged` 마커 기반으로 교체, (7) runner SKILL.md를 "status 라우팅" → "디스크 + dev_review.phase 추론"으로 개편, (8) runner references 정합 정리, (9) 테스트 정리. |
| 제외 범위 | dev-review skill 본체(SKILL.md, scripts, references), dev-review의 `state_path` 인자 인터페이스, `session-lifecycle-hook.mjs`, `plan-frontmatter.mjs`, `hook-input.mjs`, `sessions.mjs`, `plan-state.json`의 `base_branch` 필드(dev-review가 사용). `args.mjs`(dead code 정리)는 본 plan 범위 안. |
| 완료 기준 | (a) hooks.json에 Stop 훅 없음, (b) `rg "stop[_-]review\|STOP_REVIEW\|Codex" plugin/develop/scripts/` 결과가 lib/codex 잔재 0건, (c) state.json 스키마가 7개 필드(plan_slug, plan_path, owner_agent, task_branch, worktree_path, base_branch, dev_review) 이하, (d) dev-review skill을 한 줄도 수정하지 않음, (e) 모든 unit test가 통과하며 deprecated 케이스는 같이 제거됨. |

## 실행 소유권

| 항목 | 내용 |
| --- | --- |
| `owner_agent` | `general-developer` |
| 변경 경계 | `plugin/develop/hooks/hooks.json`, `plugin/develop/scripts/` 전반 (lib + entry + tests), `plugin/develop/prompts/`, `plugin/develop/skills/runner/SKILL.md`, `plugin/develop/skills/runner/references/`, `plugin/develop/skills/runner/evals/evals.json`, `docs/claude-code-workflow-evolution.md`, repository-level `README.md` (해당되는 경우), `package.json` (test script 정리) |
| 유지 경계 | `plugin/develop/skills/dev-review/` 전체, `plugin/develop/skills/runner/references/prompts/plan-dispatch.md` 및 `rework-dispatch.md` (rework은 stop-review와 무관), `plugin/develop/agents/`, `plugin/develop/skills/commit/`, `plugin/develop/skills/pr/`, plugin manifest 외 다른 skill들, `plugin/statusline/` (별개 플러그인) |
| 선행 조건 | 없음. 기존 `plans/runner-hook-cleanup.plan.md`와 `plans/runner-honor-system-cleanup.plan.md`는 이미 적용된 히스토리 아티팩트이므로 본 plan과 충돌하지 않음. |

## 현재 근거

| 근거 | 확인 내용 | plan에 반영한 결론 |
| --- | --- | --- |
| `plugin/develop/hooks/hooks.json:37-47` | `Stop` 이벤트 등록 — `stop-review-gate-hook.mjs`, timeout 960s | Phase 1에서 Stop 블록 삭제 |
| `plugin/develop/scripts/stop-review-gate-hook.mjs` | Stop 훅 본체. `codex.mjs`/`diagnostics.mjs`/`prompts.mjs`/`workspace.mjs`/`stop-review-outcome.mjs`/`runner-state.mjs` 7개 모듈 의존 | Phase 1에서 파일 삭제 |
| `plugin/develop/scripts/lib/codex.mjs`, `app-server.mjs`, `app-server-protocol.d.ts`, `process.mjs`, `stop-review-outcome.mjs`, `diagnostics.mjs`, `prompts.mjs`, `workspace.mjs` | grep 결과 모두 stop-review-gate-hook을 직접/간접 통해서만 import됨 (`lib/args.mjs`는 import 0건 — dead code) | Phase 1에서 8개 lib 파일 + dead args.mjs 일괄 삭제 |
| `plugin/develop/prompts/stop-review-gate.md` | Codex 리뷰 프롬프트 템플릿 | Phase 1에서 삭제. `prompts/` 디렉터리 빈 폴더는 git 추적 안 되므로 자연 정리 |
| `plugin/develop/scripts/lib/runner-state.mjs:147-170` (createInitialState) `:183-260` (validateState) `:363-440` (mutator API) | `schema_version`/`status`/`stop_review` 블록·필드, schema walker, `setStopReviewArmed/Phase`, `setLastReviewedCommit`, `recordPlanBlock`, `transitionStatus`, `assertExpectedStatus` 전부 stop-review와 status enum을 위해 존재 | Phase 2에서 createInitialState 단순화, validateState 제거, stop_review 관련 mutator 삭제. dev_review phase mutator(`setDevReviewPhase`, `setDevReviewFeedbackPath`)만 남김 |
| `plugin/develop/scripts/lib/runner-state-machine.mjs` (152 lines) | `STATUS` enum (5개) 중 `DISPATCHING`은 stop-review 전용, `STOP_REVIEW_PHASE` 전부 + `ALLOWED_STOP_REVIEW_PHASE_TRANSITIONS` 표 전부 stop-review 전용. status 자체를 runner skill이 안 읽으면 `ALLOWED_TRANSITIONS` 도 의미 없음 | Phase 2에서 파일 자체 삭제. 잔존 상수(`DEV_REVIEW_PHASE`, `DEV_REVIEW_PHASE_VALUES`)는 `runner-state.mjs` 안으로 흡수 |
| `plugin/develop/scripts/runner-state-cli.mjs:88-118` (USAGE) | 8개 subcommand 중 `arm-for-dispatch`, `record-stop-review-allow/downgrade/block`, `mark-approved`, `mark-merged` 5개는 status 전이/stop-review 전용. `begin-rework`, `rework-done`, `mark-qa-pending`, `qa-resolved`, `reset`만 dev-review용 | Phase 3에서 5개 stop-review/status subcommand 제거. 남는 4개 phase mutator + `reset`은 status enum 없이 동작하도록 단순화 |
| `plugin/develop/scripts/runner-state-fixup.mjs:12,53,72,149` | `--clear-armed`(stop-review)와 `--force-status`(status enum)가 주요 플래그. 두 기능 모두 본 plan에서 제거되는 개념 | Phase 3에서 파일 전체 삭제. 실제 복구 시나리오는 jq/hand-edit 가이드로 대체 |
| `plugin/develop/scripts/user-prompt-submit-hook.mjs:115-129` (detectBaseBranch) `:215-236` (fresh state 생성) | bootstrap 분기에서 `createInitialState` 호출, `detectBaseBranch`로 HEAD 캡처, `TERMINAL_STATUSES` 체크로 merged plan 거부 | Phase 4에서 `createInitialState` 시그니처 변경(축소된 필드만 받음), `TERMINAL_STATUSES` 체크 → `plans/{key}/.merged` 파일 존재 체크로 교체. `detectBaseBranch`는 유지(base_branch는 state에 남음) |
| `plugin/develop/skills/runner/SKILL.md:91-101` (Status routing 표) `:148-282` (Step 2-3 prose, stop-review BLOCK 재진입) `:283-332` (Step 4) `:333-369` (Step 5) | status enum 5개 기준 라우팅, `arm-for-dispatch`/Stop hook BLOCK 재진입 분기, `mark-approved`/`mark-merged` CLI 호출. 본 plan 적용 후 모두 의미 상실 또는 형태 변경 | Phase 5에서 Status routing 표 → "디스크 + dev_review.phase" 추론 표로 교체. Step 3 prose에서 arm-for-dispatch/BLOCK 재진입 단락 삭제, Step 4 CLI 호출 단순화, Step 5 `mark-merged` 대신 `touch .merged` |
| `plugin/develop/skills/runner/references/enforcement.md`, `dev-review-flow.md`, `plan-state-recovery.md`, `glossary.md`(미점검) | stop-review/dispatching/armed/blocked/arm-for-dispatch/block_history 다수 언급. `plan-state-recovery.md`는 stop_review.* 필드와 `--clear-armed` 레시피 포함 | Phase 5에서 4개 ref 정합 정리. `glossary.md`, `guardrails.md`는 grep 매치 0건이라 손댈 일 없음 (확인 후 skip) |
| `plugin/develop/skills/runner/evals/evals.json` | runner skill 평가용 픽스처. stop_review/status 시나리오 포함 추정 | Phase 5에서 stop-review 시나리오 제거, dev-review 중심 케이스만 남김 |
| `plugin/develop/scripts/__tests__/stop-review-gate-hook.test.mjs`, `record-stop-review.test.mjs` | stop-review 전용 테스트 | Phase 6에서 두 파일 삭제 |
| `plugin/develop/scripts/__tests__/runner-state.test.mjs`, `runner-state-cli.test.mjs`, `user-prompt-submit-hook.test.mjs` | status 전이/validateState 단언/`createInitialState` 호출에 stop_review 필드 포함하는 픽스처 다수 | Phase 6에서 status 관련 케이스 삭제, fixture를 슬림 스키마로 갱신 |
| `package.json` (test script) | `record-stop-review` 패턴 매치 (Phase 0의 grep 결과) | Phase 6에서 해당 test script 라인 정리 |
| `docs/claude-code-workflow-evolution.md` (repo root) | 워크플로 진화 문서에 stop-review 언급 (grep 매치) | Phase 5에서 정합 정리 |

## 기능 계약

| 계약 | 대상 경계 | input | output | negative/no-op | 소유권 | 검증 위치 |
| --- | --- | --- | --- | --- | --- | --- |
| 슬림 plan-state.json 스키마 | `lib/runner-state.mjs` | `createInitialState({planSlug, planPath, ownerAgent, baseBranch, taskBranch, worktreePath})` | 7개 필드 객체 (`plan_slug`, `plan_path`, `owner_agent`, `task_branch`, `worktree_path`, `base_branch`, `dev_review: {phase: null, last_feedback_path: null}`). schema_version / status / stop_review / session_id / created_at / updated_at 부재 | 필수 인자 누락 시 throw | runner-state.mjs | `__tests__/runner-state.test.mjs` 갱신 |
| dev_review phase mutator | `lib/runner-state.mjs` | `setDevReviewPhase(state, phase)` — phase는 `"awaiting"\|"rework"\|"qa"\|null` 하나 | mutated state (in-memory) | 알 수 없는 phase 값이면 throw | runner-state.mjs | `__tests__/runner-state.test.mjs` |
| dev-review CLI subcommand | `runner-state-cli.mjs` | 4개 subcommand만 지원: `begin-rework <state> <feedback>`, `rework-done <state>`, `mark-qa-pending <state>`, `qa-resolved <state>`, 그리고 `reset <state> --confirm` | stdout 빈 문자열, stderr는 변화 요약, exit 0; 인자 부족 시 exit 1 + USAGE 출력 | 알 수 없는 subcommand는 exit 1 + USAGE | runner-state-cli.mjs | `__tests__/runner-state-cli.test.mjs` |
| terminal 마커 | `user-prompt-submit-hook.mjs` + runner skill | `/runner <plan>` 시 hook은 `plans/{plan_key}/.merged` 존재 여부 체크 | 존재 시 `decision: block` + 한국어 안내, 부재 시 통상 bootstrap 흐름 | `.merged` 부재 시 통상 흐름 | hook + runner skill | `__tests__/user-prompt-submit-hook.test.mjs` |
| Stop 훅 부재 | `hooks/hooks.json` | turn 종료 | 자동 review 없음. plan-agent의 commit 결과는 runner skill이 같은 turn 안에서 dev-review로 진행 | n/a | hooks.json | 코드 변경 점검(`Stop` 키 부재) |
| 디스크 + phase 라우팅 | runner SKILL.md prose | bootstrap 진입 시점 | 다음 표로 Step 결정: <br>`dev_review.phase=null` + 워크트리 없음 → Step 2 <br>`null` + 워크트리 빈 상태 → Step 3 <br>`null` + 워크트리 커밋 있음 → Step 4 첫 진입 <br>`awaiting` + 워크트리 있음 → Step 4 재진입 (dev-review가 in_progress/submitted 판단) <br>`awaiting` + 워크트리 없음 → Step 5 미완 상태, 사용자에게 PR/later/abandon 재확인 <br>`rework` + 워크트리 있음 → dev-review 재호출 (새 HEAD가 패키지 재생성 트리거) <br>`qa` + 워크트리 있음 → 사용자에게 브라우저 reset 안내 후 turn 종료 | n/a | runner SKILL.md prose | manual 점검 + evals.json 시나리오 |

## 파일/폴더 구조 계약

| 경로 | 종류 | 상태 | 소유 phase | 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `plugin/develop/hooks/hooks.json` | `config` | `modify` | `P1` | `Stop` 키 블록 제거. `SessionStart`/`SessionEnd`/`UserPromptSubmit` 그대로 유지. | 위 근거 표 1번 항목. |
| `plugin/develop/scripts/stop-review-gate-hook.mjs` | `source` | `delete` | `P1` | Stop 훅 본체 — 더 이상 호출되지 않음. | 위 근거 표 2번 항목. |
| `plugin/develop/scripts/lib/codex.mjs` | `source` | `delete` | `P1` | stop-review만 사용. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/app-server.mjs` | `source` | `delete` | `P1` | codex.mjs만 사용. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/app-server-protocol.d.ts` | `source` | `delete` | `P1` | app-server.mjs/codex.mjs 타입 정의. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/process.mjs` | `source` | `delete` | `P1` | codex.mjs/app-server.mjs만 사용. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/stop-review-outcome.mjs` | `source` | `delete` | `P1` | codex.mjs와 hook만 사용. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/diagnostics.mjs` | `source` | `delete` | `P1` | `logStopHookEvent` 단일 export — hook만 호출. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/prompts.mjs` | `source` | `delete` | `P1` | `loadPromptTemplate`/`interpolateTemplate` — hook만 호출. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/workspace.mjs` | `source` | `delete` | `P1` | `resolveWorkspaceRoot` — hook만 호출. | 위 근거 표 3번 항목. |
| `plugin/develop/scripts/lib/args.mjs` | `source` | `delete` | `P1` | grep 결과 import 0건 — dead code. | 위 근거 표 3번 항목 끝. |
| `plugin/develop/prompts/stop-review-gate.md` | `docs` | `delete` | `P1` | Codex 리뷰 프롬프트 템플릿. | 위 근거 표 4번 항목. |
| `plugin/develop/scripts/lib/runner-state.mjs` | `source` | `modify` | `P2` | 90% 축소: createInitialState/loadState/saveState/setDevReviewPhase/setDevReviewFeedbackPath 5개 함수만. status enum/validateState walker/stop_review mutators/transitionStatus/assertExpectedStatus 모두 제거. `DEV_REVIEW_PHASE` 상수만 흡수해 inline. | 위 근거 표 5번·6번 항목. |
| `plugin/develop/scripts/lib/runner-state-machine.mjs` | `source` | `delete` | `P2` | 잔존 가치(`DEV_REVIEW_PHASE`) 흡수 후 파일 자체 삭제. | 위 근거 표 6번 항목. |
| `plugin/develop/scripts/runner-state-cli.mjs` | `source` | `modify` | `P3` | `begin-rework`, `rework-done`, `mark-qa-pending`, `qa-resolved`, `reset` 5개 subcommand만. status 검증 호출 모두 제거. | 위 근거 표 7번 항목. |
| `plugin/develop/scripts/runner-state-fixup.mjs` | `source` | `delete` | `P3` | `--clear-armed`(stop-review), `--force-status`(status enum) 모두 본 plan에서 제거됨. | 위 근거 표 8번 항목. |
| `plugin/develop/scripts/user-prompt-submit-hook.mjs` | `source` | `modify` | `P4` | (a) `createInitialState` 새 시그니처에 맞춰 호출 단순화, (b) `TERMINAL_STATUSES` 체크 제거 → `.merged` 마커 파일 체크로 교체, (c) status 관련 prose/주석 정리. `detectBaseBranch`는 유지. | 위 근거 표 9번 항목. |
| `plugin/develop/skills/runner/SKILL.md` | `docs` | `modify` | `P5` | (a) Status routing 표 → "디스크 + dev_review.phase" 추론 표, (b) Step 2 단순화 (status 전이 호출 제거), (c) Step 3에서 `arm-for-dispatch`/Stop hook/BLOCK 재진입 단락 전부 삭제 (foreground Agent 한 줄 호출 + 같은 turn 안에서 dev-review로 진행), (d) Step 4의 `mark-approved`/CLI 호출 단순화, (e) Step 5에서 `mark-merged` → `touch .merged` + `reset --confirm` 안내. | 위 근거 표 10번 항목. |
| `plugin/develop/skills/runner/references/enforcement.md` | `docs` | `modify` | `P5` | "Stop hook + dev-review browser UI" 게이트 항목 제거. CLI subcommand 카탈로그 축소된 목록으로 갱신. | 위 근거 표 11번 항목. |
| `plugin/develop/skills/runner/references/dev-review-flow.md` | `docs` | `modify` | `P5` | "Why the Step-3 deadlock matters" 섹션 제거, rework이 `arm-for-dispatch`를 호출하지 않는다는 단락 제거 (이제 arm-for-dispatch 자체가 없음). | 위 근거 표 11번 항목. |
| `plugin/develop/skills/runner/references/plan-state-recovery.md` | `docs` | `modify` | `P5` | `stop_review.*` 필드 행 제거, `--clear-armed`/`--force-status` 레시피 제거, status 흐름 다이어그램에서 `dispatching` 제거, 슬림 스키마 기준으로 jq hand-edit 예시 갱신. | 위 근거 표 11번 항목. |
| `plugin/develop/skills/runner/references/glossary.md` | `docs` | `keep` | `P5` | grep 매치 0건 — stop-review 용어 미수록. | 검증된 사실. |
| `plugin/develop/skills/runner/references/guardrails.md` | `docs` | `keep` | `P5` | grep 매치 0건. | 검증된 사실. |
| `plugin/develop/skills/runner/evals/evals.json` | `data` | `modify` | `P5` | stop-review 시나리오 제거, 디스크 + phase 라우팅 시나리오로 갱신. | 위 근거 표 12번 항목. |
| `docs/claude-code-workflow-evolution.md` | `docs` | `modify` | `P5` | stop-review 언급 정리. | 위 근거 표 13번 항목. |
| `plugin/develop/scripts/__tests__/stop-review-gate-hook.test.mjs` | `test` | `delete` | `P6` | 대상 hook이 사라짐. | 위 근거 표 14번 항목. |
| `plugin/develop/scripts/__tests__/record-stop-review.test.mjs` | `test` | `delete` | `P6` | 대상 CLI subcommand가 사라짐. | 위 근거 표 14번 항목. |
| `plugin/develop/scripts/__tests__/runner-state.test.mjs` | `test` | `modify` | `P6` | status 전이/validateState 단언 케이스 삭제. `createInitialState` 픽스처를 슬림 스키마로 갱신. dev_review phase mutator 케이스는 유지·확장. | 위 근거 표 15번 항목. |
| `plugin/develop/scripts/__tests__/runner-state-cli.test.mjs` | `test` | `modify` | `P6` | 사라진 subcommand 테스트 삭제. 남는 5개 subcommand는 status 가드 없이 동작하므로 케이스 단순화. | 위 근거 표 15번 항목. |
| `plugin/develop/scripts/__tests__/user-prompt-submit-hook.test.mjs` | `test` | `modify` | `P6` | `.merged` 마커 거부 케이스 추가. status/createInitialState 픽스처 슬림 스키마로 갱신. | 위 근거 표 15번 항목. |
| `package.json` | `config` | `modify` | `P6` | `record-stop-review` 패턴이 들어간 test script 라인 정리. | 위 근거 표 16번 항목. |

## 체험 산출물

| id | phase | kind | 경로 | 목적 | 검토 포인트 |
| --- | --- | --- | --- | --- | --- |
| 없음 | — | — | — | hook/lib/skill prose 변경이라 UI projection 불필요. dev-review 브라우저 UI는 본 plan에서 손대지 않음. | — |

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | Stop 훅 + Codex 인프라 일괄 제거 | hooks.json Stop 블록 삭제, `stop-review-gate-hook.mjs` 삭제, `lib/`의 codex/app-server/process/stop-review-outcome/diagnostics/prompts/workspace/args 8개 + `app-server-protocol.d.ts` 삭제, `prompts/stop-review-gate.md` 삭제 | hooks.json에 Stop 키 없음, `rg "codex\|stop-review" plugin/develop/scripts/lib/` 매치 0건, 해당 11개 파일 부재 | `node --test plugin/develop/scripts/__tests__/*.test.mjs` — Phase 1 단계에서는 일부 테스트가 깨질 수 있음(Phase 6에서 정리). 빌드/lint만 통과해도 OK | `refactor(develop): remove stop-review hook and Codex infrastructure` |
| Phase 2 | state machine 슬림화 | `runner-state.mjs` 축소(7-필드 스키마, dev_review phase mutator만), `runner-state-machine.mjs` 흡수·삭제. `STATUS` enum / `STOP_REVIEW_PHASE` / `ALLOWED_TRANSITIONS` / validateState walker / `setStopReviewArmed`/`setStopReviewPhase`/`setLastReviewedCommit`/`recordPlanBlock`/`transitionStatus`/`assertExpectedStatus` 모두 제거. `DEV_REVIEW_PHASE` 상수는 인라인 흡수 | `rg "STATUS\|STOP_REVIEW_PHASE\|ALLOWED_TRANSITIONS\|validateState\|stop_review" plugin/develop/scripts/lib/` 매치 0건, `runner-state-machine.mjs` 부재 | runner-state 헬퍼 사용처(`runner-state-cli.mjs`, `user-prompt-submit-hook.mjs`)에서 import가 깨지지 않음 — 다음 phase에서 본격 정리하므로 일단 동작만 통과 | `refactor(develop): slim runner-state.mjs to the dev-review essentials` |
| Phase 3 | CLI 슬림화 + fixup 도구 삭제 | `runner-state-cli.mjs`에서 `arm-for-dispatch`/`record-stop-review-allow`/`record-stop-review-downgrade`/`record-stop-review-block`/`mark-approved`/`mark-merged` 6개 subcommand + 헬퍼 제거. 남는 5개(`begin-rework`/`rework-done`/`mark-qa-pending`/`qa-resolved`/`reset`)는 status 가드 없이 phase 직접 변경. `runner-state-fixup.mjs` 파일 삭제 | `node plugin/develop/scripts/runner-state-cli.mjs` USAGE에 5개 subcommand만 나옴, `runner-state-fixup.mjs` 부재 | 슬림 CLI가 dev-review phase 변경을 정상 수행 (수동 시나리오 — Phase 6 테스트에서 보강) | `refactor(develop): trim runner-state-cli to dev-review phase mutators` |
| Phase 4 | UserPromptSubmit 훅 갱신 | `createInitialState` 호출을 새 시그니처에 맞춰 단순화 (`session_id` 인자 제거). `TERMINAL_STATUSES` import·체크 제거 → `plans/{plan_key}/.merged` 파일 존재 체크로 교체. `.merged` 존재 시 `decision: block` + 한국어 안내. `detectBaseBranch`는 그대로 유지 | hook이 `.merged` 있는 plan에 대해 `decision: block`을 emit, 없는 plan은 bootstrap context 정상 주입 | `node --test plugin/develop/scripts/__tests__/user-prompt-submit-hook.test.mjs` — Phase 6 갱신 전이라 일부 케이스 fail 가능. import 정합만 확인 | `refactor(develop): switch terminal check to .merged marker file` |
| Phase 5 | runner skill 문서 정합 정리 | SKILL.md: Status routing 표 → 디스크 + phase 추론 표 (위 기능 계약 표 참조), Step 2 단순화, Step 3에서 arm-for-dispatch/Stop hook/BLOCK 재진입 단락 삭제 (plan agent dispatch 후 같은 turn 안에서 dev-review로 진행), Step 4 CLI 호출 단순화, Step 5에서 `mark-merged` 대신 `touch plans/{plan_key}/.merged` + `reset --confirm` 안내. references/enforcement.md, dev-review-flow.md, plan-state-recovery.md 모두 정합 정리. evals.json stop-review 시나리오 제거. docs/claude-code-workflow-evolution.md 정합 | `rg "stop[_-]review\|STOP_REVIEW\|arm-for-dispatch\|dispatching\|stop_review" plugin/develop/skills/runner/` 매치 0건, `rg "stop-review" docs/` 0건, SKILL.md prose가 새 흐름과 일관 | manual 점검: SKILL.md 한 번 통독 + grep 자동 검증 | `docs(develop): align runner skill with single-gate dev-review flow` |
| Phase 6 | 테스트 정리 + 일관성 검증 | `__tests__/stop-review-gate-hook.test.mjs`·`record-stop-review.test.mjs` 삭제. `runner-state.test.mjs`/`runner-state-cli.test.mjs`/`user-prompt-submit-hook.test.mjs` 픽스처를 슬림 스키마로 갱신, status/stop_review 단언 제거, `.merged` 마커 거부 케이스 추가. `package.json`의 test script 라인 정리 | 모든 test green, 전체 코드베이스에서 `stop_review\|STOP_REVIEW\|stop-review\|stopReview\|arm-for-dispatch\|dispatching` grep 매치가 의도된 위치(`evals.json` 히스토리 ID 등) 외 0건 | `node --test plugin/develop/scripts/__tests__/*.test.mjs` 전부 통과, `rg -i "stop[_-]review\|arm-for-dispatch\|dispatching" plugin/ docs/` 결과를 사람이 한 번 확인 | `test(develop): refresh runner state fixtures and drop stop-review tests` |

## 검증

| 검증 항목 | 검증 단위 | 확인 수단 | 기대 결과 |
| --- | --- | --- | --- |
| Stop 훅 부재 | command | `cat plugin/develop/hooks/hooks.json` | `Stop` 키 부재 |
| stop-review 잔재 0건 (코드) | command | `rg -i "stop[_-]review\|STOP_REVIEW\|arm-for-dispatch" plugin/develop/scripts/ plugin/develop/hooks/` | 빈 결과 (테스트 픽스처/주석 포함해서도 0건) |
| stop-review 잔재 0건 (문서) | command | `rg -i "stop[_-]review\|arm-for-dispatch\|dispatching" plugin/develop/skills/runner/ docs/` | 의도된 historical reference(evals.json round ID 등) 외 0건 |
| 슬림 state.json 스키마 | unit | `__tests__/runner-state.test.mjs`의 createInitialState 케이스 | 7개 필드만 존재, schema_version/status/stop_review 부재 |
| dev_review phase mutator | unit | `__tests__/runner-state.test.mjs` | `setDevReviewPhase("rework"/"qa"/"awaiting"/null)` 가 정상 동작 |
| CLI subcommand 5개 | unit | `__tests__/runner-state-cli.test.mjs` | `begin-rework`/`rework-done`/`mark-qa-pending`/`qa-resolved`/`reset` 만 USAGE에 노출, 나머지는 exit 1 |
| `.merged` 마커 거부 | unit | `__tests__/user-prompt-submit-hook.test.mjs` | `plans/{key}/.merged` 존재 시 `decision: block` + 한국어 안내 |
| dev-review skill 무수정 | command | `git diff main -- plugin/develop/skills/dev-review/` | 빈 결과 |
| 삭제 파일 부재 | command | `ls plugin/develop/scripts/lib/codex.mjs plugin/develop/scripts/stop-review-gate-hook.mjs 2>/dev/null` | 둘 다 부재 |
| 전체 테스트 통과 | command | `node --test plugin/develop/scripts/__tests__/*.test.mjs` | 모두 green |

## 리스크 / 주의점

| 리스크 | failure/validation | 대응 |
| --- | --- | --- |
| 기존 활성 plan-state.json이 v2 schema(status, stop_review 필드 포함)로 디스크에 남아있을 때 새 hook이 파싱 실패 | `tryLoadState`가 슬림 스키마 위에서 throw → bootstrap이 fresh로 처리되거나 hook이 hard fail | UserPromptSubmit hook에서 파싱 실패를 잡아 한국어 안내(`이전 schema의 plan-state입니다. <state-path>를 삭제하고 /runner를 다시 실행해주세요.`) emit. validateState 없는 환경에서도 이 케이스만 명시적으로 감지. |
| runner skill prose의 디스크 + phase 추론 표를 LLM이 일관되게 따르지 못함 | 잘못된 Step 진입 시 dev-review가 빈 데이터로 호출되거나 워크트리 중복 생성 | SKILL.md의 표를 최상단에 두고, 각 Step 진입부에 "이 Step에 들어왔다는 것은 ... 이라는 뜻이다" 한 줄 가드 prose 추가. evals.json에 디스크 조합별 시나리오 픽스처. |
| dev-review skill이 `state.status`/`state.stop_review` 같은 부재 필드를 읽어 NPE | dev-review가 부재 필드를 참조하면 그 호출 자체가 첫 호출에서 깨짐 | 위 변경 경계 표대로 dev-review skill은 본 plan에서 한 줄도 안 건드림 → 사실상 위험 0. 본 plan 적용 후 `git diff main -- plugin/develop/skills/dev-review/`로 검증. |
| `reset --confirm` subcommand가 status 가드 없이 항상 동작하게 되어 사용자가 활성 plan을 실수로 날림 | reset이 활성 worktree를 가진 plan에서도 state 삭제 | reset 안에서 worktree presence 체크: 워크트리가 존재하면 `confirm:overwrite` 같은 두 번째 플래그를 요구 (Phase 3에서 구현). 또는 prose에서 명시적으로 "reset은 머지/포기 시에만" 안내. |
| Phase 1~4 동안 코드는 깨진 상태로 commit됨 (예: Phase 1 후 hook이 runner-state-cli의 사라진 함수를 호출 시도) | 중간 commit checkout 시 hook이 throw | 각 phase commit은 build/lint는 통과해야 하지만 test는 Phase 6에서 정리. plan-dispatch.md prompt가 phase별 commit을 강제하므로 사용자가 중간 commit을 직접 checkout하는 시나리오는 제한적. 위험 작음. |
| `args.mjs`가 실제로는 다른 곳에서 dynamic import로 사용되고 있음 | Phase 1 후 런타임에 모듈 미발견 | Phase 1 시작 전 `rg "args.mjs\|require.*args\|import.*args" --type js --type mjs` 전수 확인. grep 결과 0건임을 확인했으므로 dynamic import 가능성은 매우 낮음. 발견 시 plan 중지. |

## 검토 체크리스트

- [ ] YAML frontmatter에 `plan_slug`, `branch`, `owner_agent` 가 있다.
- [ ] `owner_agent`가 `plugin/develop/agents/general-developer.md` 로 존재한다.
- [ ] 이 plan 파일 하나만 읽어도 실행 의미가 닫힌다 (다른 plan 참조 없음).
- [ ] 포함 범위와 제외 범위가 사용자 요청과 추적 가능하다 (dev-review skill·base_branch 필드는 명시적으로 제외).
- [ ] 변경 경계와 유지 경계가 분명하다 — 특히 `plugin/develop/skills/dev-review/`는 한 줄도 안 건드림이 명시되어 있다.
- [ ] 6개 phase 각각의 완료 신호와 커밋 경계가 한 줄로 식별 가능하다.
- [ ] 한국어 prose 안에 영어 코드 표기(파일명·CLI 명령·status enum)만 영어로 유지한다.
- [ ] dev_review.phase 값 4종(`awaiting`/`rework`/`qa`/`null`)이 일관되게 사용된다.
- [ ] `.merged` 마커 파일의 위치(`plans/{plan_key}/.merged`)가 한 곳에 통일 정의되어 있다.
- [ ] 슬림 state.json 스키마의 7개 필드 목록이 한 곳(기능 계약 첫 행)에 명시되어 있다.
- [ ] 검증은 unit test와 grep 자동 검증, manual 통독으로 분리되어 관찰 가능하다.

## 운영 노트

- 본 plan 적용 후 사용자 디스크에 v2 schema의 활성 plan-state.json이 남아있을 수 있다. UserPromptSubmit 훅의 파싱 실패 분기에서 한국어 안내로 "<state-path>를 삭제 후 /runner 재실행"을 emit하므로 사용자가 인지 가능. 무관한 plan은 자연 정리됨.
- `.codex/reviews/` 디렉터리 잔재가 있어도 본 plan은 손대지 않음 (이전 `runner-hook-cleanup` 결과). 사용자가 신경 쓰이면 수동 정리.
- Phase 5의 SKILL.md 개편이 가장 prose-heavy 한 작업이라 단일 sub-agent dispatch 안에서 분량이 클 수 있음. 한 phase 내에서 references 4개 파일 + SKILL.md를 한 commit으로 묶는 것은 의도된 설계 — 정합성이 한 곳에서 검증됨.
- 본 plan 적용 후 plugin manifest의 version bump (예: 2.13.x → 2.14.0)는 plan 범위 밖. 사용자가 적절한 시점에 별도 commit으로.
