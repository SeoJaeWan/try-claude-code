**Branch:** refactor/finalize-cli-cutover-cleanup

> Worktree dir: `worktrees/refactor-finalize-cli-cutover-cleanup` (`Branch`의 `/`를 `-`로 치환)

# dev-cli cutover 마감 정리 및 0.2.0 버전 정렬 실행 계획

## 범위

- package-owned contract 전환 이후 남아 있는 레거시 shim, dead file, misleading module/test 이름을 정리한다.
- repo-authored 문서와 내부 경계 문서를 현재 architecture 기준으로 갱신한다.
- `@seojaewan/dev-cli-core`, `@seojaewan/frontend`, `@seojaewan/backend`를 `0.2.0`으로 올리고 dependency/publish surface를 맞춘다.

## Out of Scope

- 새로운 command 추가
- runtime architecture 재설계
- `.codex/artifacts/**` 같은 historical/generated brainstorming log 대량 정리
- publish automation 또는 실제 npm publish 수행

## 단계별 실행

### Phase 1

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - 기능적으로는 제거됐지만 코드 구조상 남아 있는 레거시 shim과 dead source를 걷어내고, 현재 역할과 다른 이름을 정리한다.
- 선행조건: `none`
- 제약:
  - 실행 계약은 `pnpm --dir packages/dev-cli test`를 기준으로 유지한다.
  - public runtime surface는 manifest-owned path만 남기고 alias/profile legacy path는 더 이상 지원하지 않는다.
  - cleanup 과정에서 command behavior 자체는 바꾸지 않는다.
- 작업:
  - `packages/dev-cli/src/run-cli.mjs`의 legacy alias shim을 제거하거나, 현재 public API와 동일한 manifest-only shim으로 단순화한다.
  - dead file인 `packages/dev-cli/src/core/cli/command-router.mjs`를 제거하고, import graph에 남은 legacy router reference를 정리한다.
  - `packages/dev-cli/src/core/execution/batch-executor.mjs`를 현재 역할에 맞는 이름으로 변경하고, `command-dispatcher` 및 테스트 import를 모두 갱신한다.
  - source code comment와 module header에서 “Phase 4 이후 제거”, “profile-based runtime”, “batch surface removed” 같은 과거형/예정형 표현을 현재형으로 바꾼다.
- 검증:
  - [ ] live source import graph에 `runCliLegacy`, `./core/run-cli.mjs`, `command-router.mjs` 의존이 남아 있지 않다.
  - [ ] single-command execution module 이름이 현재 기능과 일치한다.
  - [ ] wrapper와 public export는 manifest-owned path만 기준으로 동작한다.
  - [ ] `pnpm --dir packages/dev-cli test`가 Phase 1 후에도 green이다.

### Phase 2

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - 테스트 이름, 내부 경계 문서, repo-authored reference 문서를 현재 구조 기준으로 다시 고정해 검색 결과와 실제 구조 사이의 drift를 없앤다.
- 선행조건:
  - Phase 1 완료
- 제약:
  - live source/doc/test만 필수 정리 대상으로 포함한다.
  - `.codex/artifacts/**` 같은 historical/generated artifact는 기본적으로 untouched로 두되, live grep noise 판단이 필요하면 별도 후속 작업으로 남긴다.
- 작업:
  - `packages/dev-cli/tests/batch-executor.test.mjs`, `packages/dev-cli/tests/profile-batch-commands.test.mjs` 등 이름이 현재 역할과 맞지 않는 테스트 파일을 역할 기반 이름으로 변경한다.
  - 테스트 설명 문자열에서도 `batch`, `profile` 같은 제거된 개념이 현재 기능처럼 보이지 않도록 정리한다.
  - `packages/dev-cli/src/core/runtime/BOUNDARIES.md`를 현재형으로 갱신하고, obsolete 표가 실제 상태와 맞는지 정리한다.
  - `docs/dev-cli-src-reference.md`, `docs/dev-cli-core-mindmap.md`, `docs/claude-code-workflow-evolution.md`에서 `batch-executor`, `command-router`, legacy `run-cli` shim 설명을 현재 구조 기준으로 수정한다.
- 검증:
  - [ ] repo-authored docs와 test file names가 현재 구조를 기준으로 설명한다.
  - [ ] `batch-executor`, `command-router`, `runCliLegacy`, “Signature (A)” 같은 stale wording이 live source/doc/test에서 제거되거나 현재 의미로 갱신된다.
  - [ ] 내부 경계 문서가 “예정”이 아니라 “현재 상태”를 설명한다.
  - [ ] `rg -n "runCliLegacy|batch-executor|command-router|Signature \\(A\\)|profile-based runtime|Phase 4" packages/dev-cli docs packages/frontend packages/backend -g '!**/node_modules/**'` 결과가 의도한 current wording만 남긴다.

### Phase 3

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - package metadata와 workspace dependency를 `0.2.0`으로 정렬하고 release-ready version state를 만든다.
- 선행조건:
  - Phase 2 완료
- 제약:
  - 세 package는 함께 `0.2.0`으로 올린다.
  - `frontend`/`backend`는 `@seojaewan/dev-cli-core` dependency도 같은 `0.2.0`으로 맞춘다.
  - lockfile이 workspace 상태를 반영하도록 함께 갱신한다.
- 작업:
  - `packages/dev-cli/package.json`, `packages/frontend/package.json`, `packages/backend/package.json`의 version을 `0.2.0`으로 올린다.
  - `packages/frontend/package.json`, `packages/backend/package.json`의 `@seojaewan/dev-cli-core` dependency를 `0.2.0`으로 갱신한다.
  - `pnpm-lock.yaml`이 version/dependency alignment를 반영하도록 갱신한다.
  - package description, README, release-facing wording 중 버전 또는 old architecture를 암시하는 부분이 있으면 함께 맞춘다.
- 검증:
  - [ ] 세 package version이 모두 `0.2.0`이다.
  - [ ] frontend/backend의 core dependency가 `0.2.0`으로 정렬된다.
  - [ ] `rg -n "0\\.1\\.9" . -g '!**/node_modules/**' -g '!.git/**'` 결과에 release-facing stale version이 남아 있지 않다.
  - [ ] lockfile이 현재 workspace metadata와 일치한다.

### Phase 4

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - 테스트, 패키징, wrapper smoke까지 포함한 최종 검증을 통과시켜 cleanup + version bump가 handoff 가능한 상태인지 확인한다.
- 선행조건:
  - Phase 3 완료
- 제약:
  - 검증은 runtime test, wrapper smoke, package pack dry-run을 모두 포함해야 한다.
  - 실제 publish는 하지 않는다.
- 작업:
  - `packages/dev-cli` 테스트 스위트를 실행한다.
  - `packages/dev-cli`, `packages/frontend`, `packages/backend`에서 `npm pack --dry-run`을 실행한다.
  - wrapper help smoke를 실행한다.
  - source/doc/version grep을 다시 돌려 stale wording과 stale version이 남아 있지 않은지 확인한다.
- 검증:
  - [ ] `pnpm --dir packages/dev-cli test`가 green이다.
  - [ ] `npm pack --dry-run` in `packages/dev-cli`, `packages/frontend`, `packages/backend`가 모두 성공하고 tarball filename에 `0.2.0`이 반영된다.
  - [ ] `node packages/frontend/bin/frontend.mjs --help`와 `node packages/backend/bin/backend.mjs --help`가 성공한다.
  - [ ] live source/doc/test 기준 stale legacy wording과 `0.1.9` 잔재가 남아 있지 않다.

## 테스트 계획

- 단위 테스트:
  - 별도 `plans/dev-cli-cutover-cleanup/tests/` artifact는 생성하지 않는다.
  - 구현 단계에서 기존 `packages/dev-cli/tests/*.test.mjs`를 직접 갱신하고 `pnpm --dir packages/dev-cli test`로 검증한다.
- E2E 테스트:
  - 해당 없음

## 품질 게이트 결정

- Unit/E2E planning artifact: `skip`
- 사유:
  - 이번 범위는 feature 추가가 아니라 cleanup, naming alignment, package metadata/version 정리다.
  - 기존 runtime test suite와 package dry-run이 가장 정확한 검증 수단이다.

## Self-review 체크리스트

- [ ] 정확히 하나의 plan 파일만 생성했다.
- [ ] 모든 phase에 `owner_agent`, `목적`, `작업`, `검증`이 있다.
- [ ] dead legacy shim, misleading names, docs drift, version bump가 모두 plan에 반영돼 있다.
- [ ] `0.2.0` 버전 정렬과 dependency alignment가 명시돼 있다.
- [ ] `.codex/artifacts/**`는 의도적으로 out-of-scope로 남겼다.
- [ ] 실행 계약이 `pnpm --dir packages/dev-cli test`, `npm pack --dry-run`, wrapper help smoke, grep 검증으로 명시돼 있다.
