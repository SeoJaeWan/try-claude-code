# Plan Materialize Workflow

## Workflow

### Step 0. Detect local or planned test conventions first

- Inspect the repository before generating anything
- Detect existing runners, assertion style, mocking style, naming, and file layout
- Reuse the current stack; do not introduce a new unit, Component Test, or E2E framework unless the selected plan explicitly locks that first-time test stack
- Before creating tests under a planned new source tree, confirm the plan locks the production topology and test-owner placement as contracts rather than examples
- If the plan's concrete paths could be interpreted as tentative candidates, or if writing tests would force a hook/model/utility/runtime folder decision the plan did not justify, stop with `blocker_type = plan_ambiguity`
- If the target app/module implementation tree or runner config is missing but the selected plan explicitly locks the planned runner and command path, enter `TDD contract mode`
- In `TDD contract mode`, you may create missing source-tree test directories and owner test files even when the target app/module implementation tree is missing
- In `TDD contract mode`, missing runner/config/package ownership does not block writing tests by itself as long as:
  - the planned runner is explicitly locked by the plan
  - the planned command path and spec root or test file placement are explicitly locked by the plan
  - the selected plan exposes enough behavior contract to author failing-capable tests
  - the repository already signals the same broad stack or adjacent convention strongly enough to author tests consistently, or the plan locks a first-time stack
  - the report records which validation commands could not be run yet and states that plan completion remains blocked until they pass
- Do not place tests in an adjacent package only because that package has an existing runner. The owner test must live in the target app/module that owns the selected behavior, unless the plan explicitly selects the adjacent package as the durable owner.
- If a needed test type has no existing setup, stop immediately with:
  - `outcome = blocked`
  - `blocker_type = external_setup`
  - `blocker_code = setup_missing`
  - `next_action = stop`
  - `resume_from = materialize`
  only when the plan also fails to lock the runner, command path, and placement strongly enough to author a TDD contract test
- If placement or stack is ambiguous because local conventions are missing or conflicting, stop with:
  - `outcome = blocked`
  - `blocker_type = external_setup`
  - `blocker_code = local_convention_missing`
  - `next_action = stop`
  - `resume_from = materialize`

### Step 1. Determine execution mode

- If an explicit orchestrator handoff provides `task_slug` and `plan_path`, enter orchestrated mode
- Otherwise enter direct mode

### Step 2. Extract plan clauses and scenario contracts before test classification

Read `plan.md` first to understand the human-facing phase order and intended change.
Then read the linked phase detail files and enumerate every selected phase-local clause from:

- `output`
- `제약`
- `failure/validation`
- `검증`

Treat these as first-class coverage obligations.
- In orchestrated mode:
  - use the provided `plan_path` as the authoritative plan path
  - if a current `plan_signature` is provided, treat it as the authoritative freshness fingerprint for this pass
- In direct mode:
  - load every phase detail file linked from the current `plan.md`
- In orchestrated mode, do not rely on stale prior metadata when the current plan files on disk have changed.

For each clause, record:

- phase
- clause source: `output` | `constraint` | `failure-validation` | `validation`
- clause text
- whether the clause is directly test-expressible or requires an execution command

Then extract each phase-local boundary from the detail file `boundary`, `input`, `output`, and task description only to the extent needed to close those selected clauses.

For every behavior-changing boundary, derive a stable scenario contract first:

- condition or starting state
- scenario or trigger
- user action or function call when applicable
- inputs and preconditions
- canonical outputs that must happen
- negative outputs that must not happen when policy depends on absence
- recipient, delivery target, or final interpretation boundary when route behavior, notification, permission, or interpretation matters
- key invariants
- source-tree test sentence in a concrete behavior-example form, such as `{condition}에서 {action}하면 {expected result}가 나온다`

Write the source-tree test sentence before choosing assertions. It must read as a behavior example, not as a materialization report row. Keep plan-clause traceability in `materialize.md`; use `describe` / `it` / `test` names to show the concrete condition, action, and result that the test proves.

Also inspect whether the scenario carries any high-risk execution pattern:

- competing completion paths
- deferred execution path
- terminal state rule
- loser path must be no-op
- side effect coupled to state

If a clause is not directly test-expressible, do not pretend adjacent tests cover it.
Map it to the narrowest execution command already selected by the plan, or return a blocker.
For UI and flow clauses, derive the user interaction sequence and observable outcome before mapping the plan's locked verification unit to Component Test or E2E. A test that only asserts page load, panel title visibility, copy-button existence, or absence of console errors does not close a clause about synchronized state, canonical output, route interpretation, validation, or workflow completion.
For function, mapper, codegen, state, permission, selection, or serialization clauses, derive the input object/state and exact output or negative output before mapping to unit or Component Test coverage.
When a selected scenario has both a valid output and a prohibited output, materialize the valid output first, then add the prohibited/no-op assertion. Negative-only coverage is insufficient when the plan also defines what must happen.
If the phase detail files do not expose enough information to derive this `input -> output` contract, stop and return the missing contract to `architect`.
If a scenario could plausibly be owned by more than one verification unit and the phase detail file does not lock `unit`, `Component Test`, `E2E`, a command, or an explicit skip/block reason, stop and return the missing test-strategy contract to `architect`.
If a UI-facing scenario lacks the observable result or stable identifier policy needed to author a deterministic Component Test or E2E test, stop and return the missing observability contract to `architect`.
If `plan.md` and a linked phase detail file disagree on what changes in that phase, stop and return a blocker instead of picking one.
If source topology affects owner-test placement and the plan does not clearly distinguish committed paths from examples or candidates, stop and return a blocker instead of letting tests establish the structure.
If 2 or more plausible sibling outputs, identifiers, data shapes, transformation paths, or interpretation boundaries could satisfy the same scenario, stop and return a blocker instead of choosing one.
If the phase detail file implies one of the high-risk execution patterns above but does not define the relevant invariant, stop and return a blocker instead of inferring policy.
If a selected plan clause cannot be mapped to an owner test or a narrow execution command, stop and return a blocker instead of soft-skipping it.

Blocker typing rules:

- use `blocker_type = plan_ambiguity` when the plan contract is incomplete, contradictory, or under-specified
- use `blocker_type = plan_ambiguity` when plan-materialize would otherwise have to choose production or test topology that architect did not lock
- use `blocker_type = user_policy` only when the blocker truly depends on a fresh user decision rather than a missing technical contract
- use `blocker_type = external_setup` only when the source tree or test environment is missing a prerequisite that the current plan revision cannot supply

### Step 3. Scan affected existing owner tests before choosing layers

- Before classifying test layers, search for existing owner tests that already freeze the selected clause's boundary or observable contract
- Build an affected-owner set across local unit, Component Test, compare, and E2E owners:
  - `keep` when the existing owner still expresses the same canonical contract
  - `update` when the owner boundary survives but its assertions or helpers freeze obsolete truth
  - `delete` when the selected plan retires that owner boundary or makes the old owner actively misleading
- Treat stale passing tests that still lock old truth as in-scope work, not optional cleanup
- Do not widen this into unrelated regression gardening; include only tests whose assertions, helper contracts, or owner role would become misleading after the selected clause changes
- If you cannot tell whether a nearby owner test still expresses the same canonical contract, inspect it and decide `keep`, `update`, or `delete` before continuing

### Step 4. Map scenario boundaries to locked verification units

Classification rules:

- Apply classification only to clauses explicitly selected by the plan
- Prefer the smallest owner-test set that closes every selected clause
- Do not create an additional layer of tests when an existing owner test can close the selected clause at the correct boundary
- Outcome-selection boundary: unit test is mandatory
    - covers conditionals, branching, state transitions, permission checks, routing choices, result selection, and winner/loser path rules
- Boundary-contract boundary: unit test is mandatory
    - covers data shapes, identifiers, mappers, adapters, request/response contracts, and handoff formats between layers when the plan selects that contract as changed or validated
- Final-interpretation boundary: unit test is mandatory
    - covers template rendering, UI state interpretation, message mapping, serializer output, and any feature-specific transformation that defines the final user-visible or externally consumed output when the plan selects that interpretation as part of its contract
- Logic boundary: unit test is mandatory
    - applies to frontend and backend logic such as hooks, services, validators, mappers, utilities, use cases, controllers, and domain policies when the plan changes or validates that logic boundary
- Component interaction boundary: Component Test is mandatory when the selected clause covers component rendering, props/callback handoff, form interaction, conditional UI, accessibility wiring, hook-to-DOM wiring, mount/unmount lifetime, event choreography, host-owned coordination, mutual exclusion, or same-screen UI synchronization that does not require a real browser engine.
- Browser-dependent rendered-area boundary: E2E is selected only when the plan locks a browser-owned reason.
  - use when the selected clause depends on actual browser rendering, CSS animation timing, layout engine output, pointer semantics, focus navigation, cross-route behavior, auth/session, redirect chain, persisted browser state, or other browser-only behavior that a stable unit or Component Test owner cannot close from input to observable output
- User flow or UI synchronization boundary: E2E is mandatory only when the selected clause says a user interaction must change cross-route outputs, copied browser text, URL, active navigation, persisted browser state, focus behavior requiring a browser, route interpretation, or a release-critical journey. Component Test may own same-screen synchronization when the plan limits the clause to a component or screen harness.
- Do not escalate a stable logic or component contract to E2E when an existing unit or Component Test owner can close the selected clause at the correct boundary
- Presentation-only change: E2E is skipped unless the plan explicitly locks browser-rendered presentation as the durable acceptance gate
- Cross-route journey, auth/session transition, redirect chain, persisted browser state, or release-critical flow explicitly selected by the plan: full-flow E2E is mandatory when the existing configured runner can own the journey
- Export or import inventory is not a test boundary by default
    - materialize it only when the plan explicitly selects a stable public API contract whose presence or absence is itself the feature behavior
    - do not materialize package-root re-export wiring, owner-entry identity checks, or negative export absence checks when they only freeze internal module plumbing rather than external feature behavior
- Volatile metadata snapshots are not a test boundary by default
    - do not freeze exact item counts, temporary inventory splits, deprecated/excluded sibling names, or current registry internals unless the plan identifies that exact inventory as the durable user-visible contract
    - prefer tests for how the app consumes a registry or selected entry over duplicating registry contents in assertions
- Source topology boundary: source-inspection tests are allowed only when the plan selects the source topology as the contract. Pair them with behavior tests whenever the topology exists to enable user-visible behavior or runtime interpretation.

### Step 5. Map boundaries to existing tests and affected owners

Always try to update an existing test before creating a new one.
Every selected clause must end this step in exactly one state:

- covered by existing source-tree test without edits
- covered by updated or new source-tree test
- covered by a narrow execution command already named by the plan
- blocked

`covered` means the test would fail if the selected behavior, state transition, final output, or explicitly selected source topology is wrong. A test that only checks a nearby file exists, a route loads, a label appears, or a button can be clicked is not coverage for a richer plan clause unless that exact weak observation is the clause.

Before finalizing `create`, `update`, or `delete`, reconcile the affected-owner set from Step 3 so no stale canonical owner survives by accident.

#### Unit tests

- Search for an existing boundary test near the target code using local naming/layout conventions
- Prefer the smallest existing owner-test set that can close all selected clauses for that boundary
- Prefer the test that already owns the scenario's selection, contract, or final-interpretation boundary instead of creating parallel tests for sibling contracts
- If the same boundary is already covered, update that test file instead of adding a duplicate
- Create a new unit test file only when no stable existing boundary test exists
- Allow `skip` only when the existing source-tree test already closes the exact selected clause with no wording or assertion drift
- Do not edit unrelated passing tests just for suite cleanup when they are outside the selected plan clauses and outside the affected-owner set

#### Component Tests

- Reuse existing repo-local Component Test or rendered-harness owner patterns such as component `*.test.*`, `*.spec.*`, `*.runtime.test.*`, Storybook interaction tests, or Playwright component specs when they exist
- Prefer the stable Component Test owner for rendered hook behavior, DOM lifetime, event choreography, host-owned coordination, same-screen synchronization, and observable state markers that do not require a real browser engine
- If an existing Component Test owner freezes obsolete truth, update or delete that owner before creating a parallel replacement
- Do not treat compare or static visual baseline owners as Component Test owners unless the plan explicitly selects that frozen visual contract as the durable feature behavior
- Allow `skip` only when an existing Component Test owner already closes the exact selected clause with no wording or assertion drift

#### E2E tests

- Use `journey_id` or `surface_id` metadata when present in existing spec headers
- Fallback order:
    1. `@journey_id`
    2. `@surface_id`
    3. `@route`
    4. existing file name, locator contract, or nearby page object usage
- Default policy: `modify-first, create-if-new-owner`
- Split one owner into multiple specs only when the existing file becomes materially too large or divergent
- When split is required, add a small registry file for that UI area
- If the selected user-visible clause has no stable owner UI area or journey and local conventions do not expose a stable place to create one, return a blocker with:
  - `outcome = blocked`
  - `blocker_type = external_setup`
  - `blocker_code = owner_spec_missing`
  - `next_action = stop`
  - `resume_from = materialize`

### Step 6. Materialize unit tests

- Follow `references/unit-test-conventions.md`
- Follow `references/test-authoring-conventions.md`
- Write tests directly into the source tree using the repo's current test layout
- Keep tests boundary-first, scenario-anchored, and deterministic
- Prefer direct unit tests for deterministic logic, mapper, codegen, serializer, selector, state reducer, permission, validation, and final interpretation boundaries
- Derive every new assertion from an explicit selected plan clause or a risk-pattern invariant already implied by that clause
- Update existing unit tests when the boundary already exists
- Create new unit tests only when needed to cover a new logic boundary
- Create a new helper test file only when the plan implies a stable logic boundary that can own the scenario long-term
    - if the invariant naturally belongs inside an existing selection or projection helper, fold coverage into that boundary instead of creating one-helper-per-rule files
- Cover both `must happen` and important `must not happen` outputs when the scenario contract requires them
- Put the best-case or valid-output assertion before negative/no-op assertions when both are part of the same selected behavior
- When the scenario has competing completion paths, pin both the winning path and the losing path that must become no-op
- When the scenario has deferred execution, pin the terminal state and verify that disallowed side effects do not fire on rejected or losing paths
- When side effects are coupled to state, verify the side effect only occurs on the state transition that is allowed to emit it
- If the scenario introduces a new final output interpretation path, add a test at that final-interpretation boundary instead of stopping at an earlier boundary-contract test
- Do not treat selection-only tests or boundary-contract tests as sufficient when the final interpreted output is a feature-specific contract
- When one execution path replaces another, assert the replacement behavior at the observable boundary, not only object identity. For callbacks or handlers, call the resulting handler or drive the interaction and assert the allowed handler fires while the disallowed path does not.
- Do not harden a sibling contract that the plan did not select as canonical
- Do not add generic happy-path, edge-case, or exception assertions unless the selected clause or its risk pattern requires them
- If the plan's terminal state retires a boundary or UI area, delete the obsolete test instead of replacing it with a placeholder test
- Do not edit production code, fixtures outside the test tree, or test config during this skill
- If the unit test imports a planned module that does not exist yet, keep the import to the planned path when that path is locked by the plan and report the test as a completion-blocking red contract. Do not replace it with filesystem/string inspection just to make the suite pass.

### Step 7. Materialize Component Tests

- Follow `references/component-test-conventions.md`
- Follow `references/test-authoring-conventions.md`
- Follow the repo's existing rendered-harness and component-owner patterns before inventing a new style
- Keep Component Tests focused on observable input -> output contracts:
  - DOM presence or absence
  - phase or state markers
  - mount/unmount timing owned by the boundary
  - event choreography and host-owned coordination
  - props/callback handoff and submitted payloads
  - same-screen visible state synchronization
  - important no-op and stale-path behavior
- Prefer observable state markers, callbacks, and owner-managed DOM outcomes over presentation-only styling assertions
- Do not freeze decorative layout, exact color, or other high-churn presentation details unless the selected clause makes that visual contract durable
- Do not shrink a browser-dependent clause into Component Test coverage when the selected contract requires a real browser engine

### Step 8. Materialize E2E tests

- Follow `references/e2e-test-conventions.md`
- Follow `references/test-authoring-conventions.md`
- Use only the runner already configured in the project
- In `TDD contract mode`, use the runner and spec root explicitly locked by the plan even if the config file is not implemented yet; record the command as not run/failed until the harness exists
- Materialize only the selected browser journey tests; do not add plan-external regression sweeps
- Derive every scenario and assertion from explicit selected plan clauses only
- For E2E synchronization clauses, drive the actual user controls and assert every selected browser-owned visible/output recipient that must share state, such as copied text, URL, active navigation, persisted state, cross-route result, or submitted payload
- Do not count "route loads", "section headings are visible", "no console errors", or "copy result is non-empty" as sufficient unless the selected clause is exactly a smoke/reachability contract
- Update the existing owner test when the same UI area or journey already exists
- If the plan retires the selected UI area or journey entirely, delete the obsolete owner test instead of inventing a replacement smoke path
- Add metadata comments to E2E specs so future updates can find them reliably
- When split is required, create a registry file only for that UI area

### Step 9. Run targeted validation

After editing tests, run the narrowest available validation commands for the changed coverage:

- Prefer the exact narrow test command already named in the selected plan
- Otherwise run the affected owner-test set directly with the existing runner, not only the newly created files
- Do not widen targeted validation into a full suite unless the plan explicitly selects that suite as the validation target
- For non-test execution clauses such as `tsc`, `build`, or manual inspection, record the required command or blocker explicitly; do not silently count targeted tests as equivalent
- If any targeted validation for the affected owner-test set fails, record that as a gate failure; do not present materialization completion as equivalent to a passed gate
- In `TDD contract mode`, if the selected command path or runner/config ownership is not implemented yet, do not block after writing the tests. Record those commands as `not run`, set `gate_status = failed`, and explain that the materialized tests are completion-blocking red contracts until the planned harness exists and passes them.

### Step 10. Write the materialization report

Write `materialize.md` adjacent to the selected executable `plan.md`.

This report is a helper artifact, not the source of truth.
The source of truth is the actual test files in the source tree.
Apply `../architect/references/terminology-policy.md` to human-readable report prose and test intent text:

- keep YAML frontmatter keys, blocker codes, test types, commands, file paths, metadata comments, API names, and code identifiers in English when they must match literally
- write clause summaries, reasons, blocker explanations, validation notes, and test descriptions in Korean-first prose
- avoid English planner shorthand such as `surface`, `user action`, `completion condition`, general `routing`, `boundary`, `contract`, `metadata`, `owner`, and `phase` when a Korean term communicates the same meaning

Include:

- a YAML frontmatter block at the top with at least:
  - `plan_path`
  - `task_slug`
  - `plan_signature`
  - `outcome`
  - `gate_status`
  - `blocker_type`
  - `blocker_code`
  - `next_action`
  - `resume_from`
  - `materialize_signature`
  - `requires_user_decision`
  - `blocked_clause_ids`
  - `affected_phase_paths`
- phase
- clause source: `output` | `constraint` | `failure-validation` | `validation`
- clause text
- clause kind: `test` | `execution`
- boundary
- scenario contract summary
- risk pattern summary when applicable
- test type: `unit` | `component` | `e2e` | `skip` | `block`
- action: `create` | `update` | `delete` | `split` | `skip` | `block` | `run`
- target file
- targeted run command when applicable
- reason
- canonical contract when applicable
- rejected sibling candidates when applicable
- red/green expectation: whether the materialized test is expected to fail before implementation, cannot run until planned harness setup, or already passes against an existing implementation

Frontmatter rules:

- `outcome`: `completed` | `blocked`
- `plan_signature`: a stable short fingerprint of the normalized current `plan.md` plus the linked phase detail files; if the orchestrator provided `plan_signature`, preserve it exactly
- `gate_status`: `passed` | `failed` | `blocked`
- `blocker_type`: `none` | `plan_ambiguity` | `user_policy` | `external_setup`
- `blocker_code`: use a specific code such as `setup_missing`, `local_convention_missing`, or `owner_spec_missing` when blocked; otherwise `none`
- `next_action`:
  - `done` when `outcome = completed`
  - `architect` when `blocker_type = plan_ambiguity`
  - `user_gate` when `blocker_type = user_policy`
  - `stop` when `blocker_type = external_setup`
- `resume_from`: `none` by default, `materialize` for `external_setup` blockers
- `materialize_signature`: a stable short fingerprint of the normalized materialization result for the currently reviewed plan
- `requires_user_decision`: `true` only when `blocker_type = user_policy`; otherwise `false`
- `blocked_clause_ids`: sorted clause identifiers blocked in this pass; use `[]` when not applicable
- `affected_phase_paths`: sorted linked phase detail paths implicated by the materialization result; use `[]` when not applicable

### Step 11. Verify before completion

- Every selected clause from `output`, `constraint`, `failure-validation`, and `validation` has an owner test, an execution command, or an explicit blocker
- Every selected test-expressible clause has explicit source-tree test coverage or an explicit blocker
- Every new or updated source-tree test has a behavior-example name that exposes the condition/action/result without relying on `materialize.md`
- Every selected execution clause has an explicit narrow command or an explicit blocker
- Every behavior-changing selected scenario has explicit `must happen` coverage, important `must not happen` coverage, or an explicit blocker
- Every user-facing interaction clause drives the selected user interaction and asserts all selected output recipients, or has an explicit blocker
- Every behavior-changing selected scenario with competing completion paths has explicit winner/loser-path coverage or an explicit blocker
- Every behavior-changing selected scenario with deferred execution or terminal-state policy has explicit terminal-state coverage or an explicit blocker
- Every behavior-changing selected scenario that introduces a feature-specific final interpretation path has final-interpretation coverage or an explicit blocker
- Every selected frontend clause that is locked to Component Test has a component action, an exact existing owner-test skip, or an explicit blocker
- Every selected frontend clause that truly requires a browser-dependent owner has an E2E action, an exact existing owner-spec skip, or an explicit blocker
- Every affected owner test in scope was reviewed as `keep`, `update`, or `delete`
- No stale owner test that freezes obsolete truth survives without an explicit keep rationale
- Every changed test file participated in a targeted validation run, or the report explains the blocker
- `gate_status = passed` only when every targeted validation command for the affected owner-test set passed
- `gate_status = failed` is valid for newly materialized TDD red contracts that fail or cannot run before implementation; do not soften failed/not-run gates into success
- Every `skip` cites the exact existing source-tree owner test that already closes the selected clause
- No assertion was added for a behavior that the selected plan did not name or imply through a declared risk pattern
- No plan-selected cross-route clause was silently deferred
- Every retired selected boundary or UI area has a delete action, surviving owner test, or explicit blocker
- No production code changed
- No new test framework was introduced
- Every updated or created E2E file includes source-tree tracking metadata, and every split UI area includes a registry file
