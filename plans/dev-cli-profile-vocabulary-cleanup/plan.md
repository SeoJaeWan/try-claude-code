**Branch:** refactor/remove-dev-cli-profile-vocabulary

> Worktree dir: `worktrees/refactor-remove-dev-cli-profile-vocabulary` (`Branch`의 `/`를 `-`로 치환)

# dev-cli profile vocabulary 정리 실행 계획

## 범위

- package-owned manifest 구조로 전환된 뒤에도 public payload, 성공/에러 메시지, 주석, 문서, 테스트에 남아 있는 `profile`/`personal/v1` vocabulary를 제거한다.
- 제거된 CLI surface인 `--mode`, `--version`, `--profile`가 실행 경로에서 조용히 무시되지 않도록 deterministic error로 고정한다.
- 현재 구조와 맞지 않는 help payload 필드명과 문서 설명을 package-owned contract 기준으로 다시 정렬한다.

## Out of Scope

- 새로운 command 추가
- frontend/backend command contract 재설계
- `validate-file` 규칙 자체의 기능 변경
- 실제 npm publish 수행
- `.codex/artifacts/**` historical brainstorming log 일괄 정리

## 단계별 실행

### Phase 1

- owner_agent: `general-developer`
- 목적:
  - public help payload와 실행 결과에서 legacy profile 식별자를 제거하고, 외부에 노출되는 contract 용어를 package-owned manifest 기준으로 정리한다.
- 선행조건: `none`
- 제약:
  - help surface는 계속 `--help`, `<command> --help` JSON-only만 유지한다.
  - cleanup 과정에서 command discovery, file/snippet generation, `validate-file`의 실제 기능 동작은 바꾸지 않는다.
  - breaking payload change가 발생하는 경우 tests/docs를 같은 작업에서 함께 재고정한다.
- 작업:
  - `packages/dev-cli/src/core/runtime/help-builder.mjs`에서 `id`, `profileSummary` 등 legacy profile naming이 public help payload에 노출되는 경로를 제거하거나 manifest-era naming으로 교체한다.
  - `packages/frontend/src/manifest.mjs`, `packages/backend/src/manifest.mjs`에서 `frontend/personal/v1`, `backend/personal/v1` 같은 legacy identifier와 profile-era 주석을 제거한다.
  - `packages/dev-cli/src/core/execution/spec-executor.mjs`, `packages/dev-cli/src/core/runtime/command-dispatcher.mjs`에서 success payload나 internal details에 남아 있는 `profile`/`profileId` 노출을 manifest/alias 중심 용어로 정리한다.
  - `packages/dev-cli/src/core/runtime/manifest-types.mjs`의 JSDoc contract도 profile-era 예시를 제거하고 현재 public contract와 일치시키며, 필요한 경우 `id` optionality 또는 제거 정책을 반영한다.
- 검증:
  - [ ] `frontend --help`, `backend --help`, command-scoped `--help` payload에 `frontend/personal/v1`, `backend/personal/v1`가 더 이상 노출되지 않는다.
  - [ ] success payload에 public contract 차원의 `profile` 필드가 남아 있지 않거나, 남는 경우 새 의미로 일관되게 정의된다.
  - [ ] `rg -n "frontend/personal/v1|backend/personal/v1" packages/dev-cli packages/frontend packages/backend` 결과가 live contract/code에서 제거되거나 의도된 내부 주석만 남는다.

### Phase 2

- owner_agent: `general-developer`
- 목적:
  - 제거된 옵션과 제거된 profile-era 개념이 실행 경로에서 더 이상 “묵살”되지 않도록 입력 contract를 단단하게 고정한다.
- 선행조건:
  - Phase 1 완료
- 제약:
  - 존재하지 않는 surface는 `UNKNOWN_OPTION` 또는 `UNKNOWN_COMMAND`로 deterministic하게 실패해야 한다.
  - 현재 유효한 옵션만 허용하도록 execute/help/validate 경로별 허용 옵션 목록을 명시적으로 유지한다.
- 작업:
  - `packages/dev-cli/src/core/runtime/command-dispatcher.mjs` execute path에 allowed option 검사를 추가해 `--mode`, `--version`, `--profile` 같은 제거된 옵션이 조용히 무시되지 않도록 한다.
  - help/execute/validate-file 경로별 허용 옵션 집합을 현재 surface 기준으로 정리한다.
  - `packages/dev-cli/src/core/validation/validate-file.mjs`와 `packages/frontend/src/validators/validate-file.mjs`의 user-facing 오류 문구에서 `active profile`, `profile-supported entry files` 같은 표현을 manifest/package-owned vocabulary로 교체한다.
  - 관련 테스트를 추가/수정해 제거된 옵션과 제거된 profile vocabulary가 다시 유입되지 않도록 회귀를 고정한다.
- 검증:
  - [ ] `frontend component --mode personal --version v2 --json ...` 같은 호출이 성공하지 않고 deterministic error로 실패한다.
  - [ ] `validate-file` 관련 에러 메시지에 `active profile` 같은 제거된 표현이 남아 있지 않다.
  - [ ] 기존 정상 경로인 `--json`, `--apply`, `--force`, `--fields`, `--help`는 계속 동작한다.

### Phase 3

- owner_agent: `general-developer`
- 목적:
  - repo-authored 문서와 테스트 이름/설명이 현재 package-owned contract 구조를 정확히 설명하도록 최종 정리한다.
- 선행조건:
  - Phase 2 완료
- 제약:
  - live source/doc/test를 우선 정리 대상으로 삼고, historical artifact는 기본적으로 untouched로 둔다.
  - 역사 문서는 history를 설명할 수 있지만, 현재 구조 설명 문단에서는 obsolete architecture를 현재형으로 쓰지 않는다.
- 작업:
  - `docs/dev-cli-design.md`, `packages/dev-cli/src/core/runtime/BOUNDARIES.md`, `docs/dev-cli-src-reference.md`, `docs/dev-cli-core-mindmap.md`에서 남아 있는 `profile`, `shared/personal/v1`, `profiles/*/profile.json` 중심 설명을 package-owned manifest 기준으로 수정한다.
  - `docs/claude-code-workflow-evolution.md`는 역사 서술과 현재 구조 서술을 분리해, 현재형 단락에서 obsolete profile system이 아직 live architecture처럼 보이지 않도록 정리한다.
  - `packages/dev-cli/tests/bootstrap-help-command.test.mjs`, `packages/dev-cli/tests/guide-command.test.mjs`, `packages/dev-cli/tests/validate-file-engine.test.mjs`, `packages/dev-cli/tests/spec-executor.test.mjs`, `packages/dev-cli/tests/manifest-command-contracts.test.mjs`의 fixture와 설명 문자열을 현재 vocabulary로 갱신한다.
  - 필요하면 `guide-command.test.mjs`, `bootstrap-help-command.test.mjs` 등 이름이 현재 역할을 충분히 설명하지 못하는 테스트 파일명을 역할 기반 이름으로 정리한다.
- 검증:
  - [ ] repo-authored 문서에서 현재 구조를 설명하는 단락이 `profiles/*/profile.json`, `shared/personal/v1`, `active profile`을 현재형으로 사용하지 않는다.
  - [ ] 테스트 fixture와 설명 문자열에 legacy profile identifier가 남아 있지 않다.
  - [ ] `rg -n "shared/personal/v1|profiles/.*/profile.json|active profile|profile-supported entry files" packages/dev-cli packages/frontend packages/backend docs` 결과가 의도한 historical 문맥만 남는다.

### Phase 4

- owner_agent: `general-developer`
- 목적:
  - 변경된 contract cleanup이 실제 runtime, 테스트, 패키징에 모두 반영됐는지 최종 검증한다.
- 선행조건:
  - Phase 3 완료
- 제약:
  - 검증은 runtime test, wrapper help smoke, grep 검증을 모두 포함해야 한다.
  - 실제 publish는 수행하지 않는다.
- 작업:
  - `packages/dev-cli` 테스트 스위트를 실행한다.
  - `node packages/frontend/bin/frontend.mjs --help`, `node packages/backend/bin/backend.mjs --help`, command-scoped `--help` smoke를 실행한다.
  - 제거된 옵션이 deterministic하게 실패하는지 smoke로 다시 확인한다.
  - package tarball dry-run으로 publish surface가 유지되는지 확인한다.
  - live source/doc/test 기준 grep으로 legacy profile vocabulary 잔재를 최종 확인한다.
- 검증:
  - [ ] `pnpm --dir packages/dev-cli test`가 green이다.
  - [ ] `node packages/frontend/bin/frontend.mjs --help`, `node packages/backend/bin/backend.mjs --help`, command-scoped `--help`가 성공한다.
  - [ ] 제거된 옵션/명령(`--mode`, `--version`, `--profile`, `guide`, `help` subcommand)이 의도한 deterministic failure를 유지한다.
  - [ ] `npm pack --dry-run` in `packages/dev-cli`, `packages/frontend`, `packages/backend`가 모두 성공한다.
  - [ ] live source/doc/test 기준 public current-state 설명에서 legacy profile vocabulary가 더 이상 남아 있지 않다.

## 테스트 계획

- 단위 테스트:
  - 별도 `plans/dev-cli-profile-vocabulary-cleanup/tests/` artifact는 생성하지 않는다.
  - 구현 단계에서 기존 `packages/dev-cli/tests/*.test.mjs`를 직접 갱신하고 `pnpm --dir packages/dev-cli test`로 검증한다.
- E2E 테스트:
  - 해당 없음

## 품질 게이트 결정

- Unit/E2E planning artifact: `skip`
- 사유:
  - 이번 범위는 기능 추가가 아니라 runtime contract cleanup, wording alignment, deterministic option handling 정리다.
  - 기존 runtime test suite와 smoke/grep 검증이 가장 정확한 회귀 방어 수단이다.

## Self-review 체크리스트

- [ ] 정확히 하나의 plan 파일만 생성했다.
- [ ] 모든 phase에 `owner_agent`, `목적`, `작업`, `검증`이 있다.
- [ ] public help payload, success/error payload, removed option handling, doc/test drift가 모두 범위에 포함돼 있다.
- [ ] 이미 완료된 `batch`/`command-router` 정리는 중복 범위로 다시 넣지 않았다.
- [ ] `.codex/artifacts/**`는 의도적으로 out-of-scope로 남겼다.
- [ ] 검증 계약이 `pnpm --dir packages/dev-cli test`, wrapper smoke, `npm pack --dry-run`, grep 재확인으로 명시돼 있다.
