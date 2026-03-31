**Branch:** feat/build-agent-first-dev-cli

# dev-cli-agent-first 실행 계획 (Sequential)

## 요약

- 목표: `frontend`, `backend` CLI를 repo 안에 도입해 profile/version 기반 scaffold 생성, 규칙 강제, JSON 기본 help 계약을 구현한다.
- 배경: 기존 스킬 기반 생성 흐름만으로는 에이전트가 규칙 문서와 generator를 항상 같은 순서로 적용하지 못했다.
- 실행 모드: `sequential`

## Problem Statement and Scope

- 대상은 repo 루트의 dev CLI 패키지, `frontend/backend` profile bundle, 이를 참조하는 skill/docs다.
- 이번 계획은 `shared/personal/v1`, `frontend/personal/v1`, `backend/personal/v1`을 구현 범위로 둔다.
- CLI는 profile 기반 template/validator/help를 읽고 실제 파일을 생성하거나 `--dry-run`으로 preview해야 한다.
- `--help` 기본 출력은 JSON이고 `<command> --help`는 command-scoped JSON detail을 반환한다.

## Out of Scope

- `company/v1`, `company/v2` profile 세부 구현
- remote registry browsing UI
- 기존 파일 자동 migration 명령
- browser E2E 또는 Playwright guard
- barrel export 자동 관리

## Resolved Decisions

- `command surface contract`: CLI는 하나의 엔진 패키지 위에 `frontend`, `backend` alias를 제공한다. agent-first 표면을 위해 non-interactive 기본값, deterministic exit code, `--dry-run`, JSON 기본 help를 포함한다. [C-CLI-001], [C-CLI-002]
- `profile resolution contract`: active profile selection은 전역 `mode set` 결과를 기준으로 해석하고, 일반 명령은 저장된 selection에 연결된 profile을 로드한다. [C-CLI-003]
- `shared rule contract`: `handle*`, `on*`, 배열 복수형, shared type path, 기본 함수 스타일은 `shared/personal/v1`로 올리고 `frontend`와 `backend`가 필요한 범위만 extend 한다. [C-CLI-004]
- `frontend contract`: `frontend component`, `frontend hook`, `frontend apiHook`는 UI shell과 frontend logic을 하나의 profile에서 제공한다. component는 `{path}/index.tsx`, hook은 `{path}/{name}/index.ts` 구조를 사용하고, API hook은 TanStack Query baseline을 따른다. [C-CLI-004], [C-CLI-006]
- `backend contract`: `backend`는 Spring Boot 기준 personal v1 profile을 제공한다. root package는 main application class 위에 두고, feature package는 lower-case path를 사용하며, `controller/service/dto/entity/repository` 구조와 `@Valid` + `@ControllerAdvice` 기본값을 가진다. [C-CLI-005], [C-CLI-006]

## Explicit Defaults

- root workspace는 `pnpm`을 사용한다.
- dev CLI core는 빌드 없는 Node ESM `.mjs`로 시작한다.
- CLI package tests는 Node native test runner(`node:test`)를 기본으로 둔다.
- backend profile은 Spring Boot + Spring MVC baseline만 제공하고 세부 persistence adapter 규약은 후속 version으로 미룬다.

## Assumptions and Risks

- Assumptions:
  - repo 루트에 `package.json`과 `pnpm-workspace.yaml`을 추가해도 기존 feature 샘플 흐름을 깨지 않는다.
  - agent는 `frontend/backend` 실행을 스킬보다 먼저 수행하도록 skill 문서에서 유도할 수 있다.
  - Spring personal profile은 Java package lower-case 예외를 갖되, frontend `camelCase` path 규칙과 충돌하지 않도록 별도 validator로 분리할 수 있다.
- Risks:
  - root workspace 도입이 기존 evaluation scripts와 충돌하면 bootstrap 방식을 `tools/dev-cli` 단일 package로 축소해야 할 수 있다.
  - JSON help contract가 너무 느슨하면 profile drift를 막지 못하고, 너무 빡빡하면 향후 `company/*` 확장성이 떨어질 수 있다.
  - backend Spring baseline이 너무 넓으면 v1 구현 범위를 과도하게 키울 수 있다.

## Parallel Feasibility Matrix

| Work Unit | 예상 변경 파일군 | 선행 산출물 의존 | 충돌 여부 | 병렬 가능 |
| --------- | ---------------- | ---------------- | --------- | --------- |
| cli-core-runtime | `package.json`, `pnpm-workspace.yaml`, `packages/dev-cli/src/core/*`, `packages/frontend/*`, `packages/backend/*` | 없음 | 높음(공유 핵심 파일) | 아니오 |
| profile-bundles | `profiles/shared/*`, `profiles/frontend/*`, `profiles/backend/*`, `packages/dev-cli/src/validators/*` | core runtime 계약 | 높음(shared schema) | 아니오 |
| skill-doc-integration | `plugin/skills/*/SKILL.md`, `docs/dev-cli-design.md`, FAQ 문서 | core/runtime와 profile 경로 확정 | 중간 | 아니오 |

결론:

- core runtime, profile schema, skill 문서가 같은 명령 표면과 경로 계약을 공유하므로 순차 실행이 적합하다.

## Execution Mode Decision

- `sequential`
- 근거:
  - command router, help contract, profile loader가 선행 확정돼야 이후 profile bundle과 skill 문서가 안정적으로 붙는다.
  - 공유 파일군과 shared schema overlap이 커서 병렬 충돌 리스크가 높다.

## Critical Path

1. root workspace + `packages/dev-cli` core 계약 확정
2. shared/personal/v1 + `frontend/backend` profile bundle 구현
3. validator/help renderer와 `--dry-run` 동작 고정
4. skill/docs를 CLI-first 흐름으로 전환

## Track Dependency Graph

- Sequential mode에서는 별도 track graph 없음.

## Failure Escalation Policy

- root workspace 도입이 기존 repo tooling을 깨면 구현을 즉시 멈추고 `tools/dev-cli` 단일 package 폴백으로 전환한다.
- shared schema가 `frontend/backend` 요구를 동시에 만족하지 못하면 `shared`를 최소 규칙만 남기고 profile-local override 범위를 넓힌다.
- backend Spring profile 범위가 과도하면 `module`, `requestDto`, `responseDto`, `entity`까지만 남기고 `service/controller/repository` 개별 generator는 후속 범위로 내린다.

## 단계별 실행

상세 routing, `owner_agent`, `primary_skill`, merge 규칙은 `references/planning-policy.md`를 따른다.
테스트 아티팩트는 planning 단계에서 flat하게 유지하고, 최종 소스 트리 배치는 구현 단계에서 coding-rules 및 로컬 관례로 resolve한다.

### Phase 1

- owner_agent: `backend-developer`
- 작업:
  - repo 루트에 `pnpm` workspace bootstrap 파일을 추가한다.
  - `packages/dev-cli` 패키지와 `frontend`, `backend` wrapper 구조를 만든다.
  - command router, profile loader, mode resolver, help renderer, dry-run writer, exit code 정책을 구현한다.
  - JSON 기본 help, non-interactive 기본값, deterministic error payload, explicit input flags를 contract로 고정한다.
- 산출물:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `packages/dev-cli/package.json`
  - `packages/frontend/*`
  - `packages/backend/*`
  - `packages/dev-cli/src/core/*`
- 단위 테스트 의도: `boundary=utility`, `placement_intent=shared`, `artifact=command-router.test.mjs`, `profile-loader.test.mjs`, `help-renderer.test.mjs`
- E2E 테스트 의도: `N/A (CLI surface이며 browser/mobile bounded UI가 아니다)`

### Phase 2

- owner_agent: `frontend-developer`
- primary_skill: `frontend-dev`
- 작업:
  - `profiles/shared/personal/v1`과 `profiles/frontend/personal/v1`를 작성한다.
  - `frontend component`, `frontend hook`, `frontend apiHook`, `frontend type` template와 validator를 만든다.
  - UI shell 금지 패턴과 allowed UI state, hook naming, query/mutation baseline을 하나의 frontend validator contract에 반영한다.
  - `--help` JSON examples와 text renderer metadata를 profile에 채운다.
- 산출물:
  - `profiles/shared/personal/v1/profile.json`
  - `profiles/frontend/personal/v1/profile.json`
  - `profiles/frontend/personal/v1/templates/*`
  - `packages/dev-cli/src/validators/frontend-validator.mjs`
- 단위 테스트 의도: `boundary=validator`, `placement_intent=shared`, `artifact=frontend-profile.test.mjs`
- E2E 테스트 의도: `N/A (CLI surface)`

### Phase 3

- owner_agent: `backend-developer`
- primary_skill: `backend-dev`
- 작업:
  - `profiles/backend/personal/v1`를 작성한다.
  - `backend module`, `requestDto`, `responseDto`, `entity` template와 validator를 만든다.
  - Spring root package, lower-case package path, validation/error handling baseline을 help/validator에 반영한다.
- 산출물:
  - `profiles/backend/personal/v1/profile.json`
  - `profiles/backend/personal/v1/templates/*`
  - `packages/dev-cli/src/validators/backend-validator.mjs`
- 단위 테스트 의도: `boundary=validator`, `placement_intent=shared`, `artifact=backend-profile.test.mjs`
- E2E 테스트 의도: `N/A (CLI surface)`

### Phase 4

- owner_agent: `backend-developer`
- 작업:
  - `plugin/skills/frontend-dev/SKILL.md`, `plugin/skills/backend-dev/SKILL.md`를 CLI-first 흐름으로 업데이트한다.
  - `docs/dev-cli-design.md`와 관련 FAQ를 새 구조로 정리한다.
  - validation command와 local usage examples를 문서에 추가한다.
- 산출물:
  - `plugin/skills/frontend-dev/SKILL.md`
  - `plugin/skills/backend-dev/SKILL.md`
  - `docs/dev-cli-design.md`
  - `plugin/skills/help-try/references/faq.md`

## 파일 변경 목록

- 수정:
  - `plugin/skills/frontend-dev/SKILL.md`
  - `plugin/skills/backend-dev/SKILL.md`
  - `docs/dev-cli-design.md`
  - `plugin/skills/help-try/references/faq.md`
- 신규:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `packages/dev-cli/package.json`
  - `packages/frontend/*`
  - `packages/backend/*`
  - `packages/dev-cli/src/core/*`
  - `packages/dev-cli/src/validators/*`
  - `profiles/shared/personal/v1/*`
  - `profiles/frontend/personal/v1/*`
  - `profiles/backend/personal/v1/*`
  - `plans/dev-cli-agent-first/plan.md`
  - `plans/dev-cli-agent-first/tests/manifest.md`
  - `plans/dev-cli-agent-first/tests/command-router.test.mjs`
  - `plans/dev-cli-agent-first/tests/profile-loader.test.mjs`
  - `plans/dev-cli-agent-first/tests/help-renderer.test.mjs`
  - `plans/dev-cli-agent-first/tests/frontend-profile.test.mjs`
  - `plans/dev-cli-agent-first/tests/backend-profile.test.mjs`
- 삭제:
  - 없음

## 검증 명령

1. `pnpm install`
2. `pnpm --dir packages/dev-cli test`
3. `pnpm --dir packages/frontend exec frontend --help`
4. `pnpm --dir packages/frontend exec frontend component --json "{\"name\":\"HomePage\",\"path\":\"page/homePage\"}" --dry-run`
5. `pnpm --dir packages/frontend exec frontend hook --json "{\"name\":\"useScroll\",\"path\":\"hooks/utils\"}" --dry-run`
6. `pnpm --dir packages/frontend exec frontend apiHook --json "{\"name\":\"useGetProduct\",\"path\":\"hooks/apis/product/queries\",\"kind\":\"query\"}" --dry-run`
7. `pnpm --dir packages/backend exec backend module --json "{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}" --dry-run`

## 종료 기준

- [ ] `frontend`, `backend`가 동일한 core engine 위에서 동작한다.
- [ ] `--help` 기본 출력이 JSON이고 `<command> --help`가 command-scoped JSON detail을 반환한다.
- [ ] `frontend`, `backend` personal v1 profile이 실제 scaffold와 validator를 제공한다.
- [ ] `frontend`는 UI shell과 hook/api 규칙을 생성 단계에서 강제한다.
- [ ] `backend`는 Spring root package 및 feature package baseline을 help/validator에 반영한다.
- [ ] skill 문서가 CLI-first 흐름으로 갱신된다.

## 최종 인수 체크리스트

- [ ] 차단성 정책 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 구현/테스트 범위가 일치함
- [ ] `Explicit Defaults`는 저위험 기본값만 포함함
- [ ] 최종 테스트 배치는 구현 단계에서만 resolve하도록 유지함

## 롤백/폴백

- 롤백 방법: root workspace 도입이 문제를 일으키면 `package.json`, `pnpm-workspace.yaml` 추가를 되돌리고 `tools/dev-cli` 단일 package 설계로 축소한다.
- 폴백 조건: profile schema가 과도하게 복잡해지면 `shared/personal/v1`는 최소 규칙만 남기고, profile-local JSON과 validator 우선 구조로 단순화한다.

## 품질 게이트 결정

- Unit: `run` - command router, profile loader, help renderer, validator는 모두 명확한 logic boundary다.
- E2E: `skip` - CLI surface이며 browser/mobile bounded UI contract가 아니다.

## Self-review

- [ ] owner_agent 미지정 없음
- [ ] 차단성 정책/계약/UX 모호성이 남아 있지 않음
- [ ] `Resolved Decisions`와 `Explicit Defaults`가 구분되어 있음
- [ ] 실행/검증 명령 명시
- [ ] 순차 모드인데 track 파일이 생성되지 않음
