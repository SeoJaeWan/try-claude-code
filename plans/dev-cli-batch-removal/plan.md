**Branch:** refactor/remove-dev-cli-batch-surface

> Worktree dir: `worktrees/refactor-remove-dev-cli-batch-surface` (`Branch`의 `/`를 `-`로 치환)

# dev-cli batch surface 제거 실행 계획

## 범위

- `frontend batch`, `backend batch` command surface를 제거한다.
- `batch` 전용 runtime/parser/executor/$ref 경로를 제거하고, 남는 단일 command 실행 경로를 별도로 정리한다.
- `batch`가 노출되던 profile help, 테스트, 문서, 스킬 안내를 정리한다.

## Out of Scope

- `guide`, `--help --text`, `--help --full` 제거
- 사람용 help renderer 정리
- `batch` 대체 orchestration command 추가
- historical plan artifact, generated transcript, eval workspace 대량 정리

## 단계별 실행

### Phase 1

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - CLI runtime에서 `batch` 진입점을 제거하고, 남는 단일 command 실행 경로를 `batch` 구현과 분리한다.
- 선행조건: `none`
- 제약:
  - 실행 계약은 `pnpm --dir packages/dev-cli test`와 wrapper smoke command를 기준으로 잡는다.
  - `batch` 제거 과정에서 새로운 alias, compatibility shim, redirect는 추가하지 않는다.
  - `guide`/`--text`/`--full` 정리는 이 plan 범위에 넣지 않는다.
- 작업:
  - `packages/dev-cli/src/core/cli/command-router.mjs`에서 `batch` action routing을 제거한다.
  - `packages/dev-cli/src/core/run-cli.mjs`에서 batch handler와 batch-specific orchestration 분기를 제거한다.
  - `packages/dev-cli/src/core/execution/spec-parser.mjs`에서 `parseBatchSpec`와 batch 전용 contract error parsing 경로를 제거한다.
  - `packages/dev-cli/src/core/execution/batch-executor.mjs`의 retained 역할인 `executeSpecCommand`를 별도 module로 분리하거나 파일 책임을 재정의하고, `executeBatch`는 제거한다.
  - `packages/dev-cli/src/core/execution/ref-resolver.mjs`가 dead code가 되면 함께 제거한다.
- 검증:
  - [ ] runtime import graph에 `executeBatch`, `parseBatchSpec`, `resolveRefs` 의존이 남아 있지 않다.
  - [ ] `executeSpecCommand` 또는 그 대체 단일 실행 entrypoint가 `batch` 구현 없이 독립적으로 남아 있다.
  - [ ] 대표 retained command smoke가 유지된다: `frontend component --json ...`, `backend requestDto --json ...`
  - [ ] source runtime 기준 grep에서 `action: "batch"` 또는 `executeBatch(`가 제거된다.

### Phase 2

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - active profile/help contract에서 `batch`를 완전히 제거하고 CLI discovery surface를 실제 runtime과 일치시킨다.
- 선행조건:
  - Phase 1 완료
- 제약:
  - 이번 phase는 `batch` 제거만 다루며 다른 help contract 축소는 건드리지 않는다.
  - top-level `--help`와 command-scoped `--help`는 계속 JSON payload를 반환해야 한다.
- 작업:
  - `profiles/frontend/personal/v1/profile.json`, `profiles/backend/personal/v1/profile.json`에서 `batch` command definition을 삭제한다.
  - 두 profile의 `helpSummary.flows`, `relatedCommands`, `flowRefs`, command summary에서 `batch` 의존과 batch-only flow를 제거한다.
  - `packages/dev-cli/src/core/docs/help-renderer.mjs`의 summary/detail/bootstrap payload에서 `batch` 관련 안내와 block reason 문구를 정리한다.
  - `packages/dev-cli/tests/json-command-contract.test.mjs`가 기대하는 help surface와 command list가 이 새 contract를 기준으로 바뀔 수 있게 payload shape를 고정한다.
- 검증:
  - [ ] `frontend --help`와 `backend --help` JSON command 목록에 `batch`가 없다.
  - [ ] `frontend batch --json '{\"ops\":[]}'`와 `backend batch --json '{\"ops\":[]}'`가 deterministic unknown-command 계열 오류로 실패한다.
  - [ ] `relatedCommands`와 `flowRefs`에서 batch-only reference가 제거된다.
  - [ ] bootstrap/help 문구가 더 이상 `batch`를 supported 또는 blocked command로 언급하지 않는다.

### Phase 3

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - 기존 테스트 스위트를 `batch` 제거 정책에 맞게 다시 고정하고, 제거된 surface가 회귀 없이 실패하도록 만든다.
- 선행조건:
  - Phase 2 완료
- 제약:
  - 별도 planning-time test artifact는 만들지 않고 기존 `packages/dev-cli/tests/*.test.mjs`를 직접 갱신한다.
  - 제거된 기능에 대한 positive coverage는 남기지 않는다.
- 작업:
  - `packages/dev-cli/tests/batch-executor.test.mjs`, `packages/dev-cli/tests/ref-resolver.test.mjs`를 삭제하거나 제거된 구현에 맞게 정리한다.
  - `packages/dev-cli/tests/profile-batch-commands.test.mjs`, `packages/dev-cli/tests/json-command-contract.test.mjs` 등 batch 노출을 기대하는 테스트를 수정한다.
  - `frontend batch`와 `backend batch`의 deterministic failure를 검증하는 negative regression test를 추가하거나 기존 contract test에 흡수한다.
  - retained single-command execution과 help summary/detail이 계속 동작하는 coverage를 유지한다.
- 검증:
  - [ ] 테스트 파일이 제거된 `batch-executor`/`ref-resolver` 구현을 import하지 않는다.
  - [ ] `frontend`/`backend` command registry expectation에서 `batch`가 제거된다.
  - [ ] removed command negative regression이 존재한다.
  - [ ] `pnpm --dir packages/dev-cli test`가 green이다.

### Phase 4

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - live docs와 skill guidance가 더 이상 `batch`를 지원 surface로 가르치지 않도록 정리한다.
- 선행조건:
  - Phase 3 완료
- 제약:
  - `dev-cli-json-only-help` plan이 담당하는 help-format 정리와 충돌하지 않도록 `batch` reference cleanup에만 집중한다.
  - historical `plans/**`와 generated artifact는 그대로 둔다.
- 작업:
  - `packages/dev-cli/CONTEXT.md`, `docs/dev-cli-design.md`, `docs/dev-cli-src-reference.md`, `docs/dev-cli-core-mindmap.md`, `docs/claude-code-workflow-evolution.md`에서 `batch` 설명과 예시를 제거한다.
  - `.codex/skills/frontend-dev/SKILL.md`, `.codex/skills/backend-dev/SKILL.md`에 `batch` usage가 남아 있으면 함께 제거한다.
  - source/doc/skill 기준 grep target을 정해 live guidance에서 batch reference가 사라졌는지 확인한다.
- 검증:
  - [ ] active docs와 skill surface가 `frontend batch` 또는 `backend batch`를 더 이상 안내하지 않는다.
  - [ ] runtime/contract reference 문서가 `executeBatch`, `parseBatchSpec`, `$ref` batch orchestration을 현재 기능처럼 설명하지 않는다.
  - [ ] `plans/**`와 generated artifact를 제외한 live source/doc/skill grep에서 batch guidance reference가 남아 있지 않다.
  - [ ] help-format 별도 정리 plan과 범위 충돌이 생기지 않는다.

### Phase 5

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - wrapper command 기준으로 최종 contract를 smoke verification하고 handoff 가능한 마감 상태를 만든다.
- 선행조건:
  - Phase 4 완료
- 제약:
  - final verification은 runtime source test와 wrapper command behavior 둘 다 포함한다.
  - 최종 상태는 `batch` 없이도 `frontend`/`backend`의 retained primitives가 정상 동작해야 한다.
- 작업:
  - retained help와 single-command smoke를 실행한다.
  - removed `batch` command negative smoke를 실행한다.
  - source/doc/help contract wording과 실제 runtime 결과가 일치하는지 마지막으로 교차 확인한다.
- 검증:
  - [ ] `frontend --help`, `frontend component --help`, `backend --help`, `backend module --help`가 계속 성공한다.
  - [ ] `frontend batch --json '{\"ops\":[]}'`, `backend batch --json '{\"ops\":[]}'`가 deterministic failure payload를 반환한다.
  - [ ] representative generation smoke가 계속 성공한다.
  - [ ] branch가 `batch` compatibility layer 없이 handoff 가능한 상태다.

## 테스트 계획

- 단위 테스트:
  - 별도 `plans/dev-cli-batch-removal/tests/` artifact는 생성하지 않는다.
  - 구현 단계에서 `packages/dev-cli/tests/*.test.mjs` 기존 스위트를 직접 갱신하고 `pnpm --dir packages/dev-cli test`로 검증한다.
- E2E 테스트:
  - 해당 없음

## 품질 게이트 결정

- Unit/E2E planning artifact: `skip`
- 사유:
  - 이번 범위는 신규 기능 추가가 아니라 repository-level CLI contract 축소와 기존 테스트 재고정이다.
  - planning artifact보다 기존 runtime test suite와 wrapper smoke가 더 정확한 검증 계약이다.

## Self-review 체크리스트

- [ ] plan 범위가 기존 `dev-cli-json-only-help`와 분리되어 있다.
- [ ] 모든 phase에 `owner_agent`, `목적`, `작업`, `검증`이 있다.
- [ ] `batch` runtime, profile/help, test, docs/skills 정리가 모두 phase에 반영돼 있다.
- [ ] `guide`/`--text`/`--full` 제거는 의도적으로 out-of-scope로 남겨뒀다.
- [ ] execution contract가 `pnpm --dir packages/dev-cli test`와 wrapper smoke command로 명시돼 있다.
