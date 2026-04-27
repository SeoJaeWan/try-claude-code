# Plan Materialize Guardrails

## Guardrails

- Test files only: never implement production code
- Do not create or edit test setup/config files unless the user explicitly asked for that separate setup work outside this skill
- In `TDD contract mode`, you may create missing test directories under the planned source-tree location, but still do not add production modules just to satisfy imports
- Stop when the required test setup does not already exist only if the selected plan does not lock enough runner, command, placement, and scenario information to author completion-blocking TDD contract tests
- Stop when the plan is too ambiguous to derive a stable test contract
- Stop when `plan.md` and its linked phase detail files drift enough that the technical source of truth is unclear
- Stop when a selected clause from `output`, `constraint`, `failure-validation`, or `validation` cannot be traced to a stable owner test or execution command
- Stop when canonical outputs, recipients, or negative outputs are missing for a behavior-changing scenario
- Stop when multiple plausible sibling contracts exist and the plan did not resolve the winner
- Stop when the plan introduces a new rendered, mapped, serialized, or interpreted final output but does not identify the boundary that finalizes that output
- Stop when the plan implies competing completion paths, deferred execution, terminal-state policy, or side-effect coupling but does not define the relevant invariant
- Do not create duplicate tests for an existing boundary or UI area when an update is possible
- Do not leave a stale passing owner test in place when it still freezes obsolete canonical truth for a selected clause
- Do not add test assertions, validation paths, state coverage, or edge cases that are outside the selected plan clauses or their declared risk patterns
- Do not replace behavior, flow, state, codegen, or final-output contracts with file-existence/source-string tests merely because implementation or harness files are not present yet
- Do not mark a behavior clause covered by smoke tests that only prove rendering, heading visibility, non-empty copy text, or absence of console errors
- Do not place tests in a neighboring package just because its runner currently exists; do not let test placement move the selected behavior out of its owning app/module
- Do not freeze exact export inventories or negative-only import/export assertions unless the plan explicitly identifies that inventory as the stable public contract
- Do not freeze volatile metadata snapshots such as exact registry counts, temporary source splits, deprecated sibling names, or excluded names unless the plan explicitly makes that exact snapshot the durable user-visible contract
- Do not create package-root export tests that only prove re-export identity, legacy alias absence, or private symbol absence unless the external import behavior itself is the selected durable feature contract
- Do not rely on negative/no-op assertions alone when the plan also defines a valid output; materialize the positive path first
- Do not silently shrink a selected full-flow journey into a UI-area-only test just because a narrower owner already exists
- Do not silently defer selected plan coverage to a later pass
- Do not widen targeted validation commands into full-suite regression unless the plan explicitly requires it
- Do not use `./plans` as the durable source of truth for E2E ownership; use source-tree metadata comments and split registries
- In orchestrated mode, do not invent alternate `plan_path` or `plan_signature` metadata that conflicts with the current orchestrator handoff
- Do not leave English planner shorthand in `materialize.md` explanations or test intent strings unless it is an exact identifier, schema key, command, runner term, or quoted plan text
