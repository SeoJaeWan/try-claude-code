---
name: plan-materialize
description: Create or update source-tree TDD contract tests, runtime integration tests, and selected E2E tests from an architect plan. Use after `architect` when a reviewer-facing `plan.md` and linked phase detail files define implementation boundaries and completion contracts, including first-work situations where the target app or test harness may not exist yet but Codex must still materialize failing/blocked tests that gate plan completion, plus owner-test migration, bounded UI-area coverage, explicitly selected full-flow journeys such as auth/session, redirect, and cross-route behavior, and Korean-first materialization reports/test descriptions that keep English only for code, runner, schema, and exact identifier terms.
---

# Plan Materialize

Turn an `architect` plan into source-tree tests and a plan-local materialization report without touching production code.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for purpose, inputs, blocker taxonomy, report fields, output contract, and language rules.
2. [references/workflow.md](references/workflow.md) for test convention detection, clause extraction, classification, materialization, validation, reporting, and completion checks.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable test-materialization constraints.
4. [../architect/references/terminology-policy.md](../architect/references/terminology-policy.md) before writing report prose or test intent text.

Read these references only when the corresponding scope is active:

- [references/unit-test-conventions.md](references/unit-test-conventions.md) when logic boundaries are in scope.
- [references/e2e-test-conventions.md](references/e2e-test-conventions.md) when frontend UI areas or full-flow journeys are in scope.

## Controller Rules

- Write or update test files only; never implement production code.
- Materialize only selected plan clauses and affected owner tests, not plan-adjacent regression coverage.
- Stop with an explicit blocker when the plan does not define enough contract, topology, runner, placement, or scenario detail.
- Write `materialize.md` as a helper artifact; keep source-tree tests as the durable source of truth.
- Use Korean-first report prose and test intent text while preserving exact commands, paths, identifiers, metadata keys, and test runner terms.
