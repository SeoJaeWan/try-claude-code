# Test Authoring Conventions Reference

Use this whenever `plan-tdd` creates, updates, deletes, or skips source-tree tests. This file defines common source-tree test authoring mechanics; use the active plan wiki for policy-level rules about test ownership, final recipients, behavior-example names, and selected coverage.

## Intent and naming

- Write source-tree test names as behavior examples: `{condition}에서 {action}하면 {expected result}가 나온다`.
- If there is no user action, name the function call, state transition, command, or event that triggers the output.
- Keep `describe` focused on the small behavior owner, rendered boundary, UI area, or journey.
- Put plan-clause tracing, phase names, test type, coverage tables, and TDD report mechanics in `tdd.md`, not in source-tree test names.
- Do not name tests after internal TDD terms such as `coverage`, `matrix`, `boundary`, `contract`, `owner`, `final recipient`, or `surface` unless those are exact product/domain terms in the repository.
- For table-driven tests, each row must include a readable `caseName` that states condition, action, and expected result.

## Language

- Use Korean-first `describe`, `it`, `test`, and row names unless the repository has an established English-only style.
- Keep English for code identifiers, API names, component names, props, callbacks, routes, test IDs, runner APIs, domain constants, event names, and exact product copy.
- Avoid planner shorthand in human-readable test intent text; prefer Korean terms such as `사용자 행동`, `완료 조건`, `변경 경계`, and `공개 경계`.

## Assertion shape

- The assertions must directly prove the result named by the test or row sentence.
- Assert the positive or allowed output first when the plan defines both allowed and forbidden/no-op outputs.
- Add negative/no-op assertions only when they belong to the same selected scenario or declared risk pattern.
- Prefer concrete final outputs over proxy markers: visible DOM, accessible state, emitted callback, submitted payload, selected state, serialized result, route output, persisted record, or generated code.
- Do not add generic happy-path, edge-case, exception, or regression assertions unless the selected plan clause or selected risk pattern requires them.

## Ownership

- Reuse or update the existing owner test before creating a new one.
- Do not scatter one selected scenario across multiple layers when one owner closes it at the right boundary.
- Delete or update stale owner tests when they freeze obsolete canonical truth for a selected clause.
- Keep tests inside the app/module that owns the selected behavior; do not move tests to an adjacent package only to reuse its runner.
