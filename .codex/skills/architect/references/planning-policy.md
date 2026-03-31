# Planning Policy

Canonical detailed rules for `architect`.

Use this file for:

- blocking vs derivable vs deferrable decision policy
- sequential-only plan artifact contract
- plan split rules for multiple sequential plan files
- UI contract and E2E test planning rules
- quality gates
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
Do not hide unresolved blockers outside the relevant phase/task.

---

## Plan Artifact Requirements

Every executable `plan.md` must include:

1. `**Branch:** {type}/{summary}`
2. Phase breakdown with machine-readable `owner_agent`
3. For each phase/task:
   - `목적`
   - `작업`
   - `검증`
4. Optional per-phase fields when needed:
   - `선행조건`
   - `제약`
5. When tests exist, a plan-level `## 테스트 계획` section that summarizes the manifest path and artifact directory for unit and/or E2E artifacts

Every executable plan file must include a `Branch` header:

- `**Branch:** {type}/{summary}`

Worktree directory naming is derived from the `Branch` value by replacing `/` with `-`.
Example: `feat/add-login` -> `worktrees/feat-add-login`

For frontend/UI scope, the five UI contracts must be recorded inside the relevant phase/task `제약` bullets.
Constraint IDs (`[C-...]`) that drive `plan-unit-test` or `plan-e2e-test` must live inside the relevant phase/task block, not in a separate summary section.
`## 테스트 계획` should stay brief. Use it to point to manifests and artifact directories, not to duplicate scenario detail already frozen in those artifacts.

### Single-Plan Policy

For each request:

- create exactly one executable plan file at `plans/{task-name}/plan.md`
- express sequencing only through ordered `Phase` blocks inside that file
- keep test artifacts local to the owning plan directory:
  - `plans/{task-name}/tests/`
  - `plans/{task-name}/e2e/`
- do not split one request into multiple plan files
- do not generate numbered plan folders or root graph/index files

### Planning-time Test Artifact Layout

When unit/E2E plan artifacts are generated:

- keep planning artifacts flat and intent-oriented inside `tests/` or `e2e/`
- do not mirror or freeze the final source-tree placement inside `plans/`
- reference those artifacts from the same `plan.md` via `## 테스트 계획`
- unit test manifests must record:
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

- Every execution block (`Phase n`) must include `owner_agent`
- Every execution block (`Phase n`) must include `목적`
- Every execution block (`Phase n`) must include `작업`
- Every execution block (`Phase n`) must include `검증`
- `검증` must be written as checklist bullets (`- [ ] ...`)
- `작업` bullet count is not fixed; use as many bullets or paragraphs as needed to make the phase executable
- `목적` should stay to one or two sentences; phase blocks are the primary execution contract, not long prose summaries
- `owner_agent` must exist in `references/agents-lite.md`
- use exactly one execution agent per block
- do not rely on heading text like `(Owner: ...)`
- if UI contracts or constraint IDs matter, include them inline under `제약`
- if tests are part of scope, keep phase-level references minimal and place artifact/placement details in `## 테스트 계획` and the corresponding manifest

---

## Execution Routing Policy

Assign work by concern:

- `frontend-developer`: frontend UI, responsive polish, state transitions, event handling, API integration, and validation logic
- `backend-developer`: API, DB, auth, server logic
- `general-developer`: infrastructure, DevOps, CI/CD, deploy/runtime config, and repository-level tooling that belongs to neither frontend nor backend
- `playwright-guard`: post-implementation full-flow/regression Playwright guard tests

Do not split a phase only because UI and logic are both present. Split only when file overlap, dependency order, or validation boundaries require it.

Resolve routing and mode-sensitive conventions from the active execution contract before locking implementation phases:

- For `frontend-developer` or `backend-developer`, use top-level `frontend --help` or `backend --help` only when command discovery is necessary
- Then inspect only the minimum relevant command-scoped help for the chosen frontend/backend work
- Treat CLI help as the source of truth for the current active mode/profile contract, not stale examples embedded in older skill text
- If exact mode/version matters to the plan, inspect `mode show` and record it inline in the relevant phase/task
- For `general-developer`, there is no dedicated CLI contract in this repository; inspect the minimum repo-local tool or validation command that governs the work and use that as the execution contract
- Do not hardcode detailed CLI/task situations into the planning prompt; defer command selection details to execution time

See `agents-lite.md` for the canonical execution agent catalog and related skill examples.

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

Run when the plan changes feature-level user-facing behavior within a bounded UI surface such as:

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
- split only when setup or fixtures diverge materially or file size becomes unmanageable

### `playwright-guard`

Add a later `playwright-guard` phase when the plan changes:

- a cross-route user journey
- auth/session transitions
- redirect chains
- persisted browser state
- a release-critical flow that needs regression hardening

When this phase exists:

- set `owner_agent: playwright-guard`
- schedule it after implementation reaches green on core validation
- define trigger and scope explicitly:
  - changed journey or affected routes
  - expected final user-visible outcome
  - known fragile behavior, failed verification signal, or regression concern
  - target app URL or start route
- expected output is real Playwright guard specs in the project test tree, not in `plans/`
- `playwright-guard` must not edit frozen `plan-e2e-test` artifacts

---

## Quality Gate Checklist

Before finalizing, and again during self-review:

1. Every executable plan file includes a valid `Branch` header and its worktree name can be derived by `/ -> -`
2. Every phase/task has a concrete `owner_agent` listed in `references/agents-lite.md`
3. Every phase/task has `목적`, `작업`, and `검증`
4. `검증` is an actionable checklist, not loose prose
5. No unresolved blocking policy/contract/schema/UX ambiguity remains
6. Concern routing matches agent boundaries: frontend -> `frontend-developer`, backend -> `backend-developer`, infra/devops/root tooling -> `general-developer`
7. For UI scope, the five UI contracts are explicitly recorded in the relevant phase/task before `plan-e2e-test`
8. Constraint IDs used by tests live in the relevant phase/task blocks
9. If tests are planned, `## 테스트 계획` exists and points to the generated manifest/artifact directories
10. For UI feature scope, `plan-e2e-test` artifacts exist with runner-appropriate frozen E2E files and placement handoff in `e2e/manifest.md`
11. For UI/user-journey or regression-hardening scope, a later `playwright-guard` phase exists with explicit trigger, scope, and verification checklist
12. Exactly one plan file exists for the request and all sequencing is expressed through ordered phases
13. Planning-time test artifacts remain flat; final source-tree placement is deferred to manifests and implementation conventions

Do not request execution before this checklist passes.

---

## Execution Handoff Requirements

Provide a concise handoff summary with:

1. The plan file path
2. Task branch name and derived worktree directory name (`/` -> `-`)
3. First executable phase and its `owner_agent`
4. Execution invocation commands:
   - launch the named custom agent `planner` against the plan file
5. Merge rule:
   - `planner` owns the task worktree and phase-worker dispatch while following the `planner-lite` workflow
   - phase workers run inside the assigned task worktree without creating nested worktrees
   - successful phases are committed inside the task branch; final merge goes into the plan file's `Branch` with `--no-ff`
6. For UI/user-flow scope, state whether `plan-e2e-test` artifacts are included and whether a later `playwright-guard` phase is scheduled
7. Note whether `tests/manifest.md` and/or `e2e/manifest.md` are included
8. Implementation agents must resolve final test placement from the relevant manifest, coding rules, and local conventions before copying flat plan artifacts into the source tree
