# Planning Policy

Canonical detailed rules for `architect`.

Use this file for:

- blocking vs derivable vs deferrable decision policy
- required plan sections and routing metadata
- UI contract and E2E test planning rules
- quality gates and self-review
- execution handoff requirements

`SKILL.md` should stay flow-oriented. Keep detailed planning policy here.

---

## Blocking Decision Policy

Classify missing information as:

- `blocking`: changes architecture, contracts, test scope, or user-visible behavior
- `derivable`: can be confirmed from local repo context without user input
- `deferrable`: low-risk default that does not materially change implementation or validation

Treat ambiguity as `blocking` when it can change:

- architecture or major boundaries
- API/data contracts
- schema or business rules
- UX behavior, permissions, validation, or state transitions
- navigation, error handling, accessibility expectations, or acceptance tests

### Frontend UI Contracts

For frontend/UI scope, these are always `blocking`:

- `route or navigation/surface contract`
- `user state contract`
- `action contract`
- `visible outcome contract`
- `locator/testability contract`

Do not create implementation plans or `plan-e2e-test` artifacts until these contracts are resolved in decision-complete form.

Do not hide unresolved blockers inside `Assumptions and risks`.

---

## Plan Artifact Requirements

`plan.md` must always include:

1. Problem statement and scope
2. Out-of-scope
3. Resolved Decisions
4. Explicit Defaults
5. Assumptions and risks
6. Phase breakdown with machine-readable `owner_agent`
7. File change list
8. Validation commands and exit criteria
9. Rollback or fallback strategy
10. Final acceptance checklist
11. Parallel Feasibility Matrix
12. Execution Mode Decision
13. Critical Path
14. Track Dependency Graph

For frontend/UI scope, `Resolved Decisions` must explicitly cover the five UI contracts.

Every executable plan file must include a `Branch` header:

- sequential: `**Branch:** {type}/{summary}`
- track file: `**Branch:** {type}/{summary}-{track}`

When execution mode is not sequential:

- Use track folder layout, not flat track files:
  - `plans/{task-name}/plan-{track}/plan.md`
- Each implementation track must also define test artifacts in the same folder:
  - `plans/{task-name}/plan-{track}/tests/manifest.md` (or explicit `N/A` with reason)
  - `plans/{task-name}/plan-{track}/e2e/manifest.md` (or explicit `N/A` with reason)
- Keep root indexes for discoverability:
  - `plans/{task-name}/tests/manifest.md` (track manifest index)
  - `plans/{task-name}/e2e/manifest.md` (track manifest index)

### Planning-time Test Artifact Layout

When unit/E2E plan artifacts are generated:

- Keep planning artifacts flat and intent-oriented inside `tests/` or `e2e/`
- Do not mirror or freeze the final source-tree placement inside `plans/`
- Unit test manifests must record:
  - `boundary_type`
  - `boundary_name`
  - `placement_intent`
  - `implementation_placement_rule`
- E2E manifests must record:
  - `runner`
  - `surface_id` or `flow_id`
  - `placement_intent`
  - `implementation_placement_rule`
  - `locator_contract`

### Phase Metadata Rules

- Every execution block (`Phase n`, `Tn`) must include `owner_agent`
- `owner_agent` must exist in `references/agents-lite.md`
- Use exactly one execution agent per block
- Add `primary_skill` only when the phase must pin a specific skill
- Do not rely on heading text like `(Owner: ...)`

---

## Execution Routing Policy

Assign work by concern:

- `publisher`: visual design, layout, spacing, typography, color tokens, responsive polish
- `frontend-developer`: frontend logic, state transitions, event handling, API integration, validation logic
- `backend-developer`: API, DB, auth, server logic
- `playwright-guard`: post-implementation full-flow/regression Playwright guard tests

If a phase mixes visual and logic concerns, split it into separate phases/tasks.

See `agents-lite.md` for the canonical execution agent catalog and skill mapping.

---

## UI E2E Planning Policy

### `plan-unit-test`

Run when the plan includes testable logic boundaries and `[C-...]` constraints.

Examples:

- hooks
- services
- utilities
- validators
- mappers
- use cases
- state-management logic
- controller methods

### `plan-e2e-test`

Run when the task changes feature-level user-facing behavior within a bounded UI surface such as:

- a screen
- a form
- a modal
- a drawer
- a settings panel
- feature-local tabs or sub-routes

Use it for:

- same-surface validation and error display
- submit gating, loading, success, disabled, and API error states
- user-visible integration across components/modules within one bounded feature surface

Do not use it for:

- multi-route full journeys
- auth/session handoffs across pages
- reload persistence across the application shell
- post-implementation regression hardening

These tests are frozen at planning time. Implementation must satisfy them.

Default organization for planning-time E2E artifacts:

- Playwright: `e2e/{surface-id}.spec.ts`
- Maestro: `e2e/{flow-id}.yaml`
- Split only when setup or fixtures diverge materially or file size becomes unmanageable

### `playwright-guard`

Add a later `playwright-guard` phase when the task changes:

- a cross-route user journey
- auth/session transitions
- redirect chains
- persisted browser state
- a release-critical flow that needs regression hardening

When this phase exists:

- set `owner_agent: playwright-guard`
- set `primary_skill: guard-e2e-test`
- schedule it after implementation reaches green on core validation
- define trigger and scope explicitly:
  - changed journey or affected routes
  - expected final user-visible outcome
  - known fragile behavior, failed verification signal, or regression concern
  - target app URL or start route
- expected output is real Playwright guard specs in the project test tree, not in `plans/`
- `playwright-guard` must not edit frozen `plan-e2e-test` artifacts

---

## Parallelization Policy

Decision rules:

- `sequential`: shared critical files or strong predecessor coupling
- `partial-parallel`: one required predecessor, then independent downstream work
- `parallel`: major work units are independent with no critical conflicts

When execution mode is not sequential:

- generate `plan.md` plus `plan-{track}/plan.md` files
- each track plan file must include:
  - `Track`
  - `DependsOn`
  - `StartCondition`
  - `ReadyCheck`
  - `BlockingFiles`
  - `Outputs`
  - `MergeCondition`
  - per-task `owner_agent`
- each implementation track must include:
  - `tests/manifest.md` (+ test files) or explicit `N/A`
  - `e2e/manifest.md` (+ spec files) or explicit `N/A`

For conflict-risk details, use `parallel-safety.md`.

---

## Quality Gate Checklist

Before finalizing:

1. Every phase/task has a concrete `owner_agent` listed in `references/agents-lite.md`
2. No unresolved blocking policy/contract/schema/UX ambiguity remains
3. No `TBD` assignee or unresolved critical dependency remains
4. Every executable plan file includes a `Branch` header
5. Execution Mode Decision matches generated artifacts
6. Track dependency graph is acyclic
7. `Resolved Decisions` contains blocking choices; `Explicit Defaults` contains only non-blocking defaults
8. Failure Escalation Policy is explicit
9. Visual/design work is assigned to `publisher`; logic work is assigned to developer agents
10. For UI feature scope, `plan-e2e-test` artifacts exist with runner-appropriate frozen E2E files, locator registry, and implementation placement handoff
11. For UI/user-journey or regression-hardening scope, a later `playwright-guard` phase exists with explicit trigger, scope, and exit criteria
12. For UI scope, the five UI contracts are resolved before implementation planning or `plan-e2e-test`
13. Non-sequential mode uses `plan-{track}/plan.md` folder layout (no flat `plan-{track}.md`)
14. Every implementation track has matching `plan/tests/e2e` artifacts or explicit `N/A`
15. Root `tests/manifest.md` and `e2e/manifest.md` are maintained as track indexes
16. Planning-time test artifacts remain flat; final source-tree placement is deferred to implementation via manifest handoff

---

## Self-review Checklist

After drafting plan artifacts:

1. Scope, goals, and acceptance criteria are internally consistent
2. No unresolved blocking ambiguity remains
3. `Resolved Decisions` and `Explicit Defaults` are correctly separated
4. Every phase/task has valid `owner_agent` from `references/agents-lite.md`
5. Every executable plan file includes `Branch`
6. Validation commands and exit criteria are explicit and executable
7. Rollback/fallback strategy is concrete and testable
8. Sequential mode has no track files
9. Non-sequential mode gives every track `DependsOn` and `ReadyCheck`
10. No circular dependencies exist in the track graph
11. Failure escalation is actionable
12. Visual/design work is not mixed with logic in the same execution block
13. For UI feature scope, `plan-e2e-test` artifacts exist with frozen runner-appropriate E2E artifacts, locator registry, and implementation placement handoff
14. For UI/user-journey or regression-hardening scope, a later `playwright-guard` phase is planned
15. For UI scope, `Resolved Decisions` explicitly defines route or navigation/surface, user state, action, visible outcome, and locator/testability contracts
16. Non-sequential mode uses folderized track plan paths (`plan-{track}/plan.md`)
17. Every implementation track has its own `tests` and `e2e` manifest (or explicit `N/A`)
18. Root test/e2e manifests provide track-level index links only
19. Planning-time test artifacts do not freeze final source-tree placement

Do not request execution before this checklist passes.

---

## Execution Handoff Requirements

Provide a concise handoff summary with:

1. Plan file path(s)
2. First executable phase and its `owner_agent`
3. Execution invocation commands:
   - sequential: run `planner-lite` against `plan.md`
   - parallel: run one `planner-lite` session per `plan-{track}/plan.md`
4. Merge rule:
   - `planner-lite` enforces `Agent(... isolation: "worktree")`
   - merge after each worker completes
   - final merge goes into each file's `Branch` with `--no-ff`
5. For UI/user-flow scope, state whether `plan-e2e-test` artifacts are included and whether a later `playwright-guard` phase is scheduled
6. Explicit defaults and deferred low-risk choices recorded in the plan
7. Implementation agents must resolve final test placement from coding rules and local conventions before copying flat plan artifacts into the source tree
