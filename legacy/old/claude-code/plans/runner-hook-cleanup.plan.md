---
plan_slug: runner-hook-cleanup
branch: refactor/runner-hook-cleanup
owner_agent: general-developer
---

# runner + hook 플로우 단순화 — 잉여 제거와 책임 재배치

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | 현재 runner와 hook의 동작이 본업 대비 너무 크다. 각 컴포넌트의 목적을 기준으로 본업 외 잉여를 제거하고, Codex 운영 로직 같은 잘못된 layer에 들어가 있는 코드를 올바른 layer로 옮긴다. 단순한 LOC 축소가 아니라 사이드이펙트와 책임 누수를 정리하는 것이 핵심이다. |
| 포함 범위 | (1) 디버그/legacy 정리, (2) `/codex:*` 인프라 제거 (사용자 미사용 확인), (3) Stop hook의 Codex 운영 로직을 `lib/codex.mjs`로 흡수, (4) Stop-review verdict 적용을 `runner-state-cli` 서브커맨드로 이전 (사이드이펙트 단일 진입점 회복), (5) script 압축 (`runner-state-cli` 테이블화 + `runner-state-fixup` 핵심만 남김), (6) prose 문서 일관성 갱신. |
| 제외 범위 | dev-review skill, PreToolUse target-location rule 자체 (직전 refactor에서 정리됨), broker/app-server protocol 구현부. PreToolUse hint 메시지 축약은 선택. |
| 완료 기준 | (a) 5개 결함 매핑 표의 모든 cleanup이 적용되고 (b) Stop hook이 본업만 남으며 (Codex 호출 + verdict CLI 호출 + emit) (c) 모든 plan-state mutation이 `runner-state-cli` 경유로 이루어지고 (d) 기존 unit test가 통과하며 새 동작은 회귀 테스트로 보호된다. |

## 실행 소유권

| 항목 | 내용 |
| --- | --- |
| `owner_agent` | `general-developer` |
| 변경 경계 | `claude-plugin/develop/scripts/`, `claude-plugin/develop/scripts/lib/`, `claude-plugin/develop/hooks/hooks.json`, `claude-plugin/develop/skills/runner/SKILL.md`, `claude-plugin/develop/skills/runner/references/`, `claude-plugin/develop/scripts/__tests__/`, `.gitignore` (`.codex/reviews/` 항목) |
| 유지 경계 | `claude-plugin/develop/skills/dev-review/`, `claude-plugin/develop/agents/`, plugin manifest, `claude-plugin/statusline/` (별개 플러그인), `lib/app-server.mjs`/`broker-lifecycle.mjs`/`broker-endpoint.mjs` (외부 protocol 의무 코드라 본 plan 외) |
| 선행 조건 | (a) 사용자가 `/codex:*` 슬래시 명령을 사용하지 않음 확인됨. (b) v1 schema state 파일은 사용자 디스크에 없거나, Phase 1 첫 step에서 발견 시 안내 후 사용자가 수동 삭제 한다. |

## 현재 근거

| 근거 | 확인 내용 | plan에 반영한 결론 |
| --- | --- | --- |
| `claude-plugin/develop/scripts/stop-review-gate-hook.mjs` 899 lines | review 트리거(본업) 외에 broker recovery / Codex error 진단 / confidence 파싱 / thread reuse fallback / verdict 적용 / running task note / review artifact 기록이 모두 hook 안에 박혀 있음 | Phase 3에서 Codex 운영 로직을 `codex.mjs`로 흡수, Phase 4에서 verdict 적용을 CLI로 이전. Stop hook은 본업만 ~200 lines |
| `claude-plugin/develop/scripts/lib/codex.mjs` 760 lines | export 4개 중 2개(`findLatestTaskThread`, `buildPersistentTaskThreadName`)는 codex-companion 전용. 내부 700 lines는 turn capture/progress/reasoning sections 등 진행 UI 로직 — codex-companion이 사용자에게 보여주던 코드 | Phase 2에서 codex-companion 제거와 함께 UI 로직 제거. ~250 lines로 축소 |
| `claude-plugin/develop/scripts/codex-companion.mjs` 534 lines + `lib/tracked-jobs.mjs` 204 + `lib/state.mjs` 176 + `lib/job-control.mjs` 15 | `/codex:*` 슬래시 명령 백엔드와 Codex job tracking. 사용자가 사용 안 함을 확인 | Phase 2에서 일괄 제거 |
| `claude-plugin/develop/scripts/lib/runner-state.mjs:214-240` (v1 migrator) + `:330-340` (.bak 백업) | v1 plan-state 자동 마이그레이션과 atomic save 후 .bak 복제. 사용자 디스크에 v1 state가 없고 .bak으로 복구한 적도 없음을 확인 | Phase 1에서 둘 다 제거 |
| `claude-plugin/develop/scripts/lib/sessions.mjs:71-81` (parseSessionShape) | 옛 worktrees[]/blockHistory legacy field 변환 — 현재 schema와 무관 | Phase 1에서 단순화 |
| `claude-plugin/develop/scripts/lib/telemetry.mjs` 32 lines + hook 5곳의 `recordHookEvent` 호출 | metrics.jsonl JSONL append. 사용자가 평소 안 보고 사고 진단 시에만 가치 있으나 본 cleanup 범위에서는 제거 결정 | Phase 1에서 일괄 제거 |
| `claude-plugin/develop/scripts/lib/review-collector.mjs` 87 lines + `.codex/reviews/*.md` archive | Codex BLOCK 사유와 diff를 사후 archive. 사용자가 사용 안 함 확인 | Phase 3에서 제거 + `.gitignore` 정리 |
| `claude-plugin/develop/scripts/runner-state-cli.mjs` 392 lines | phase mutation 명령 4개(`begin-rework`, `rework-done`, `mark-qa-pending`, `qa-resolved`)가 거의 동일 패턴 반복. `cmdArmForDispatch`만 `runTransition` 헬퍼 미사용 | Phase 5에서 테이블화 + 헬퍼 통합. ~200 lines로 축소 |
| `claude-plugin/develop/scripts/runner-state-fixup.mjs` 254 lines | 8개 플래그(`--rotate-plan-path`, `--force-status`, `--rollback-to`, `--bump-round`, `--clear-armed`, …). 사용자가 실제로 자주 쓰는 것은 1~2개 추정 | Phase 5에서 `--force-status`, `--clear-armed` 핵심 2개만 남기고 ~80 lines로 |
| `claude-plugin/develop/scripts/print-transitions.mjs` 58 lines | 디버그 도구. 사용자 워크플로에서 미사용 | Phase 1에서 삭제 |
| `claude-plugin/develop/scripts/session-lifecycle-hook.mjs:42-73` (probeCodex) + `:85` (cleanStaleSessions) | SessionStart에서 codex --version 실행 + SessionEnd에서 24h 지난 옛 session JSON 정리. 본업 외 부수 작업 | Phase 2에서 둘 다 제거. 잔여 session JSON 누적은 미미 |
| `claude-plugin/develop/scripts/lib/hook-input.mjs:40-43` + `lib/tracked-jobs.mjs:6` (`SESSION_ID_ENV`) | Codex job tracking이 사용하던 env. 모든 hook payload에 `session_id`가 들어와 env fallback 불필요 | Phase 2에서 env 전파와 fallback 둘 다 제거 |
| `claude-plugin/develop/skills/runner/SKILL.md` + `references/plan-state-recovery.md` | v1 migrator, .bak 복구, `/codex:*` 명령, `runner-state-fixup` 8개 플래그, review-collector archive 등을 prose가 참조 — 본 plan 적용 후 모순 발생 | Phase 6에서 모든 prose 일관성 갱신 |

## 기능 계약

### Phase 1 — 디버그/legacy 정리 (동작 변화 0)

- `claude-plugin/develop/scripts/print-transitions.mjs` 삭제.
- `claude-plugin/develop/scripts/lib/runner-state.mjs`:
  - `migrateV1ToV2`, `V1_STATUS`, `V1_TO_V2` 상수, `validateState`의 v1 분기 모두 제거.
  - **사전 안전장치**: UserPromptSubmit hook이 `tryLoadState`에서 `schema_version === 1`을 감지하면 `emitBlock`으로 다음 메시지 출력: `"이 plan의 state 파일은 schema_version=1입니다(현재 v2). v2 자동 마이그레이션은 본 cleanup에서 제거됐습니다. <statePath>를 삭제한 뒤 /runner를 다시 실행해서 v2로 재생성하세요."`
  - `backupPathFor`, `writeBackupBestEffort`, `saveState` 안의 .bak 호출 모두 제거. `loadState`의 .bak fallback도 제거.
- `claude-plugin/develop/scripts/lib/sessions.mjs`:
  - `parseSessionShape` 단순화 — `parsed.activePlanStates`/`parsed.stopReviewThreadId`만 직접 읽고 legacy `worktrees[]`/`blockHistory` 분기 제거.
- `claude-plugin/develop/scripts/lib/telemetry.mjs` 삭제.
- 모든 hook과 `pre-tool-use-policy.mjs`의 `recordHookEvent` import + 호출 제거 (총 11곳 추정).
- Phase 1 commit 메시지 subject 예시: `refactor(develop): drop v1 migrator, .bak backup, legacy session fields, and telemetry`.

### Phase 2 — `/codex:*` 인프라 제거 (사용자 미사용 확인됨)

- 삭제 파일:
  - `claude-plugin/develop/scripts/codex-companion.mjs`
  - `claude-plugin/develop/scripts/lib/tracked-jobs.mjs`
  - `claude-plugin/develop/scripts/lib/state.mjs`
  - `claude-plugin/develop/scripts/lib/job-control.mjs`
- `claude-plugin/develop/scripts/lib/codex.mjs` 축소:
  - 제거 함수: `emitProgress`, `emitLogEvent`, `registerThread`, `describeStartedItem`, `describeCompletedItem`, `labelForThread`, `extractReasoningSections`, `mergeReasoningSections`, `normalizeReasoningText`, `createTurnCaptureState`, `recordItem`, `applyTurnNotification`, `belongsToTurn`, `scheduleInferredCompletion`, `completeTurn`, `clearCompletionTimer`, `findLatestTaskThread`, `buildPersistentTaskThreadName`, `captureTurn`의 turn-state 추적 분기.
  - 유지: `runAppServerTurn`, `listAvailableModels`, `withAppServer`, `startThread`, `resumeThread`, `buildThreadParams`, `buildResumeParams`, `buildTurnInput`, `cleanCodexStderr`. 단 `runAppServerTurn`은 진행 UI 콜백 제거 — Stop hook이 prompt/threadId/timeout만 넘기고 final message + threadId만 받음.
- `claude-plugin/develop/scripts/stop-review-gate-hook.mjs`:
  - `import { listJobs } from "./lib/state.mjs";` 제거.
  - `sortJobsNewestFirst` 호출과 `runningJob` / `runningTaskNote` 분기 모두 제거.
  - 모든 systemMessage/BLOCK 메시지에서 `runningTaskNote` concat 분기 제거.
- `claude-plugin/develop/scripts/session-lifecycle-hook.mjs`:
  - `probeCodex`, `codexInstallHint`, `reportCodexProbe`, `cleanStaleSessions` import와 호출 모두 제거.
  - `appendEnvVar(SESSION_ID_ENV, ...)`, `appendEnvVar(PLUGIN_DATA_ENV, ...)` 제거 (다음 항목에서 hook-input이 env fallback 안 쓰도록 정리).
- `claude-plugin/develop/scripts/lib/hook-input.mjs`:
  - `SESSION_ID_ENV` import 제거. `sessionId` 결정 시 `input.session_id`만 사용 (env fallback 제거).
- Phase 2 commit 메시지 subject 예시: `refactor(develop): remove /codex:* infrastructure and Codex job tracking`.

### Phase 3 — Stop hook 정화 + codex.mjs 흡수

목적: Stop hook이 본업(armed plan 식별 + diff 수집 + Codex review 호출 + verdict 받기 + emit)만 하도록 ~200 lines로 축소. Codex 운영 디테일은 모두 `codex.mjs` 내부로.

- `claude-plugin/develop/scripts/lib/codex.mjs` API 확장 — **새 진입점 `review`**:

  ```js
  export async function review({
    prompt,            // string
    threadId,          // string | null (resume 시도용)
    cwd,               // string
    timeoutMs = 15 * 60 * 1000,
  }) {
    // 내부에서 다음을 모두 수행:
    //   - threadId가 있으면 resume 시도, 실패 시 fresh로 fallback
    //   - runAppServerTurn 호출
    //   - confirmStaleBroker 시그니처 매칭 시 broker restart + 1회 재시도
    //   - timeout 처리 (15분)
    //   - final message 파싱 (confidence partitioning):
    //       첫 줄 "ALLOW: ..." → outcome='ALLOW'
    //       첫 줄 "BLOCK: ..." + conf>=7 finding 있음 → outcome='BLOCK'
    //       첫 줄 "BLOCK: ..." + 모든 finding conf<7 → outcome='ALLOW_DOWNGRADED', suppressedNote=raw
    //       그 외 unexpected → outcome='BLOCK'
    //   - ENOENT(코덱스 CLI 없음) → outcome='SKIPPED'
    //   - 영구 실패(broker recovery 후에도 fail) → throw
    return {
      outcome,            // 'ALLOW' | 'BLOCK' | 'ALLOW_DOWNGRADED' | 'TIMEOUT' | 'SKIPPED'
      reason,             // BLOCK 사유 (BLOCK일 때), TIMEOUT 안내 (TIMEOUT일 때), 그 외 null
      suppressedNote,     // ALLOW_DOWNGRADED 시 원본 BLOCK 본문, 그 외 null
      raw,                // 원본 final message (record CLI 전달용)
      threadId,           // 결과 thread id (다음 review에 reuse)
    };
  }
  ```
  - 위 함수가 흡수하는 hook 함수: `runStopReview`, `confirmStaleBroker`, `matchesBrokerStaleModelSignature`, `diagnoseCodexFailure`, `extractModelSlugFromError`, `partitionFindingsByConfidence`, `parseStopReviewOutput`.
  - 운영 진단 stderr 출력은 `codex.mjs` 내부에서 유지 (`logNote` 패턴). 한국어 진단 메시지(`diagnoseCodexFailure`)는 그대로 가져옴.

- `claude-plugin/develop/scripts/stop-review-gate-hook.mjs` 본업화:
  - import 정리: `codex.mjs`에서 `review`만 import. `broker-lifecycle`, `runAppServerTurn`, `listAvailableModels` 직접 사용 제거.
  - `runStopReview`, `parseStopReviewOutput`, `partitionFindingsByConfidence`, `diagnoseCodexFailure`, `confirmStaleBroker`, `matchesBrokerStaleModelSignature`, `extractModelSlugFromError` 함수 모두 제거.
  - `persistReviewArtifacts` 함수 + 모든 호출 제거.
  - `main()` 본문은 다음 골격:
    ```
    1. session 확인 (missing/corrupt)
    2. loadArmedPlanStates
    3. for each armed: collectDiffForPlan
    4. armed-but-no-diff 안내 분기
    5. for each reviewItem:
         const result = await codexClient.review({prompt, threadId, cwd, timeoutMs});
         // Phase 4에서 추가될 record-CLI 호출과 emit 로직
    6. 최종 emit
    ```
- `claude-plugin/develop/scripts/lib/review-collector.mjs` 삭제.
- `.gitignore`의 `.codex/reviews/` 항목 정리 (디렉토리 자체 추적 안 되도록 유지하되 코드 흔적은 제거. 기존 archive 파일은 사용자가 수동 정리).
- `claude-plugin/develop/scripts/lib/workspace.mjs`의 `resolveWorkspaceRoot` 사용처 확인 — Stop hook이 직접 import해서 review prompt 빌드에 쓰는 부분 유지.
- Phase 3 commit 메시지 subject 예시: `refactor(develop): absorb stop-review Codex ops into codex.review() and drop archive`.

### Phase 4 — Verdict CLI 이전 (사이드이펙트 단일 진입점 회복)

목적: Stop hook의 마지막 부수효과(`applyVerdictToPlanState`)도 `runner-state-cli`로 옮겨, 모든 plan-state mutation이 CLI 경유가 되도록.

- `claude-plugin/develop/scripts/runner-state-cli.mjs`에 새 서브커맨드 4개:

  ```
  record-stop-review-allow <state-path> <headSha>
    - assertExpectedStatus([DISPATCHING])
    - setStopReviewArmed(false), setLastReviewedCommit(headSha, "ALLOW")
    - clearPlanBlockStreak, clearConsecutiveDowngrades
    - setStopReviewPhase(PASSED) → transitionStatus(DEV_REVIEWING) → setStopReviewPhase(null) → setDevReviewPhase(AWAITING)
    - saveState + stderr 4줄 mutation 로그
    - stdout: (빈 문자열)
    - exit 0

  record-stop-review-downgrade <state-path> <headSha>
    - ALLOW와 동일하나 clearConsecutiveDowngrades 대신 bumpConsecutiveDowngrades
    - bump 결과 >= 임계(3)이면 stdout에 한국어 downgrade-warning 텍스트 출력
    - exit 0

  record-stop-review-block <state-path> <headSha> <reason-file>
    - assertExpectedStatus([DISPATCHING])
    - reason-file을 읽어서 string으로 (Stop hook이 임시 파일에 사전 기록)
    - clearConsecutiveDowngrades, setLastReviewedCommit(headSha, "BLOCK")
    - recordPlanBlock(reason) → {fingerprint, count}
    - phase가 BLOCKED 아니면 setStopReviewPhase(BLOCKED)
    - stdout에 buildPlannerBlockDirective(state) 텍스트 출력
    - count >= 3이면 stdout에 escalation note 추가
    - saveState + stderr mutation 로그
    - exit 0
  ```

  TIMEOUT은 CLI 호출 없음 — mutation이 없으므로.

- `claude-plugin/develop/scripts/lib/stop-review-verdict.mjs` → CLI 안으로 흡수 후 lib 파일 삭제. `buildPlannerBlockDirective`만 CLI 안에 inline. `SAME_BLOCK_ESCALATION_THRESHOLD`, `CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD` 상수도 CLI 안.

- `claude-plugin/develop/scripts/stop-review-gate-hook.mjs`의 verdict 적용 분기:
  ```
  switch (result.outcome) {
    case 'ALLOW':
    case 'SKIPPED':
      const r = spawnSync('node', [cli, 'record-stop-review-allow', state, headSha]);
      if (r.status !== 0) → systemMessage 안내 + return (state 변경 없음)
      break;
    case 'ALLOW_DOWNGRADED':
      const r = spawnSync('node', [cli, 'record-stop-review-downgrade', state, headSha]);
      if (r.status !== 0) → 동상
      downgradeWarning = r.stdout;
      break;
    case 'BLOCK':
      const reasonFile = path.join(os.tmpdir(), `stop-review-reason-${Date.now()}.txt`);
      fs.writeFileSync(reasonFile, result.reason, 'utf8');
      const r = spawnSync('node', [cli, 'record-stop-review-block', state, headSha, reasonFile]);
      try { fs.unlinkSync(reasonFile); } catch {}
      if (r.status !== 0) → systemMessage 안내 + return
      blockedReason = result.reason + r.stdout;   // CLI가 directive+escalation 반환
      break;
    case 'TIMEOUT':
      // CLI 호출 없음
      timedOutItems.push({item, reason: result.reason});
      break;
  }
  ```
- **spawn 실패 처리** (subprocess 실행 자체 실패 또는 CLI exit ≠ 0): `emitDecision({systemMessage: "[stop-gate] record-CLI 실행에 실패했습니다 (exit=${r.status}). state는 변경되지 않았으며 다음 turn에 같은 review가 재시도됩니다. stderr 출력을 확인해주세요."})` + `process.stderr.write(r.stderr)`. plan-state는 armed 그대로 유지되어 다음 turn에 재시도. 무한 루프는 사용자가 인지할 수 있는 상태로 surface.
- Phase 4 commit 메시지 subject 예시: `refactor(develop): move stop-review verdict mutations behind runner-state-cli`.

### Phase 5 — Script 압축

- `claude-plugin/develop/scripts/runner-state-cli.mjs` 테이블화:
  - 새 `PHASE_MUTATIONS` 객체로 `begin-rework`, `rework-done`, `mark-qa-pending`, `qa-resolved` 4개를 한 곳에서 정의 (`from`, `to`, `bumpRound`, `needsFeedback`).
  - `cmdBeginRework`, `cmdReworkDone`, `cmdMarkQaPending`, `cmdQaResolved` 함수를 단일 `runPhaseMutation` 분기로 통합. (CLI 행위는 동일, 내부 구현만 압축).
  - `cmdArmForDispatch`는 `runTransition` 헬퍼를 사용하지 않는 특수 분기 — 패턴 통일하기 위해 헬퍼 적용 가능하면 적용, 어려우면 그대로.
- `claude-plugin/develop/scripts/runner-state-fixup.mjs` 축소:
  - 유지 플래그: `--force-status <STATUS>`, `--clear-armed`.
  - 제거: `--rotate-plan-path`, `--rollback-to`, `--bump-round`, `--clear-block-streak`, 그 외 보조 플래그. 필요 시 `plan-state-recovery.md`에 jq 한 줄 예시로 대체.
  - 결과 ~80 lines 추정.
- `claude-plugin/develop/scripts/lib/pre-tool-use-policy.mjs`의 한국어 hint 메시지를 짧게 축약 (선택). 예: "메인 세션은 dispatching 상태에서 worktree를 직접 수정할 수 없습니다." 같은 한 줄로.
- Phase 5 commit 메시지 subject 예시: `refactor(develop): compress runner-state-cli phase mutations and trim fixup CLI`.

### Phase 6 — 문서 일관성 갱신

- `claude-plugin/develop/skills/runner/SKILL.md`:
  - "How this skill is enforced" 섹션에서 telemetry 언급 정리.
  - Step 5의 `/codex:status`, `/codex:cancel` 언급 제거.
  - .bak / v1 migration 언급 제거.
  - 6 phase cleanup 후의 실제 흐름과 일치하는지 전수 점검.
- `claude-plugin/develop/skills/runner/references/plan-state-recovery.md`:
  - v1 → v2 마이그레이션 절 제거. .bak 복구 절 제거.
  - `runner-state-fixup` 플래그 목록을 남은 2개로 갱신.
  - 제거된 플래그가 다루던 시나리오에 대해 `jq` 한 줄 또는 hand-edit 가이드 추가 (필요한 경우만).
- `claude-plugin/develop/skills/runner/references/prompts/plan-dispatch.md`, `rework-dispatch.md`:
  - 본 plan 적용 후 prose 모순이 있는지 확인. 현재로서는 변경 불필요 예상.
- `claude-plugin/develop/prompts/stop-review-gate.md`: 변경 불필요 예상 (Codex prompt template은 별도 도메인).
- `claude-plugin/develop/scripts/lib/runner-state-machine.mjs`의 schema version 주석에서 v1 언급 정리 (v1 migrator 제거됨).
- `claude-plugin/develop/CHANGELOG` 또는 plugin manifest의 version 번호 bump (e.g. 2.10.4 → 2.11.0). 가능하면 plugin manifest와 의존하는 다른 파일까지 한꺼번에.
- Phase 6 commit 메시지 subject 예시: `docs(develop): align runner prose with hook cleanup`.

## 비기능 계약

- **PreToolUse target-location rule** 그대로 — 이번 plan은 정책 변경 없음.
- **dev-review skill** 그대로 — 이번 plan과 무관.
- **plan-state schema_version** 그대로 (v2 유지). v1 migrator만 제거.
- **Codex broker protocol** 그대로 — `app-server.mjs`, `broker-lifecycle.mjs`, `broker-endpoint.mjs`는 외부 protocol 의무 코드라 변경 안 함.
- **Stop hook timeout** 그대로 (960s 외부 / 15min 내부 margin).

## 검토 체크리스트

- [ ] **Phase 1**: `print-transitions.mjs`가 사라졌고, `migrateV1ToV2`/`V1_TO_V2`/`.bak` 관련 코드가 모두 제거됐다. `parseSessionShape`가 legacy 필드를 더 이상 다루지 않는다. `telemetry.mjs`가 사라졌고 `recordHookEvent` 호출도 코드베이스에 없다 (`rg recordHookEvent`로 0건 확인).
- [ ] **Phase 1**: UserPromptSubmit hook이 v1 state를 만나면 emitBlock으로 명확한 안내를 출력하는 분기가 있다.
- [ ] **Phase 2**: `codex-companion.mjs`, `tracked-jobs.mjs`, `state.mjs`, `job-control.mjs` 4개 파일이 사라졌다. `codex.mjs` LOC가 ~250 수준이다. SessionStart에서 codex --version 호출이 없다. SessionEnd에서 `cleanStaleSessions` 호출이 없다. Stop hook에서 `listJobs`/`runningTaskNote` 분기가 없다. `SESSION_ID_ENV` 사용처가 코드베이스에 없다.
- [ ] **Phase 3**: `codex.mjs`에 `review({prompt, threadId, cwd, timeoutMs})` export가 있고 명세대로 `{outcome, reason, suppressedNote, raw, threadId}`를 반환한다. broker recovery/error 진단/confidence 파싱이 모두 `codex.mjs` 내부에 있다. Stop hook에서 `confirmStaleBroker`, `parseStopReviewOutput`, `partitionFindingsByConfidence`, `diagnoseCodexFailure` 함수가 사라졌다. `review-collector.mjs`가 사라졌다.
- [ ] **Phase 4**: `runner-state-cli`에 `record-stop-review-allow`, `record-stop-review-downgrade`, `record-stop-review-block` 3개 서브커맨드가 있다. `stop-review-verdict.mjs` 파일이 사라졌고, `applyVerdictToPlanState`를 호출하는 곳이 없다 (`rg applyVerdictToPlanState` 0건). Stop hook이 `saveState`를 직접 호출하지 않는다 (`rg "saveState" claude-plugin/develop/scripts/stop-review-gate-hook.mjs` 0건). spawn 실패 시 안내 분기가 있다.
- [ ] **Phase 5**: `runner-state-cli` LOC가 ~200 수준이다. `runner-state-fixup` LOC가 ~80 수준이고 지원 플래그가 `--force-status`, `--clear-armed` 2개다.
- [ ] **Phase 6**: `SKILL.md`와 `plan-state-recovery.md`가 6 phase 적용 후 상태와 일관된다. plugin version이 bump됐다.
- [ ] **회귀 검증 (Phase 5 또는 6 commit 안에서)**:
  - 기존 `pre-tool-use-policy.test.mjs`, `pre-tool-use-hook.test.mjs`, `runner-state.test.mjs` 등 모든 테스트가 통과한다 (deprecated된 케이스 테스트는 같이 제거).
  - 새 테스트: `runner-state-cli.record-stop-review.test.mjs` — 3개 record 서브커맨드의 상태 전이/escalation/downgrade를 검증.
  - 새 테스트: `codex.review.test.mjs` — review API의 outcome 분기를 mock으로 검증 (실제 Codex 호출 안 함).
  - `node --test claude-plugin/develop/scripts/__tests__/*.test.mjs` 통과.

## 운영 노트

- 사용자가 `.codex/reviews/` 디렉토리에 잔여 archive 파일을 갖고 있다면 Phase 3 적용 후 수동 `rm -rf .codex/reviews/`로 정리 권장. plan에서 자동 정리하지 않음 — 사용자 작업물이 섞여 있을 수 있어 의도적으로 보수적.
- 사용자가 `$CLAUDE_PLUGIN_DATA/sessions/`에 옛 session JSON이 누적되어 있다면 Phase 2 적용 후 한 번 `rm -rf` 권장 (자동 cleanup 사라졌으므로).
- 본 plan의 owner_agent는 `general-developer`이지만 변경 범위가 hook + lib + skill prose 전부라 dispatch 시 sub-agent가 한 worktree 안에서 phase별 commit으로 진행한다. plan-dispatch.md prompt가 phase=commit 강제하므로 6 commit이 생성된다.
- Phase 4 적용 후 Stop hook의 verdict 적용에 spawnSync 호출이 들어가서 sync subprocess fork 1회가 추가된다 (수십~수백 ms). 사용자가 Stop hook 응답을 기다리는 시점이라 체감 영향 없음.
