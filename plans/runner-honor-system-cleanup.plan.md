---
plan_slug: runner-honor-system-cleanup
branch: refactor/runner-honor-system
owner_agent: general-developer
---

# runner skill의 honor-system 표면적 축소와 hook 정확성 개선

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | runner 플로우의 honor system을 줄이고, prose 모순·silent hang·다중 plan 혼선·timeout 마진·PR 인계·cleanup·downgrade telemetry를 정리한다. base_branch 가드(4번)와 worktree 검증 강화(7번)는 제외. |
| 포함 범위 | (1) `runner-state-cli.mjs` 신설로 모든 status 전이 단일 명령화, (2) SKILL.md prose 모순/round 의미/rework 우회 사유 정리, (3) Stop hook이 `STOP_REVIEW_BLOCKED + 같은 HEAD` 케이스를 systemMessage로 surface, (4) hooks.json Stop timeout 900→960, (5) UserPromptSubmit hook이 한 세션에 다른 active plan 있으면 reject, (6) Step 5에 `/pr` 핸드오프와 `reset` cleanup 가이드, (7) ALLOW_DOWNGRADED telemetry + 연속 다운그레이드 경고. |
| 제외 범위 | base_branch 자동감지 가드(4번), `worktree_exists_on_disk` 의미 강화(7번), `block_history` cap 조정(9-c). 사용자가 보류 결정. |
| 완료 기준 | 검토 체크리스트의 7개 검증 항목이 모두 충족되고, 기존 plan-state(schema_version=1) 호환이 유지되며, 새 unit test가 통과한다. |

## 실행 소유권

| 항목 | 내용 |
| --- | --- |
| `owner_agent` | `general-developer` |
| 변경 경계 | `claude-plugin/develop/scripts/`, `claude-plugin/develop/skills/runner/SKILL.md`, `claude-plugin/develop/hooks/hooks.json`, 신규 `__tests__/runner-state-cli.test.mjs` |
| 유지 경계 | `runner-state-machine.mjs`(전이 테이블·schema_version), `runner-state.mjs` helpers(재사용만), 다른 skill(`dev-review`, `pr`, `commit` 등) 본체, `lib/codex.mjs`/`app-server.mjs` |
| 선행 조건 | none |

## 현재 근거

| 근거 | 확인 내용 | plan에 반영한 결론 |
| --- | --- | --- |
| `claude-plugin/develop/skills/runner/SKILL.md:39-67` | "honor system" + `assertExpectedStatus` 권장이 prose에만 존재 | Phase 1에서 CLI로 묶고 Phase 2에서 권장 문구 삭제 |
| `claude-plugin/develop/skills/runner/SKILL.md:220-224` | Step 2 끝에서 transitionStatus 부르라는 절과 "여기서 하지 마라"는 괄호가 공존 | Phase 2에서 단일 문장으로 교체 (전이는 Step 3 책임) |
| `claude-plugin/develop/scripts/stop-review-gate-hook.mjs:609-611` | `reviewItems`가 비면 무조건 silent return | Phase 3-A에서 `STOP_REVIEW_BLOCKED + 같은 HEAD` 케이스만 systemMessage 발생 |
| `claude-plugin/develop/hooks/hooks.json:42` + `stop-review-gate-hook.mjs:64` | hook timeout 900s = internal `STOP_REVIEW_TIMEOUT_MS` 900s, 마진 0 | Phase 3-B에서 hook 측을 960s로 |
| `claude-plugin/develop/scripts/user-prompt-submit-hook.mjs:276-288` | 다른 plan과의 충돌은 worktree path 일치만 검사, status가 active인 다른 plan은 통과 | Phase 3-C에서 active plan 존재 시 reject |
| `claude-plugin/develop/skills/runner/SKILL.md:416-443` | Step 5에 `/pr` 호출 핸드오프와 merged 후 cleanup 가이드 부재 | Phase 4-A·4-B에서 prose 추가 + CLI `reset` 명령 노출 |
| `claude-plugin/develop/scripts/stop-review-gate-hook.mjs:415-422` | ALLOW_DOWNGRADED는 outcome 분류만 있고 누적 추적·경고 없음 | Phase 4-C에서 plan-state에 `consecutive_downgrades` 누적 + 임계 시 경고 |

## 기능 계약

| 계약 | 대상 경계 | input | output | negative/no-op | 소유권 | 검증 위치 |
| --- | --- | --- | --- | --- | --- | --- |
| 단일 status 전이 명령 | `scripts/runner-state-cli.mjs` | subcommand(`arm-for-dispatch`/`begin-rework`/`rework-done`/`mark-qa-pending`/`qa-resolved`/`mark-approved`/`mark-merged`/`reset`) + state path + 옵션 인자 | stdout: 새 status, stderr: 변화 요약, exit 0; 실패 시 exit 1 + stderr에 현재 status와 사유 | 잘못된 전이/잘못된 status에서 진입 시 saveState 안 함, plan-state 보존 | `runner-state-cli.mjs`가 `lib/runner-state.mjs` helper 호출만 함 | `__tests__/runner-state-cli.test.mjs` 신규 |
| BLOCK 정체 surface | `scripts/stop-review-gate-hook.mjs` | armed plan 중 status `STOP_REVIEW_BLOCKED` + headSha === last_reviewed_commit | systemMessage("BLOCK 상태 유지, 새 커밋 없음" + last block excerpt) | status가 `AWAITING_STOP_REVIEW`인 armed plan만 있고 새 커밋 없음 → silent return (지금 동작 유지) | hook | `__tests__/stop-review-gate-hook.test.mjs`에 시나리오 추가 |
| 단일 active plan 보장 | `scripts/user-prompt-submit-hook.mjs` | `/runner <new-plan>` 호출 시 sessionId의 active plan 목록 | 다른 statePath의 non-terminal plan 존재 시 `decision: block` + slug/status/path 안내 | 같은 statePath 재호출(resume)은 통과 | hook | `__tests__/user-prompt-submit-hook.test.mjs`에 시나리오 추가 |
| Stop hook timeout 마진 | `hooks/hooks.json` | hook 외부 timeout 값 | 960초 (internal 900s + 60s 여유) | internal 시간(`STOP_REVIEW_TIMEOUT_MS`)은 900s 그대로 | hooks.json | 코드 변경만 — 테스트 없음 |
| ALLOW_DOWNGRADED 누적 경고 | `scripts/stop-review-gate-hook.mjs` + plan-state | outcome=ALLOW_DOWNGRADED 시 `state.stop_review.consecutive_downgrades += 1` | 임계(3) 도달 시 systemMessage에 경고 한 단락 추가 | ALLOW/BLOCK/TIMEOUT은 카운트 0으로 리셋 | hook | `__tests__/stop-review-gate-hook.test.mjs`에 시나리오 추가 |
| `merged` 후 reset | `runner-state-cli.mjs reset` | `<state-path> --confirm`, status === MERGED만 허용 | plan dir의 `.runner-state.json`/`feedback*.json` 삭제 | `--confirm` 누락 시 dry-run 출력만, 다른 status에서는 exit 1 | CLI | `__tests__/runner-state-cli.test.mjs`에 시나리오 추가 |

## 파일/폴더 구조 계약

| 경로 | 종류 | 상태 | 소유 phase | 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `claude-plugin/develop/scripts/runner-state-cli.mjs` | `source` | `create` | `P1` | 모든 status 전이 명령의 단일 진입점. 내부적으로 `lib/runner-state.mjs` helpers만 호출. | 현재 inline node -e가 SKILL prose에 흩어져 있음 — 한 파일로 모은다. |
| `claude-plugin/develop/scripts/__tests__/runner-state-cli.test.mjs` | `test` | `create` | `P1` | 8개 subcommand 각각 정상/실패/잘못된 status 케이스. | `runner-state.mjs` 테스트와 같은 스타일. |
| `claude-plugin/develop/skills/runner/SKILL.md` | `docs` | `modify` | `P2` | inline node -e 호출을 CLI 호출로 일괄 교체, Step 2 자기모순 제거, round 의미·rework 우회 사유 명시. | prose만 손댐, frontmatter·glossary·routing 표 형태 유지. |
| `claude-plugin/develop/scripts/stop-review-gate-hook.mjs` | `source` | `modify` | `P3` | (a) `STOP_REVIEW_BLOCKED + 같은 HEAD`에서 systemMessage 발생, (b) ALLOW_DOWNGRADED 카운트와 임계 경고. | `:609-611` silent return 분기·`applyVerdictToPlanState` ALLOW 분기. |
| `claude-plugin/develop/scripts/user-prompt-submit-hook.mjs` | `source` | `modify` | `P3` | active plan 존재 시 reject (resume 제외). | `:276-288` 충돌 검사 직후에 추가. |
| `claude-plugin/develop/hooks/hooks.json` | `config` | `modify` | `P3` | Stop hook timeout 900→960. | hook 외부/내부 timeout 마진. |
| `claude-plugin/develop/scripts/__tests__/stop-review-gate-hook.test.mjs` | `test` | `modify` | `P3` | 두 신규 시나리오(BLOCK 정체, 연속 downgrade) 추가. | 기존 테스트 파일 컨벤션 준수. |
| `claude-plugin/develop/scripts/__tests__/user-prompt-submit-hook.test.mjs` | `test` | `modify` | `P3` | active plan 거부 시나리오 추가. | 기존 테스트 파일 컨벤션 준수. |
| `claude-plugin/develop/scripts/lib/runner-state.mjs` | `source` | `modify` | `P4` | `consecutive_downgrades` 필드 추가 helper(`bumpConsecutiveDowngrades`, `clearConsecutiveDowngrades`). 기존 plan에 필드 없으면 0으로 취급(backward-compatible). | schema_version은 1 그대로. validateState는 기존 필드만 강제. |

## 체험 산출물

| id | phase | kind | 경로 | 목적 | 검토 포인트 |
| --- | --- | --- | --- | --- | --- |
| 없음 | — | — | — | runner는 CLI/hook/prose 변경이라 UI projection 불필요 | — |

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | `runner-state-cli.mjs` 신설로 honor system 표면적 축소 | 신규 CLI 파일(8 subcommand: arm-for-dispatch, begin-rework, rework-done, mark-qa-pending, qa-resolved, mark-approved, mark-merged, reset) + unit test | `node scripts/runner-state-cli.mjs <cmd>` 8개가 모두 정상/실패 케이스에서 의도대로 동작, test green | `node --test scripts/__tests__/runner-state-cli.test.mjs` | `feat(develop): add runner-state-cli for atomic state transitions` |
| Phase 2 | SKILL.md prose 정합 — CLI 호출로 일괄 교체, Step 2 자기모순/round/rework 우회 정리 | Step 2~5의 inline node -e를 CLI 호출로 교체, `assertExpectedStatus` 권장 문구 삭제, Step 4 round 의미 표 추가, Step 4 rework 섹션에 stop-review 우회 사유 한 단락, Step 5에 `/pr` 핸드오프 + `reset` 안내 | SKILL.md 안에 `node -e` 패턴이 0회, CLI 호출만 남음 | `grep -n "node -e\|--input-type=module" claude-plugin/develop/skills/runner/SKILL.md` 빈 결과 | `docs(develop): consolidate runner state transitions through CLI` |
| Phase 3 | Stop hook + UserPromptSubmit hook + hooks.json: BLOCK 정체 surface, timeout 마진, 단일 active plan 보장 | `stop-review-gate-hook.mjs`에서 빈 reviewItems 분기를 status별로 분기, `user-prompt-submit-hook.mjs`에 다중 active plan reject, `hooks.json` Stop timeout 960, 두 hook test에 시나리오 추가 | 두 hook test가 신규 케이스 포함하여 모두 green, hooks.json timeout=960 | `node --test scripts/__tests__/stop-review-gate-hook.test.mjs scripts/__tests__/user-prompt-submit-hook.test.mjs` | `fix(develop): surface stop-review hangs and reject overlapping plans` |
| Phase 4 | `consecutive_downgrades` telemetry + plan-state 필드 추가, ALLOW_DOWNGRADED 임계 경고 | `lib/runner-state.mjs`에 helper 2개, `stop-review-gate-hook.mjs`에서 outcome별 카운트 갱신·경고, test 시나리오 추가 | 연속 3회 ALLOW_DOWNGRADED 후 systemMessage에 경고 단락 포함 | `node --test scripts/__tests__/stop-review-gate-hook.test.mjs` | `feat(develop): warn on consecutive low-confidence downgrades` |

## 검증

| 검증 항목 | 검증 단위 | 확인 수단 | 기대 결과 |
| --- | --- | --- | --- |
| CLI 8개 subcommand 동작 | unit | `node --test scripts/__tests__/runner-state-cli.test.mjs` | 모든 케이스 green |
| SKILL.md에 inline node 0개 | command | `grep -nE "node -e\|--input-type=module" claude-plugin/develop/skills/runner/SKILL.md` | 빈 결과 |
| Step 2 자기모순 제거 | manual | `SKILL.md:Step 2` 마지막 단락에 transitionStatus 호출이 없는지 prose 점검 | 단일 문장으로 정리됨 |
| BLOCK 정체 systemMessage | unit | `__tests__/stop-review-gate-hook.test.mjs`에 STOP_REVIEW_BLOCKED + 같은 HEAD 케이스 | systemMessage 발생, status 미변경 |
| 다중 active plan reject | unit | `__tests__/user-prompt-submit-hook.test.mjs`에 다른 statePath active 케이스 | `decision: block` + 안내 메시지 |
| hook timeout 마진 | command | `cat claude-plugin/develop/hooks/hooks.json` | Stop hook timeout=960 |
| `/pr` 핸드오프 + reset 가이드 | manual | `SKILL.md:Step 5` 본문 점검 | "/pr" invocation 명시, "reset" 명령 명시 |
| ALLOW_DOWNGRADED 누적 경고 | unit | `__tests__/stop-review-gate-hook.test.mjs`에 연속 3회 시나리오 | systemMessage에 경고 단락 포함, 카운트는 ALLOW/BLOCK에서 리셋 |

## 리스크 / 주의점

| 리스크 | failure/validation | 대응 |
| --- | --- | --- |
| 기존 plan-state(schema_version=1)에 `consecutive_downgrades` 필드가 없어 NaN/undefined 취급 | unit test에서 기존 plan-state 픽스처 로드 후 카운트 0으로 시작하는지 확인 | helper는 `state.stop_review.consecutive_downgrades ?? 0`으로 읽고, validateState는 필드 미강제 |
| CLI가 `lib/runner-state.mjs`를 그대로 import하면서 부수효과 발생 | CLI 호출 시 stderr/stdout만 출력, 다른 파일 쓰기 없음 | CLI는 명시된 state path만 saveState, 나머지 로깅 X |
| SKILL.md 일괄 치환 중 inline node -e가 일부 남으면 honor system 부분 잔존 | grep 검증 단계에서 0건 확인 | Phase 2 끝에 grep 검증을 명시적으로 실행 |
| Stop hook 변경이 기존 silent return 의도(정상 케이스)까지 깨면 모든 턴에서 systemMessage 출력 | test의 "AWAITING_STOP_REVIEW + 새 커밋 없음" 케이스가 systemMessage 없이 통과해야 함 | 분기는 status === STOP_REVIEW_BLOCKED일 때만 |
| UserPromptSubmit의 다중 active plan reject가 정상 resume(같은 statePath)을 막으면 모든 resume이 깨짐 | test에 resume 케이스 통과 확인 | reject 조건은 `ptr !== currentStatePath && state가 non-terminal` |
| hooks.json timeout 960초가 Claude Code 최대 timeout 한도를 넘으면 거부 | 변경 후 실제 hook 한 번 발화 확인 | Claude Code Stop hook 한도는 분 단위(현 900 통과 중) — 960 안전 |

## 검토 체크리스트

- [ ] YAML frontmatter에 `plan_slug`, `branch`, `owner_agent`가 있다.
- [ ] `owner_agent`가 `claude-plugin/develop/agents/general-developer.md`로 존재한다.
- [ ] 이 plan 파일 하나만 읽어도 실행 의미가 닫힌다.
- [ ] 포함 범위와 제외 범위가 사용자 요청과 추적 가능하다 (4번·7번·9-c는 명시적으로 제외).
- [ ] 다른 plan, shared contract, 단계 상세 문서를 필수 읽기 대상으로 만들지 않았다.
- [ ] 사람이 읽는 문장은 한국어, 코드 표기(파일명·CLI 명령·status enum)만 영어로 유지한다.
- [ ] 기능 계약에 영향받는 공개 경계, input, output, no-op 규칙, 검증 위치가 보인다.
- [ ] 변경 경계(`scripts/`, `SKILL.md`, `hooks.json`)와 유지 경계(`runner-state-machine.mjs`, 다른 skill)가 명시되어 있다.
- [ ] 4개 phase 각각의 완료 신호와 커밋 경계가 한 줄로 식별 가능하다.
- [ ] 검증은 unit test와 prose grep, manual 점검으로 분리되어 관찰 가능하다.
