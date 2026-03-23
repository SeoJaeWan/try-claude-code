**Branch:** feat/add-dev-cli-spec-batch

# dev-cli-spec-batch 실행 계획 (Sequential)

## 요약

- 목표: 기존 agent-first dev CLI를 `--json` only spec-driven command surface와 `batch` workflow engine으로 확장해, 여러 scaffold/snippet 요청을 한 번의 실행 안에서 정규화, 검증, preview, 일괄 write 할 수 있게 만든다.
- 배경: 현재 `frontend/backend`는 단일 command 단위의 file generation과 validate를 지원한다. 앞으로 `component`, `props`, `function`, `uiState`, `queryKey` 같은 작은 단위를 AI가 한 작업 안에서 여러 번 호출하게 되므로, 프로세스 재기동과 profile 재로딩 비용을 줄이고 규칙 적용을 더 강하게 계약화할 필요가 있다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- 대상은 `packages/dev-cli` core runtime, `profiles/*/personal/v1`, 관련 validators/tests, CLI-first docs/skills다.
- 이번 계획은 `batch --json` 실행 모델, `--json` only spec-driven command contract, limited `$ref`, fail-fast atomic apply, shared snippet command, `frontend` 확장 command를 범위로 둔다.
- `backend`는 batch 인프라와 JSON-only file command 전환까지만 포함하고, backend snippet command 확장은 후속으로 미룬다.

## Out-of-Scope

- daemon/server mode
- remote profile fetch
- 기존 파일 patch/insert
- batch 내부 조건 분기, loop, JSONPath 전면 지원
- backend snippet command (`method`, `field`, `exceptionMapping` 등)
- browser/mobile E2E

## Resolved Decisions

- [C-BATCH-001] `frontend/backend`는 `batch --json '{...}'` 형태의 ordered op array를 지원한다. 한 번의 실행 안에서 active profile, template, validator context를 재사용한다.
- [C-BATCH-002] batch의 기본 동작은 preview이며, 실제 파일 write는 명시적 `--apply`일 때만 허용한다. write는 각 op 처리 후 즉시 수행하지 않고 batch 마지막에 일괄 적용한다.
- [C-BATCH-003] batch는 앞 op 결과를 뒤 op가 참조할 수 있도록 제한된 `$ref`를 지원한다. 문법은 stable field path 형태로 제한하며, forward reference와 unknown reference는 실패로 처리한다.
- [C-BATCH-004] batch는 fail-fast이며 file write에 대해 atomic 정책을 따른다. 어떤 op라도 실패하면 실제 write는 수행되지 않는다.
- [C-SPEC-001] 새 command surface는 `--json` only로 통일한다. positional generate 입력은 제거하거나 명시적 deprecation error로 차단한다.
- [C-SPEC-002] shared snippet command는 `type`, `props`, `function`으로 고정한다. 이 command들은 정규화 결과와 `normalizations` metadata를 반환한다.
- [C-SPEC-003] `frontend`는 `component`, `hook`, `apiHook`, `type`, `props`, `function`, `uiState`, `queryKey`, `endpoint`, `mapper`, `hookReturn`를 지원한다.
- [C-SPEC-004] 모든 spec-driven command는 기본 JSON 응답으로 `ok`, `command`, `profile`, `normalizedSpec`, `normalizations`, `result` 또는 `files`를 반환한다.
- [C-SPEC-005] `props`는 `membersOnly`를 기본 결과 형태로 사용하고, `uiState`는 `stateWithHandlers` 형태를 기본으로 생성한다.
- [C-BE-001] `backend`는 backend snippet layer 없이도 `--json` only file commands와 batch executor를 함께 사용해야 하며, base package detection과 lower-case package validation을 유지한다.

## Explicit Defaults

- backend snippet layer는 이번 범위에서 제외하고, `backend`는 file-oriented JSON commands와 batch executor 재사용만 먼저 지원한다.
- limited `$ref`는 full JSONPath가 아니라 `opId.field.path` 문자열만 허용한다.
- batch 내부 실행 순서는 항상 순차다.
- batch 결과는 op별 상세 결과를 모두 반환하되, partial success 상태는 노출하지 않는다.

## Assumptions and Risks

- Assumptions:
  - 현재 `packages/dev-cli`의 Node ESM + `node:test` 스택을 유지한다.
  - AI 호출 패턴상 같은 작업 안에서 snippet/file command를 여러 번 호출하게 된다.
  - `profiles/` JSON schema는 command-level spec definition을 추가해도 현재 personal v1 구조를 무리 없이 확장할 수 있다.
- Risks:
  - `--json` only 전환이 기존 generate 습관과 충돌할 수 있어 migration error message가 중요하다.
  - batch `$ref` 설계를 느슨하게 잡으면 spec validation과 normalizer가 과도하게 복잡해질 수 있다.
  - atomic apply 구현 시 generated files와 snippet results가 섞여 preview/apply 단계의 책임이 흐려질 수 있다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| batch-core-runtime | `packages/dev-cli/src/core/*`, `packages/dev-cli/tests/*` | 없음 | 높음(공유 진입점) | 아니오 |
| spec-profiles-shared-frontend | `profiles/shared/*`, `profiles/frontend/*`, validators/tests | batch-core-runtime contract | 높음(shared schema) | 아니오 |
| backend-json-batch-adaptation | `profiles/backend/*`, core generator/router/tests | batch-core-runtime contract | 높음(command contract 공유) | 아니오 |
| docs-skill-migration | `docs/dev-cli-design.md`, `plugin/skills/*` | command surface 확정 | 중간 | 아니오 |

결론:

- command contract와 batch executor가 모든 후속 작업의 선행 산출물이므로 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - `run-cli`, router, profile schema, tests가 모두 같은 command contract를 공유한다.
  - batch executor와 `$ref` semantics가 먼저 고정돼야 profile/docs/tests가 흔들리지 않는다.

## Critical Path

1. batch core contract와 router/parser 확정
2. spec normalizer/batch executor/apply semantics 구현
3. shared + `frontend` profile/schema/template 확장
4. `backend` JSON-only/batch 적응
5. docs/skills migration

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## 범위

- In Scope:
  - `batch --json`
  - `--apply` write gate
  - limited `$ref`
  - shared snippet commands
  - `frontend` spec-driven command surface
  - `backend` JSON-only file command 적응
  - 관련 unit test 계획과 docs migration
- Out of Scope:
  - daemon
  - backend snippet commands
  - 기존 파일 patch/insert

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `backend-developer`
- primary_skill: `backend-dev`
- 작업:
  - `arg-parser`, `command-router`, `run-cli`를 `--json` only spec-driven surface로 재설계한다.
  - `batch` envelope parser, op dispatcher, limited `$ref` resolver, preview/apply execution model, fail-fast atomic write policy를 구현한다.
  - 기존 positional generate 호출은 명시적 deprecation/usage error contract로 전환한다.
  - 결과 JSON contract를 `normalizedSpec`, `normalizations`, `result|files`, `batchResults` 구조로 고정한다.
- 산출물:
  - `packages/dev-cli/src/core/arg-parser.mjs`
  - `packages/dev-cli/src/core/command-router.mjs`
  - `packages/dev-cli/src/core/run-cli.mjs`
  - `packages/dev-cli/src/core/batch-executor.mjs`
  - `packages/dev-cli/src/core/ref-resolver.mjs`
  - `packages/dev-cli/src/core/spec-parser.mjs`
  - `packages/dev-cli/src/core/output.mjs`
- 단위 테스트 의도: `boundary=utility`, `placement_intent=shared`, `artifact=batch-executor.test.mjs`, `json-command-contract.test.mjs`, `ref-resolver.test.mjs`
- E2E 테스트 의도: `N/A (CLI logic scope)`

### Phase 2

- owner_agent: `frontend-developer`
- primary_skill: `frontend-dev`
- 작업:
  - `shared/personal/v1`에 `type`, `props`, `function` spec schema와 normalizer metadata를 추가한다.
  - `frontend/personal/v1`에 `component`, `hook`, `apiHook`, `uiState`, `queryKey`, `endpoint`, `mapper`, `hookReturn` schema와 templates/normalizers를 추가한다.
  - validators를 spec-driven flow에 맞춰 확장한다.
- 산출물:
  - `profiles/shared/personal/v1/profile.json`
  - `profiles/frontend/personal/v1/profile.json`
  - `packages/dev-cli/src/core/spec-normalizer.mjs`
  - `packages/dev-cli/src/validators/frontend-validator.mjs`
  - 관련 templates
- 단위 테스트 의도: `boundary=validator`, `placement_intent=shared`, `artifact=spec-normalizer.test.mjs`, `profile-batch-commands.test.mjs`
- E2E 테스트 의도: `N/A (CLI logic scope)`

### Phase 3

- owner_agent: `backend-developer`
- primary_skill: `backend-dev`
- 작업:
  - `backend`의 `module`, `requestDto`, `responseDto`, `entity`를 `--json` only file-oriented command로 전환한다.
  - backend profile을 batch executor와 통합하되, backend snippet commands는 제외한다.
  - base package detection, lower-case package validation, preview/apply semantics를 batch 모델에 맞게 보정한다.
- 산출물:
  - `profiles/backend/personal/v1/profile.json`
  - `packages/dev-cli/src/core/file-generator.mjs`
  - `packages/dev-cli/src/validators/backend-validator.mjs`
  - 관련 backend templates/tests
- 단위 테스트 의도: `boundary=validator`, `placement_intent=shared`, `artifact=backend-batch-profile.test.mjs`
- E2E 테스트 의도: `N/A (CLI logic scope)`

### Phase 4

- owner_agent: `backend-developer`
- 작업:
  - `docs/dev-cli-design.md`를 spec-driven/batch 구조로 갱신한다.
  - `frontend-dev`, `backend-dev` skill guide를 `--json` only/batch-first usage로 갱신한다.
  - migration note와 example batch payload를 문서에 추가한다.
- 산출물:
  - `docs/dev-cli-design.md`
  - `plugin/skills/frontend-dev/SKILL.md`
  - `plugin/skills/backend-dev/SKILL.md`

## 파일 변경 목록

- 수정:
  - `packages/dev-cli/src/core/arg-parser.mjs`
  - `packages/dev-cli/src/core/command-router.mjs`
  - `packages/dev-cli/src/core/run-cli.mjs`
  - `packages/dev-cli/src/core/file-generator.mjs`
  - `packages/dev-cli/src/core/output.mjs`
  - `packages/dev-cli/src/validators/*.mjs`
  - `profiles/shared/personal/v1/profile.json`
  - `profiles/frontend/personal/v1/profile.json`
  - `profiles/backend/personal/v1/profile.json`
  - `docs/dev-cli-design.md`
  - `plugin/skills/frontend-dev/SKILL.md`
  - `plugin/skills/backend-dev/SKILL.md`
- 신규:
  - `plans/dev-cli-spec-batch/plan.md`
  - `plans/dev-cli-spec-batch/tests/manifest.md`
  - `plans/dev-cli-spec-batch/tests/batch-executor.test.mjs`
  - `plans/dev-cli-spec-batch/tests/ref-resolver.test.mjs`
  - `plans/dev-cli-spec-batch/tests/json-command-contract.test.mjs`
  - `plans/dev-cli-spec-batch/tests/spec-normalizer.test.mjs`
  - `plans/dev-cli-spec-batch/tests/profile-batch-commands.test.mjs`
  - `plans/dev-cli-spec-batch/tests/backend-batch-profile.test.mjs`
  - `packages/dev-cli/src/core/batch-executor.mjs`
  - `packages/dev-cli/src/core/ref-resolver.mjs`
  - `packages/dev-cli/src/core/spec-parser.mjs`
  - `packages/dev-cli/src/core/spec-normalizer.mjs`
- 삭제:
  - 없음

## 검증 명령

1. `pnpm --dir packages/dev-cli test`
2. `node packages/frontend/bin/frontend.mjs --help`
3. `node packages/frontend/bin/frontend.mjs component --json "{\"name\":\"HomePage\",\"path\":\"page/homePage\"}" --dry-run`
4. `node packages/frontend/bin/frontend.mjs batch --json "{\"ops\":[{\"id\":\"component\",\"command\":\"component\",\"spec\":{\"name\":\"HomePage\",\"path\":\"page/homePage\"}}]}" --dry-run`
5. `node packages/frontend/bin/frontend.mjs batch --json "{\"ops\":[{\"id\":\"hook\",\"command\":\"hook\",\"spec\":{\"name\":\"useScroll\",\"path\":\"hooks/utils\"}},{\"id\":\"function\",\"command\":\"function\",\"spec\":{\"kind\":\"internalHandler\",\"name\":\"onScroll\"}}]}" --dry-run`
6. `node packages/backend/bin/backend.mjs requestDto --json "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\",\"fields\":[{\"name\":\"name\",\"type\":\"String\",\"validations\":[\"NotBlank\"]}]}" --dry-run`

## 종료 기준

- [ ] `batch --json`가 ordered op array를 처리한다.
- [ ] batch 기본값이 preview이며 `--apply` 없이는 파일을 쓰지 않는다.
- [ ] limited `$ref`가 backward reference만 해석하고 invalid reference는 실패한다.
- [ ] batch는 fail-fast이며 write에 대해 atomic하다.
- [ ] `frontend/backend`가 `--json` only contract로 동작한다.
- [ ] shared snippet command가 `normalizedSpec`와 `normalizations`를 반환한다.
- [ ] `frontend`의 spec-driven command set이 profile과 validator에 반영된다.
- [ ] `backend`가 base package detection과 lower-case package validation을 유지한 채 batch executor와 동작한다.
- [ ] docs/skills가 새 command surface를 기준으로 갱신된다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] backend snippet layer가 deferred 범위로 명시됨

## 롤백/폴백

- 롤백 방법:
  - batch/spec-driven 전환이 불안정하면 현재 안정 commit 상태로 되돌린다.
  - `--json` only 전환이 너무 큰 마이그레이션 비용을 만들면, 임시 폴백으로 file-oriented command에 한해 positional compatibility shim을 한 릴리즈 동안 유지한다.
- 폴백 조건:
  - `$ref` resolution이 schema를 과도하게 복잡하게 만들거나 test coverage가 깨지는 경우
  - batch apply가 preview/apply 책임을 명확히 분리하지 못하는 경우

## Failure Escalation Policy

- Phase 1에서 `--json` only parser와 batch envelope contract가 불안정하면 이후 phase를 시작하지 않고 contract를 재정의한다.
- Phase 2에서 normalizer/schema가 충돌하면 command 추가보다 shared rule 축소를 우선한다.
- Phase 3에서 backend adaptation이 frontend 공통 contract를 오염시키면 backend batch executor 재사용 범위를 줄이고 file-only compatibility layer를 유지한다.
- 어떤 phase든 constraint coverage가 100% 미만이면 다음 phase로 진행하지 않는다.

## 품질 게이트 결정

- Unit: `run` - batch executor, ref resolver, spec normalizer, JSON contract는 모두 명확한 logic boundary다.
- E2E: `skip` - CLI logic scope이며 browser/mobile bounded UI surface가 아니다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
