# Plan Materialize Contracts

## Purpose

Turn an `architect` plan into source-tree TDD contract tests and a trustworthy gate report that close the full selected plan contract without touching production code, using plan-clause traceability, owner-test impact scanning, and local or planned test conventions before selecting test layers or boundaries. Missing first-time app/test harness setup does not by itself excuse weak tests: materialize completion-blocking tests from the plan's locked runner and command contract when possible, mark validation as not run/failed until the harness exists, and block only when the plan does not define enough test environment or scenario contract to author executable tests.

## Entry Notes

Materialize tests after planning, not during implementation.

- Write or update test files only
- Keep the source tree as the source of truth
- Treat generated tests as frozen contracts
- Treat materialized tests as plan completion gates: the plan is not complete until these tests or their named execution commands pass after implementation
- Prefer modify-first over duplicate test creation
- Materialize the full selected plan contract, not plan-adjacent regression coverage
- Materialize behavior, flow, state, transformation, and final-output contracts as failing-capable tests; do not downgrade them to file-existence, text-presence, or smoke checks
- Allow new assertions only when they trace back to an explicit plan clause or a risk pattern already implied by that clause
- Update or delete stale owner tests when a selected clause changes the canonical truth they freeze
- Distinguish test materialization completion from gate pass/fail in the final report
- When the target app/module or runner setup is not implemented yet but the plan locks the runner, command path, and behavior contract, still create source-tree TDD contract tests. Do not call them "covered" by scaffold alone; report validation as not run/failed and keep them as completion blockers.
- Use source-inspection tests only when the selected plan clause makes source topology itself the durable behavior, such as workspace membership, public export presence, route file topology, or required config ownership. Do not use source inspection as a substitute for user-visible behavior, state transitions, runtime wiring, code generation, route outcomes, or UI flow.

## Inputs to inspect

1. Current executable plan file:
    - `./plans/**/plan.md`
2. Linked phase detail files referenced from the selected `plan.md`
3. Optional orchestrator handoff in the latest conversation context when invoked by `orchestrator`:
    - `task_slug`
    - `plan_path`
    - optional `plan_signature`
4. Existing plan-local report when present:
    - `materialize.md` adjacent to the selected executable plan
5. Local or planned test config and existing tests:
    - unit signals: `package.json`, `vitest.config.*`, `jest.config.*`, `pom.xml`, `build.gradle*`, `mvnw`, `gradlew`, existing `*.test.*` / `*.spec.*`
    - E2E signals: `playwright.config.*`, `.maestro/`, existing browser/mobile E2E files
    - first-work signals from the selected plan: planned package script names, planned runner, planned config paths, planned spec roots, and planned browser/mobile bootstrap commands
6. `./references/unit-test-conventions.md` when logic boundaries are in scope
7. `./references/e2e-test-conventions.md` when frontend UI boundaries are in scope
8. `../architect/references/terminology-policy.md` before writing report prose or test intent text

## Output contract

- Plan-local report:
    - `materialize.md` adjacent to the selected executable plan
- Source-tree test changes:
    - updated or created `*.test.*`, `*.spec.*`, page objects, fixtures, and split UI-area registries when needed
- Output language: Korean where test descriptions are authored
- Report and test intent language: Korean-first, following `../architect/references/terminology-policy.md`
