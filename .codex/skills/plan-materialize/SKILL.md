---
name: plan-materialize
description: Create or update source-tree unit tests, runtime integration tests, and selected E2E tests from an architect plan. Use after `architect` when a reviewer-facing `plan.md` and linked phase detail files define the implementation boundaries and technical contracts, and Codex must materialize real test files from local project conventions instead of generating flat artifacts under `./plans`, including owner-test migration, bounded-surface UI coverage, and explicitly selected full-flow journeys such as auth/session, redirect, and cross-route behavior.
---

<Skill_Guide>
<Purpose>
Turn an `architect` plan into source-tree TDD and a trustworthy gate report that close the full selected plan contract without touching production code, using plan-clause traceability, owner-test impact scanning, and local test conventions before selecting test layers or boundaries.
</Purpose>

<Instructions>
# plan-materialize

Materialize tests after planning, not during implementation.

- Write or update test files only
- Keep the source tree as the source of truth
- Treat generated tests as frozen contracts
- Prefer modify-first over duplicate test creation
- Materialize the full selected plan contract, not plan-adjacent regression coverage
- Allow new assertions only when they trace back to an explicit plan clause or a risk pattern already implied by that clause
- Update or delete stale owner tests when a selected clause changes the canonical truth they freeze
- Distinguish test materialization completion from gate pass/fail in the final report

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
5. Local test config and existing tests:
    - unit signals: `package.json`, `vitest.config.*`, `jest.config.*`, `pom.xml`, `build.gradle*`, `mvnw`, `gradlew`, existing `*.test.*` / `*.spec.*`
    - E2E signals: `playwright.config.*`, `.maestro/`, existing browser/mobile E2E files
6. `./references/unit-test-conventions.md` when logic boundaries are in scope
7. `./references/e2e-test-conventions.md` when frontend UI boundaries are in scope

## Workflow

### Step 0. Detect local test conventions first

- Inspect the repository before generating anything
- Detect existing runners, assertion style, mocking style, naming, and file layout
- Reuse the current stack; do not introduce a new unit or E2E framework
- If a needed test type has no existing setup, stop immediately with:
  - `outcome = blocked`
  - `blocker_type = external_setup`
  - `blocker_code = setup_missing`
  - `next_action = stop`
  - `resume_from = materialize`
- If placement or stack is ambiguous because local conventions are missing or conflicting, stop with:
  - `outcome = blocked`
  - `blocker_type = external_setup`
  - `blocker_code = local_convention_missing`
  - `next_action = stop`
  - `resume_from = materialize`

### Step 0.5. Determine execution mode

- If an explicit orchestrator handoff provides `task_slug` and `plan_path`, enter orchestrated mode
- Otherwise enter direct mode

### Step 1. Extract plan clauses and scenario contracts before test classification

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

- scenario or trigger
- inputs and preconditions
- canonical outputs that must happen
- negative outputs that must not happen when policy depends on absence
- recipient, delivery target, or final interpretation boundary when routing, notification, permission, or interpretation matters
- key invariants

Also inspect whether the scenario carries any high-risk execution pattern:

- competing completion paths
- deferred execution path
- terminal state rule
- loser path must be no-op
- side effect coupled to state

If a clause is not directly test-expressible, do not pretend adjacent tests cover it.
Map it to the narrowest execution command already selected by the plan, or return a blocker.
If the phase detail files do not expose enough information to derive this `input -> output` contract, stop and return the missing contract to `architect`.
If `plan.md` and a linked phase detail file disagree on what changes in that phase, stop and return a blocker instead of picking one.
If 2 or more plausible sibling outputs, identifiers, data shapes, transformation paths, or interpretation boundaries could satisfy the same scenario, stop and return a blocker instead of choosing one.
If the phase detail file implies one of the high-risk execution patterns above but does not define the relevant invariant, stop and return a blocker instead of inferring policy.
If a selected plan clause cannot be mapped to an owner test or a narrow execution command, stop and return a blocker instead of soft-skipping it.

Blocker typing rules:

- use `blocker_type = plan_ambiguity` when the plan contract is incomplete, contradictory, or under-specified
- use `blocker_type = user_policy` only when the blocker truly depends on a fresh user decision rather than a missing technical contract
- use `blocker_type = external_setup` only when the source tree or test environment is missing a prerequisite that the current plan revision cannot supply

### Step 1.3. Scan affected existing owner tests before choosing layers

- Before classifying test layers, search for existing owner tests that already freeze the selected clause's boundary or observable contract
- Build an affected-owner set across local unit, runtime, compare, and E2E owners:
  - `keep` when the existing owner still expresses the same canonical contract
  - `update` when the owner boundary survives but its assertions or helpers freeze obsolete truth
  - `delete` when the selected plan retires that owner boundary or makes the old owner actively misleading
- Treat stale passing tests that still lock old truth as in-scope work, not optional cleanup
- Do not widen this into unrelated regression gardening; include only tests whose assertions, helper contracts, or owner role would become misleading after the selected clause changes
- If you cannot tell whether a nearby owner test still expresses the same canonical contract, inspect it and decide `keep`, `update`, or `delete` before continuing

### Step 1.5. Classify scenario boundaries into test surfaces

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
- Runtime interaction boundary: runtime test is mandatory
  - covers repo-local jsdom or rendered harness owners for hook-to-DOM wiring, mount/unmount lifetime, event choreography, host-owned coordination, mutual exclusion, and other observable DOM or phase outputs that do not require a real browser engine
- Browser-dependent surface boundary: bounded-surface E2E is the default
  - use when the selected clause depends on actual browser rendering, CSS animation timing, layout engine output, pointer semantics, focus navigation, or other browser-only behavior that a stable repo-local runtime owner cannot close from input to observable output
- Do not escalate a stable logic or runtime contract to E2E when an existing unit or runtime owner can close the selected clause at the correct boundary
- Presentation-only change: E2E may be skipped only when the plan or user request makes that explicit enough to justify the skip
- Cross-route journey, auth/session transition, redirect chain, persisted browser state, or release-critical flow explicitly selected by the plan: full-flow E2E is mandatory when the existing configured runner can own the journey
- Export or import inventory is not a test boundary by default
    - materialize it only when the plan explicitly selects a stable public API contract whose presence or absence is itself the feature behavior
    - do not materialize package-root re-export wiring, owner-entry identity checks, or negative export absence checks when they only freeze internal module plumbing rather than external feature behavior

### Step 2. Map boundaries to existing tests and affected owners

Always try to update an existing test before creating a new one.
Every selected clause must end this step in exactly one state:

- covered by existing source-tree test without edits
- covered by updated or new source-tree test
- covered by a narrow execution command already named by the plan
- blocked

Before finalizing `create`, `update`, or `delete`, reconcile the affected-owner set from Step 1.3 so no stale canonical owner survives by accident.

#### Unit tests

- Search for an existing boundary test near the target code using local naming/layout conventions
- Prefer the smallest existing owner-test set that can close all selected clauses for that boundary
- Prefer the test that already owns the scenario's selection, contract, or final-interpretation boundary instead of creating parallel tests for sibling contracts
- If the same boundary is already covered, update that test file instead of adding a duplicate
- Create a new unit test file only when no stable existing boundary test exists
- Allow `skip` only when the existing source-tree test already closes the exact selected clause with no wording or assertion drift
- Do not edit unrelated passing tests just for suite cleanup when they are outside the selected plan clauses and outside the affected-owner set

#### Runtime integration tests

- Reuse existing repo-local runtime owner patterns such as `*.runtime.test.*` when they exist
- Prefer the stable runtime owner for rendered hook behavior, DOM lifetime, event choreography, host-owned coordination, and observable state markers that do not require a real browser engine
- If an existing runtime owner freezes obsolete truth, update or delete that owner before creating a parallel replacement
- Do not treat compare or static visual baseline owners as runtime owners unless the plan explicitly selects that frozen visual contract as the durable feature behavior
- Allow `skip` only when an existing runtime owner already closes the exact selected clause with no wording or assertion drift

#### E2E tests

- Use `journey_id` or `surface_id` metadata when present in existing spec headers
- Fallback order:
    1. `@journey_id`
    2. `@surface_id`
    3. `@route`
    4. existing file name, locator contract, or nearby page object usage
- Default policy: `modify-first, create-if-new-owner`
- Split one owner into multiple specs only when the existing file becomes materially too large or divergent
- When split is required, add a small registry file for that surface
- If the selected user-visible clause has no stable owner surface or journey and local conventions do not expose a stable place to create one, return a blocker with:
  - `outcome = blocked`
  - `blocker_type = external_setup`
  - `blocker_code = owner_spec_missing`
  - `next_action = stop`
  - `resume_from = materialize`

### Step 3. Materialize unit tests

- Follow `references/unit-test-conventions.md`
- Write tests directly into the source tree using the repo's current test layout
- Keep tests boundary-first, scenario-anchored, and deterministic
- Derive every new assertion from an explicit selected plan clause or a risk-pattern invariant already implied by that clause
- Update existing unit tests when the boundary already exists
- Create new unit tests only when needed to cover a new logic boundary
- Create a new helper test file only when the plan implies a stable logic boundary that can own the scenario long-term
    - if the invariant naturally belongs inside an existing selection or projection helper, fold coverage into that boundary instead of creating one-helper-per-rule files
- Cover both `must happen` and important `must not happen` outputs when the scenario contract requires them
- When the scenario has competing completion paths, pin both the winning path and the losing path that must become no-op
- When the scenario has deferred execution, pin the terminal state and verify that disallowed side effects do not fire on rejected or losing paths
- When side effects are coupled to state, verify the side effect only occurs on the state transition that is allowed to emit it
- If the scenario introduces a new final output interpretation path, add a test at that final-interpretation boundary instead of stopping at an earlier boundary-contract test
- Do not treat selection-only tests or boundary-contract tests as sufficient when the final interpreted output is a feature-specific contract
- Do not harden a sibling contract that the plan did not select as canonical
- Do not add generic happy-path, edge-case, or exception assertions unless the selected clause or its risk pattern requires them
- If the plan's terminal state retires a boundary or surface, delete the obsolete test instead of replacing it with a placeholder test
- Do not edit production code, fixtures outside the test tree, or test config during this skill

### Step 3.5. Materialize runtime integration tests

- Follow the repo's existing rendered-harness and runtime-owner patterns before inventing a new style
- Keep runtime tests focused on observable input -> output contracts:
  - DOM presence or absence
  - phase or state markers
  - mount/unmount timing owned by the boundary
  - event choreography and host-owned coordination
  - important no-op and stale-path behavior
- Prefer observable state markers, callbacks, and owner-managed DOM outcomes over presentation-only styling assertions
- Do not freeze decorative layout, exact color, or other high-churn presentation details unless the selected clause makes that visual contract durable
- Do not shrink a browser-dependent clause into runtime coverage when the selected contract requires a real browser engine

### Step 4. Materialize E2E tests

- Follow `references/e2e-test-conventions.md`
- Use only the runner already configured in the project
- Materialize only the selected bounded-surface or full-flow journey tests; do not add plan-external regression sweeps
- Derive every scenario and assertion from explicit selected plan clauses only
- Update the existing owner test when the same surface or journey already exists
- If the plan retires the selected surface or journey entirely, delete the obsolete owner test instead of inventing a replacement smoke path
- Add metadata comments to E2E specs so future updates can find them reliably
- When split is required, create a registry file only for that surface

### Step 5. Run targeted validation

After editing tests, run the narrowest available validation commands for the changed coverage:

- Prefer the exact narrow test command already named in the selected plan
- Otherwise run the affected owner-test set directly with the existing runner, not only the newly created files
- Do not widen targeted validation into a full suite unless the plan explicitly selects that suite as the validation surface
- For non-test execution clauses such as `tsc`, `build`, or manual inspection, record the required command or blocker explicitly; do not silently count targeted tests as equivalent
- If any targeted validation for the affected owner-test set fails, record that as a gate failure; do not present materialization completion as equivalent to a passed gate

### Step 6. Write the materialization report

Write `materialize.md` adjacent to the selected executable `plan.md`.

This report is a helper artifact, not the source of truth.
The source of truth is the actual test files in the source tree.

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
- test type: `unit` | `runtime` | `e2e` | `skip` | `block`
- action: `create` | `update` | `delete` | `split` | `skip` | `block` | `run`
- target file
- targeted run command when applicable
- reason
- canonical contract when applicable
- rejected sibling candidates when applicable

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

### Step 7. Verify before completion

- Every selected clause from `output`, `constraint`, `failure-validation`, and `validation` has an owner test, an execution command, or an explicit blocker
- Every selected test-expressible clause has explicit source-tree test coverage or an explicit blocker
- Every selected execution clause has an explicit narrow command or an explicit blocker
- Every behavior-changing selected scenario has explicit `must happen` coverage, important `must not happen` coverage, or an explicit blocker
- Every behavior-changing selected scenario with competing completion paths has explicit winner/loser-path coverage or an explicit blocker
- Every behavior-changing selected scenario with deferred execution or terminal-state policy has explicit terminal-state coverage or an explicit blocker
- Every behavior-changing selected scenario that introduces a feature-specific final interpretation path has final-interpretation coverage or an explicit blocker
- Every selected frontend clause that truly requires a browser-dependent owner has an E2E action, an exact existing owner-spec skip, or an explicit blocker
- Every affected owner test in scope was reviewed as `keep`, `update`, or `delete`
- No stale owner test that freezes obsolete truth survives without an explicit keep rationale
- Every changed test file participated in a targeted validation run, or the report explains the blocker
- `gate_status = passed` only when every targeted validation command for the affected owner-test set passed
- Every `skip` cites the exact existing source-tree owner test that already closes the selected clause
- No assertion was added for a behavior that the selected plan did not name or imply through a declared risk pattern
- No plan-selected cross-route clause was silently deferred
- Every retired selected boundary or surface has a delete action, surviving owner test, or explicit blocker
- No production code changed
- No new test framework was introduced
- Every updated or created E2E file includes source-tree tracking metadata, and every split surface includes a registry file

## Output contract

- Plan-local report:
    - `materialize.md` adjacent to the selected executable plan
- Source-tree test changes:
    - updated or created `*.test.*`, `*.spec.*`, page objects, fixtures, and split-surface registries when needed
- Output language: Korean where test descriptions are authored

## Guardrails

- Test files only: never implement production code
- Do not create or edit test setup/config files
- Stop when the required test setup does not already exist
- Stop when the plan is too ambiguous to derive a stable test contract
- Stop when `plan.md` and its linked phase detail files drift enough that the technical source of truth is unclear
- Stop when a selected clause from `output`, `constraint`, `failure-validation`, or `validation` cannot be traced to a stable owner test or execution command
- Stop when canonical outputs, recipients, or negative outputs are missing for a behavior-changing scenario
- Stop when multiple plausible sibling contracts exist and the plan did not resolve the winner
- Stop when the plan introduces a new rendered, mapped, serialized, or interpreted final output but does not identify the boundary that finalizes that output
- Stop when the plan implies competing completion paths, deferred execution, terminal-state policy, or side-effect coupling but does not define the relevant invariant
- Do not create duplicate tests for an existing boundary or surface when an update is possible
- Do not leave a stale passing owner test in place when it still freezes obsolete canonical truth for a selected clause
- Do not add test assertions, validation paths, state coverage, or edge cases that are outside the selected plan clauses or their declared risk patterns
- Do not freeze exact export inventories or negative-only import/export assertions unless the plan explicitly identifies that inventory as the stable public contract
- Do not create package-root export tests that only prove re-export identity, legacy alias absence, or private symbol absence unless the external import behavior itself is the selected durable feature contract
- Do not silently shrink a selected full-flow journey into a surface-only test just because a narrower owner already exists
- Do not silently defer selected plan coverage to a later pass
- Do not widen targeted validation commands into full-suite regression unless the plan explicitly requires it
- Do not use `./plans` as the durable source of truth for E2E ownership; use source-tree metadata comments and split registries
- In orchestrated mode, do not invent alternate `plan_path` or `plan_signature` metadata that conflicts with the current orchestrator handoff

</Instructions>
</Skill_Guide>
