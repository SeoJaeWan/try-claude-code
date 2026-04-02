**Branch:** refactor/remove-human-cli-help-surface

> Worktree dir: `worktrees/refactor-remove-human-cli-help-surface` (`Branch`의 `/`를 `-`로 치환)

# dev-cli JSON-only help contract 정리 실행 계획

## 범위

- `frontend`, `backend` CLI의 공식 탐색 surface를 JSON `--help`와 command-scoped `--help`만 남기도록 축소한다.
- `guide`, `--help --text`, `--help --full`, 사람용 help/guide renderer, 관련 profile metadata를 제거한다.
- 사람용 replacement나 compatibility shim은 추가하지 않는다.

## Out of Scope

- 새로운 help alias, redirect, migration command 추가
- generated evaluation workspace, HTML transcript, benchmark output 대량 정리
- CLI 실행 contract 자체의 신규 기능 추가

## 단계별 실행

### Phase 1

- 목적:
  - CLI runtime에서 사람용 help surface를 제거하고 남는 공식 인터페이스를 `--help`와 `<command> --help`로 고정한다.
- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 선행조건: `none`
- 계약/제약:
  - 실행 계약은 `pnpm --dir packages/dev-cli test`를 기준 validation command로 사용한다.
  - 유지 surface는 `frontend --help`, `backend --help`, `frontend <command> --help`, `backend <command> --help`만 허용한다.
  - 제거 대상에 대해 deprecation alias, redirect, fallback message를 추가하지 않는다.
- 작업:
  - `packages/dev-cli/src/core/cli/command-router.mjs`에서 `guide` action, `text` format branch, `full` handling을 제거한다.
  - `packages/dev-cli/src/core/run-cli.mjs`에서 `handleGuideCommand`, text renderer 호출, `--full` 처리 분기를 제거한다.
  - JSON help payload 생성 로직을 JSON-only module로 재배치해 `help-renderer` 삭제 준비를 끝낸다.
  - `packages/dev-cli/src/core/cli/output.mjs`를 JSON-only output contract에 맞게 단순화한다.
- 실행:
  - `pnpm --dir packages/dev-cli test`
- 완료조건:
  - [ ] runtime에 `guide` command route와 handler가 남아 있지 않다.
  - [ ] runtime이 `--text`와 `--full`을 help feature로 해석하지 않는다.
  - [ ] `frontend --help`와 `frontend component --help`가 계속 JSON payload와 deterministic exit code를 반환한다.
  - [ ] runtime import graph에 `renderHelpText`, `renderGuideText` 의존이 남아 있지 않다.
- 폴백:
  - JSON help payload 생성 로직이 `help-renderer`에 강하게 얽혀 있으면 text renderer 제거와 payload builder 분리를 한 phase 안에서 끝내고 파일명 정리는 후속 commit으로 미룬다.

### Phase 2

- 목적:
  - help/profile schema에서 사람용 metadata를 제거하고 summary/detail JSON help만 남는 payload shape를 고정한다.
- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 선행조건:
  - Phase 1 완료
- 계약/제약:
  - summary JSON과 command-scoped detail JSON은 유지한다.
  - `guide`, `defaultFormat`, `supportedFormats`, `detailHelp`는 deprecated 상태 없이 즉시 제거한다.
  - help payload는 execution-critical contract만 유지하고 사람용 힌트 필드를 남기지 않는다.
- 작업:
  - `profiles/shared/personal/v1/profile.json`, `profiles/frontend/personal/v1/profile.json`, `profiles/backend/personal/v1/profile.json`에서 `guide`, `defaultFormat`, `supportedFormats`를 제거한다.
  - JSON help payload builder에서 `detailHelp`와 `profile.guide` fallback 사용을 제거한다.
  - top-level summary help와 command-scoped detail help의 필드 구성을 새 JSON-only contract에 맞게 축소한다.
- 완료조건:
  - [ ] live profile JSON에 사람용 `guide`/format metadata가 남아 있지 않다.
  - [ ] top-level `--help` JSON에서 `detailHelp`가 제거된다.
  - [ ] command-scoped `--help` JSON이 실행에 필요한 contract fields를 계속 제공한다.
  - [ ] help payload 생성이 `profile.guide` 존재 여부에 의존하지 않는다.

### Phase 3

- 목적:
  - 테스트 계약을 JSON-only surface에 맞게 다시 고정하고 제거된 기능이 deterministic failure로 검증되도록 만든다.
- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 선행조건:
  - Phase 2 완료
- 계약/제약:
  - planning-time test artifact는 생성하지 않고 기존 `packages/dev-cli/tests/*.test.mjs`를 직접 수정한다.
  - 제거된 surface는 모두 stable error shape로 실패해야 한다.
- 작업:
  - `packages/dev-cli/tests/guide-command.test.mjs`, `bootstrap-help-command.test.mjs`, `json-command-contract.test.mjs` 등 관련 테스트를 JSON-only contract 기준으로 수정한다.
  - `guide`, `--help --text`, `--help --full` 관련 성공 기대를 제거하고 failure assertion으로 전환한다.
  - retained help surface에 대한 summary/detail JSON regression test를 유지하거나 보강한다.
- 테스트 산출물:
  - 없음 (`packages/dev-cli/tests/*.test.mjs` 기존 테스트를 직접 수정)
- 테스트 이동:
  - 없음
- 실행:
  - `pnpm --dir packages/dev-cli test`
- 완료조건:
  - [ ] `guide`, `--help --text`, `--help --full`의 성공 기대 테스트가 제거되거나 failure assertion으로 바뀐다.
  - [ ] `frontend --help` summary JSON과 `frontend component --help` detail JSON regression coverage가 남아 있다.
  - [ ] `frontend guide`, `frontend --help --text`, `frontend --help --full`의 deterministic failure가 테스트된다.
  - [ ] `pnpm --dir packages/dev-cli test`가 green이다.

### Phase 4

- 목적:
  - live instruction surface와 repo-authored 문서가 제거된 사람용 help interface를 더 이상 가르치지 않도록 정리한다.
- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 선행조건:
  - Phase 3 완료
- 계약/제약:
  - active skill, live doc, repo-authored plan/reference만 정리 대상에 포함한다.
  - generated evaluation workspace, HTML transcript, benchmark output은 대량 수정하지 않는다.
  - 문서는 JSON `--help`와 `<command> --help`만 공식 탐색 경로로 설명한다.
- 작업:
  - `.codex/skills/frontend-dev/SKILL.md`, `.codex/skills/backend-dev/SKILL.md`, `packages/dev-cli/CONTEXT.md`를 JSON-only contract 기준으로 수정한다.
  - `docs/dev-cli-design.md`, `docs/dev-cli-src-reference.md`, `docs/dev-cli-core-mindmap.md`에서 `guide`, `--text`, `--full`, human renderer 설명을 제거한다.
  - future agent search를 혼동시킬 repo-authored 계획/참고 문서에서 제거된 interface reference를 정리한다.
- 실행:
  - `rg -n --hidden --glob '!node_modules/**' --glob '!packages/*/node_modules/**' --glob '!.git/**' -- 'guide|--text|--full|detailHelp' .`
- 완료조건:
  - [ ] active skill과 live docs가 JSON `--help` / `<command> --help`만 안내한다.
  - [ ] repo-authored 계획/참고 문서가 제거된 interface를 supported surface로 남기지 않는다.
  - [ ] generated workspace/eval artifact는 의도적으로 untouched 상태로 유지한다.
  - [ ] live source/doc/skill surface 기준 grep 결과에 제거된 guidance reference가 남아 있지 않다.

### Phase 5

- 목적:
  - wrapper command 기준 최종 contract를 smoke verification하고 implementation handoff 가능한 마감 상태를 만든다.
- owner_agent: `general-developer`
- primary_skill: `general-dev`
- 선행조건:
  - Phase 4 완료
- 계약/제약:
  - final verification은 `packages/dev-cli` 내부 테스트뿐 아니라 실제 `frontend`, `backend` wrapper command 실행으로 확인한다.
  - final state는 compatibility shim 없이 현재 policy와 문서가 일치해야 한다.
- 작업:
  - retained command smoke test를 실행한다.
  - removed command/option negative smoke test를 실행한다.
  - runtime behavior와 live docs/skills/plan wording이 일치하는지 마지막으로 교차 확인한다.
- 테스트 산출물:
  - 없음 (기존 wrapper/CLI smoke verification만 수행)
- 테스트 이동:
  - 없음
- 실행:
  - `frontend --help`
  - `frontend component --help`
  - `backend --help`
  - `backend module --help`
  - `frontend guide`
  - `frontend --help --text`
  - `frontend --help --full`
- 완료조건:
  - [ ] retained help commands가 JSON output으로 성공한다.
  - [ ] removed commands/options가 deterministic error payload로 실패한다.
  - [ ] live instruction surface와 실제 runtime behavior 사이에 모순이 남아 있지 않다.
  - [ ] branch가 compatibility shim 없이 implementation handoff 가능한 상태다.

## 품질 게이트 결정

- Unit/E2E planning artifact: `skip`
- 사유:
  - 이번 범위는 신규 feature planning이 아니라 existing CLI contract 축소와 기존 테스트 재고정이다.
  - planning-time `tests/` 또는 `e2e/` artifact를 따로 만들기보다 repo의 기존 test suite를 phase 실행 기준으로 사용하는 편이 더 정확하다.

## Self-review 체크리스트

- [ ] 모든 phase에 유효한 `owner_agent`가 있다.
- [ ] 모든 phase에 `목적`, `작업`, `완료조건`이 있다.
- [ ] blocking ambiguity 없이 JSON-only policy가 고정돼 있다.
- [ ] `guide`, `--text`, `--full`, `detailHelp`, profile guide metadata 제거가 phase에 반영돼 있다.
- [ ] execution contract가 `pnpm --dir packages/dev-cli test`와 wrapper smoke command로 명시돼 있다.
