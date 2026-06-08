# Plan TDD Contracts

## Purpose

Turn an executable plan artifact into source-tree TDD contract tests and a trustworthy gate report that close the full selected plan contract without touching production code, using plan-clause and `scenario_id` traceability, owner-test impact scanning, the plan's locked verification units, and local or planned test conventions before selecting concrete owners. Missing first-time app/test harness setup does not by itself excuse weak tests: author completion-blocking TDD contract tests from the plan's locked runner, command, spec-root, and topology contract when possible, mark validation as not run/failed until the harness exists, and block only when the plan does not define enough test environment or scenario contract to author executable tests. The report must also expose a browser-review-readable mapping from plan row/scenario to test, command, expected red/result, manual smoke gate, or blocker so `plan-review` can detect plan-to-test subset loss before implementation.

## Entry Notes

Author TDD contract tests after planning, not during implementation.

- Write or update test files only
- Keep the source tree as the source of truth
- Treat generated tests as frozen contracts
- Treat TDD contract tests as plan completion gates: the plan is not complete until these tests or their named execution commands pass after implementation
- Prefer modify-first over duplicate test creation
- Author the full selected plan contract, not plan-adjacent regression coverage
- Author behavior, flow, state, transformation, and final-output contracts as failing-capable tests; do not downgrade them to file-existence, text-presence, or smoke checks
- Allow new assertions only when they trace back to an explicit plan clause or a risk pattern already implied by that clause
- Update or delete stale owner tests when a selected clause changes the canonical truth they freeze
- Distinguish TDD contract test authoring completion from gate pass/fail in the final report
- When the target app/module or runner setup is not implemented yet but the plan locks the runner, command path, source/test topology, and behavior contract, still create source-tree TDD contract tests. Do not call them "covered" by scaffold alone; report validation as not run/failed and keep them as completion blockers.
- Treat plan-locked future route files, source modules, spec roots, locator/test id policy, mock/API fixtures, and browser storage/auth state as intentional TDD contracts. Do not reinterpret them as speculative only because the implementation does not exist yet.
- Use source-inspection tests only when the selected plan clause makes source topology itself the durable behavior, such as workspace membership, public export presence, route file topology, or required config ownership. Do not use source inspection as a substitute for user-visible behavior, state transitions, runtime wiring, code generation, route outcomes, or UI flow.

## First-Time Test Contract Fields

Use this section as the source of truth when the target app, test harness, runner config, or package ownership does not exist yet.

The selected plan must lock:

- first-time runner or test stack
- command path or package script
- spec root or test file placement
- source/test topology when tests define future route, module, package, or app structure
- config owner or browser/mobile bootstrap command when the runner needs it
- selected scenario contract with observable output and important negative/no-op output
- expected red reason and completion gate
- mock/API fixture, storage state, auth state, seeded data, and locator/test id policy when the test needs them before real integration exists

When these fields are locked, author the red contract tests and record missing setup as a failed completion gate. When they are not locked, use `blocker_type = plan_contract` and `blocker_code = first_time_test_contract_missing`.

Layer convention references must not redefine this blocker taxonomy. They may add only layer-specific runner, bootstrap, locator, or assertion guidance.

## Inputs to inspect

1. Current executable plan file:
    - `./plans/**/plan.md`
2. Linked phase detail files referenced from the selected `plan.md`
3. Optional orchestrator handoff in the latest conversation context when invoked by `orchestrator`:
    - `task_slug`
    - `plan_path`
    - optional `plan_signature`
    - optional `dev_wiki_root`
4. Existing plan-local report when present:
    - `tdd.md` adjacent to the selected executable plan
5. Local or planned test config and existing tests:
    - unit signals: `package.json`, `vitest.config.*`, `jest.config.*`, `pom.xml`, `build.gradle*`, `mvnw`, `gradlew`, existing `*.test.*` / `*.spec.*`
    - Component Test signals: Testing Library/jsdom setup, Playwright component setup, Storybook interaction tests, existing rendered component specs, and repo-local component harness conventions
    - E2E signals: `playwright.config.*`, `.maestro/`, existing browser/mobile E2E files
    - first-work signals from the selected plan: planned package script names, planned runner, planned config paths, planned source/test topology, planned spec roots, mock/API fixture policy, storage/auth state policy, and planned browser/mobile bootstrap commands
6. `./references/test-authoring-conventions.md` before writing source-tree tests
7. `./references/unit-test-conventions.md` when logic boundaries are in scope
8. `./references/component-test-conventions.md` when component rendering or same-screen interaction boundaries are in scope
9. `./references/e2e-test-conventions.md` when frontend browser journeys are in scope
10. Active plan wiki `core/common/용어-정책.md` before writing report prose or test intent text
11. `../dev-wiki-setup/references/consumer-context.md` when `dev_wiki_root` is provided

## Output contract

- Plan-local report:
    - `tdd.md` adjacent to the selected executable plan
    - fixed review sections in `tdd.md`: `## Plan review 검증 매핑`, `## Manual smoke 필요 항목`, and `## TDD blocker`
- Source-tree test changes:
    - updated or created `*.test.*`, `*.spec.*`, page objects, fixtures, and split UI-area registries when needed
- Red contract status:
    - expected red reason, actual red result, whether the red result matches the plan, and the completion gate that must become green after implementation
- Output language: Korean where test descriptions are authored
- Report and test intent language: Korean-first, following the active plan wiki terminology policy
