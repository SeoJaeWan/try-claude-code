**Branch:** refactor/package-owned-cli-contracts

> Worktree dir: `worktrees/refactor-package-owned-cli-contracts` (`Branch`의 `/`를 `-`로 치환)

# dev-cli package-owned contract 전환 실행 계획

## 범위

- `frontend`, `backend` CLI의 command contract, help metadata, template asset, alias-specific validation logic를 각 패키지 내부로 이동한다.
- `@seojaewan/dev-cli-core`는 parse, route, executor dispatch, file write, JSON output/error만 담당하는 thin runtime으로 축소한다.
- `profiles/**`, `mode/profile/cache/remote registry` 기반 rule delivery를 제거하고 package version이 contract version을 대표하도록 전환한다.
- 이전에 논의된 `guide`, `--help --text`, `--help --full`, `batch` 제거를 이 구조 전환 안에서 함께 닫는다.

## Out of Scope

- 새로운 command 추가
- remote plugin system 또는 runtime rule fetch 재도입
- UI/E2E feature planning artifact 생성
- package publish automation 구축

## 단계별 실행

### Phase 1

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - profile 시스템 없이도 동작하는 새 core runtime 계약을 먼저 세우고, `frontend`/`backend` wrapper가 package-owned manifest를 주입하는 구조를 고정한다.
- 선행조건: `none`
- 제약:
  - 실행 계약은 `pnpm --dir packages/dev-cli test`를 기본 검증 명령으로 사용한다.
  - 새 runtime은 profile/mode/cache/remote fetch에 의존하지 않아야 한다.
  - command discovery surface는 `--help`, `<command> --help`만 남기고, 사람용 help와 batch는 구조 전환 과정에서 함께 제거한다.
- 작업:
  - `packages/dev-cli/src/run-cli.mjs`와 core runtime entrypoint가 alias string 대신 alias descriptor 또는 manifest object를 받을 수 있는 새 host API를 정의한다.
  - `packages/dev-cli/src/core`를 `cli`, `runtime`, `executors`, `shared` 중심으로 재배치할 목표 경계를 문서화하고, package-owned manifest를 읽는 새 로딩 경로를 우선 만든다.
  - help payload 생성, command dispatch, executor registry를 profile loader와 분리된 JSON-only runtime 경로로 이동한다.
  - 기존 runtime에서 남길 stable capability와 제거할 obsolete surface를 분리한다.
    - 유지: parse, route, JSON output/error, file-template/snippet-template execution, file write
    - 제거: profile loader, registry, cache, mode command, remote fetch, guide/text/full, batch
- 검증:
  - [ ] 새 runtime 계약이 `frontend`/`backend` 패키지 내부 manifest를 직접 받을 수 있도록 정의된다.
  - [ ] core hot path에서 `loadActiveProfile`, `resolveActiveProfile`, `readRemoteJsonResource` 같은 profile runtime 의존을 제거할 수 있는 분리 경계가 생긴다.
  - [ ] retained capability와 제거 대상 surface가 phase 산출물에서 명확히 구분된다.
  - [ ] `pnpm --dir packages/dev-cli test`를 기준으로 이후 phase가 rebaseline할 수 있는 얇은 runtime target이 정의된다.

### Phase 2

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - `frontend` 패키지가 자기 command contract와 template/validator를 직접 소유하도록 옮기고, core는 frontend manifest를 통해서만 실행하도록 전환한다.
- 선행조건:
  - Phase 1 완료
- 제약:
  - `packages/frontend` 내부에 새 `src/` 트리를 만들고, published package에 그 자산이 포함되도록 packaging metadata를 함께 조정한다.
  - frontend command 이름과 help contract는 현재 유지 대상 surface에 한해 최대한 기존 결과를 유지한다.
  - frontend 전용 validation은 generic core validator가 아니라 alias-local validator로 고립한다.
- 작업:
  - `packages/frontend/src/manifest.mjs`를 만들고 frontend command catalog, help metadata, input schema, executor/template mapping을 profile JSON에서 이식한다.
  - `packages/frontend/src/templates/`에 frontend scaffold/snippet template를 옮기고, core executor가 manifest key를 통해 해당 template를 찾게 한다.
  - `packages/frontend/src/validators/validate-file.mjs` 또는 동등한 alias-local validation module로 frontend validate-file engine을 이동한다.
  - `packages/frontend/bin/frontend.mjs`가 새 manifest를 core runtime에 주입하도록 수정하고, `packages/frontend/package.json`의 `files`/metadata를 새 구조에 맞게 갱신한다.
- 검증:
  - [ ] `packages/frontend/src/manifest.mjs`가 현재 유지 대상 frontend command surface를 정의한다.
  - [ ] frontend template asset이 `profiles/frontend/**`가 아니라 `packages/frontend/src/templates/**`에서 resolve된다.
  - [ ] frontend wrapper는 alias string만 넘기는 구조가 아니라 package-owned manifest를 runtime에 넘긴다.
  - [ ] `npm pack --dry-run` in `packages/frontend` 기준으로 `src/` 자산이 publish surface에 포함된다.

### Phase 3

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - `backend` 패키지도 동일한 package-owned contract 구조로 옮기고, alias별 contract ownership을 `frontend`/`backend` 양쪽에서 대칭적으로 완성한다.
- 선행조건:
  - Phase 2 완료
- 제약:
  - backend는 template-heavy file generation을 우선 package 내부로 이동하고, 별도 remote profile 의존 없이 manifest로 command catalog를 제공해야 한다.
  - package version이 contract version이 되므로 backend command surface 변경은 package release 경로로 설명 가능해야 한다.
- 작업:
  - `packages/backend/src/manifest.mjs`를 만들고 backend command catalog, help metadata, schema, executor/template mapping을 이식한다.
  - `packages/backend/src/templates/`에 module/requestDto/responseDto/entity 관련 template를 옮긴다.
  - `packages/backend/bin/backend.mjs`와 `packages/backend/package.json`을 새 manifest ownership에 맞게 수정한다.
  - backend command execution이 더 이상 `profiles/backend/**`나 remote profile runtime을 보지 않도록 cutover한다.
- 검증:
  - [ ] `packages/backend/src/manifest.mjs`가 현재 유지 대상 backend command surface를 직접 정의한다.
  - [ ] backend template asset이 package 내부에서 resolve된다.
  - [ ] backend wrapper가 package-owned manifest를 runtime에 주입한다.
  - [ ] `npm pack --dry-run` in `packages/backend` 기준으로 `src/` 자산이 publish surface에 포함된다.

### Phase 4

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - 새 package-owned runtime으로 완전히 cutover하고, obsolete profile/mode/help/batch 시스템과 관련 파일을 제거한다.
- 선행조건:
  - Phase 3 완료
- 제약:
  - 이번 phase가 끝나면 `profiles/**`와 profile runtime을 source-of-truth로 더 이상 유지하지 않는다.
  - profile 제거와 함께 `mode`, `guide`, `--help --text`, `--help --full`, `batch`도 남기지 않는다.
  - 기존 narrow cleanup 계획이 있더라도 실제 구현은 이 broader refactor 한 번으로 닫는다.
- 작업:
  - `packages/dev-cli/src/core/profiles/*`, remote registry/cache/config store, `profiles/**`, 관련 loader/merge logic를 제거한다.
  - `command-router`, `run-cli`, help/output/runtime code에서 `mode`, `guide`, `--help --text`, `--help --full`, `batch` surface를 제거한다.
  - dead code가 되는 `batch-executor`, `ref-resolver`, profile validator, obsolete docs renderer와 bootstrap profile guidance를 제거한다.
  - 새 runtime/API에 맞게 core package description, exports, README/CONTEXT wording을 정리한다.
- 검증:
  - [ ] source tree에 `packages/dev-cli/src/core/profiles/` 계열 runtime이 남아 있지 않다.
  - [ ] root `profiles/` tree가 runtime source-of-truth로 남아 있지 않다.
  - [ ] `frontend mode ...`, `backend mode ...`, `guide`, `--help --text`, `--help --full`, `batch`가 모두 제거된다.
  - [ ] core runtime import graph가 package-owned manifest와 local template/executor만 기준으로 동작한다.

### Phase 5

- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 목적:
  - 테스트, 문서, 패키징 검증을 새 contract 기준으로 재고정하고 최종 handoff 가능한 상태를 만든다.
- 선행조건:
  - Phase 4 완료
- 제약:
  - planning-time `tests/manifest.md`나 `e2e/manifest.md`는 만들지 않고 기존 repo test suite를 직접 수정한다.
  - 최종 검증은 runtime test와 wrapper/package smoke를 함께 포함해야 한다.
- 작업:
  - `packages/dev-cli/tests/*.test.mjs`를 package-owned contract 기준으로 재작성한다.
    - wrapper smoke는 manifest-in-package 구조를 검증
    - profile/mode/batch/help-text 관련 테스트는 제거 또는 negative regression으로 전환
  - repo-authored docs와 skill guidance를 profile system이 아닌 package-owned contract 모델 기준으로 수정한다.
  - `packages/dev-cli`, `packages/frontend`, `packages/backend` 각각의 packaging dry-run과 retained CLI smoke를 실행한다.
- 검증:
  - [ ] `pnpm --dir packages/dev-cli test`가 green이다.
  - [ ] `npm pack --dry-run` in `packages/dev-cli`, `packages/frontend`, `packages/backend`가 새 publish surface를 반영한다.
  - [ ] `node packages/frontend/bin/frontend.mjs --help`, `node packages/backend/bin/backend.mjs --help`가 새 runtime에서 성공한다.
  - [ ] repo-authored docs/skills가 더 이상 profile/mode/remote-rule system을 공식 구조로 설명하지 않는다.

## 테스트 계획

- 단위 테스트:
  - 별도 `plans/dev-cli-package-owned-contracts/tests/` artifact는 생성하지 않는다.
  - 구현 단계에서 `packages/dev-cli/tests/*.test.mjs` 기존 스위트를 새 architecture 기준으로 직접 갱신하고 `pnpm --dir packages/dev-cli test`로 검증한다.
- E2E 테스트:
  - 해당 없음

## 품질 게이트 결정

- Unit/E2E planning artifact: `skip`
- 사유:
  - 이번 범위는 기능 UI가 아니라 repo-level CLI architecture 전환과 package boundary 재구성이다.
  - planning artifact보다 existing runtime test suite, wrapper smoke, package dry-run이 더 정확한 검증 계약이다.

## Self-review 체크리스트

- [ ] 정확히 하나의 plan 파일만 생성했다.
- [ ] 모든 phase에 `owner_agent`, `목적`, `작업`, `검증`이 있다.
- [ ] package-owned contract, thin core runtime, profile system 제거가 phase에 모두 반영돼 있다.
- [ ] `frontend`/`backend` 내부 `src/manifest.mjs`와 template/validator ownership이 명시돼 있다.
- [ ] `mode/profile/cache/remote registry` 제거와 `guide/text/full/batch` 제거가 broader refactor 안에 통합돼 있다.
- [ ] 실행 계약이 `pnpm --dir packages/dev-cli test`와 `npm pack --dry-run`/wrapper smoke로 명시돼 있다.
