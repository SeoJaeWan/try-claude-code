---
name: architect
description: Codex entry skill for rigorous implementation planning. Use when a request needs a decision-complete execution plan under ./plans after resolving blocking product policy, UX, contract, schema, validation, state, permission, and frontend browser-contract ambiguity, and when frontend browser-integration tests must be separated from later full-flow Playwright guard phases.
---

<Skill_Guide>
<Purpose>
Create decision-complete implementation plans with explicit gates, conditional parallel strategy, and execution handoff.
</Purpose>

<Instructions>
# architect

Use this as the preferred planning entrypoint for complex or high-impact requests, or after `brainstorm` confirms key decisions.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context.
2. `./.codex/skills/architect/references/agents-lite.md` (execution agent catalog).
3. `./.ai/references/coding-rules/git.md` for branch naming rules.

## Workflow

### Step 0. Read routing references (required)

Before writing any plan artifact:

- Read `./.codex/skills/architect/references/agents-lite.md` (execution agent catalog)

### Step 1. Analyze request

- Clarify goals, boundaries, constraints, acceptance criteria, and feature policy.
- Classify missing information as `blocking`, `derivable`, or `deferrable`.
- Treat ambiguity as `blocking` when it can change architecture, API/data contracts, schema, business rules, UX behavior, permissions, validation, state transitions, navigation, error handling, accessibility expectations, or acceptance tests.
- For frontend/UI scope, treat unresolved browser contracts as `blocking`. Browser contracts include:
  - `route contract`
  - `user state contract`
  - `action contract`
  - `visible outcome contract`
  - `locator/testability contract`
- Derive what can be confirmed from local context before asking the user.

### Step 1.5. Resolve blocking decisions before planning (required)

- Do not write any plan artifact while `blocking` ambiguity remains.
- Route unresolved `blocking` ambiguity to `brainstorm` first.
- If direct clarification is necessary, ask only concise, actionable questions:
  - Batch at most 4 blocking questions at once
  - Prefer structured user-input tooling when available
  - Otherwise ask concise plain-text questions in chat
- Do not hide unresolved blocking decisions inside `Assumptions and risks`.
- Only carry forward `deferrable` items as explicit defaults, and mark them as non-blocking.
- For frontend/UI scope, do not create implementation plans until the browser contracts above are resolved in a decision-complete form.

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- Existing related features
- Tech stack and major boundaries
- Expected integration points
- Existing policies, contracts, behaviors, and conventions that answer missing questions

Do not deep-dive into implementation details.

### Step 3. Design plan structure

Create plan artifacts in `./plans/{task-name}/`.

`plan.md` must always include:

1. Problem statement and scope
2. Out-of-scope
3. Resolved Decisions
4. Explicit Defaults (non-blocking)
5. Assumptions and risks
6. Phase breakdown with machine-readable `owner_agent` field per phase
7. File change list (create/modify/delete)
8. Validation commands and exit criteria
9. Rollback or fallback strategy
10. Final acceptance checklist
11. Parallel Feasibility Matrix
12. Execution Mode Decision (`sequential` | `partial-parallel` | `parallel`)
13. Critical Path
14. Track Dependency Graph (text)

For frontend/UI scope, `Resolved Decisions` must explicitly cover:

- `route contract`
- `user state contract`
- `action contract`
- `visible outcome contract`
- `locator/testability contract`

Every executable plan file (`plan.md` and `plan-{track}.md`) must include this header at the top:

```markdown
**Branch:** {type}/{summary}
```

For parallel files (`plan-{track}.md`), use:

```markdown
**Branch:** {type}/{summary}-{track}
```

Branch names must follow `./.ai/references/coding-rules/git.md`.

Execution phase format rule (required):

Routing guidance (required):

- Assign visual design, layout, spacing, typography, color-token application, and responsive UI polish to `publisher`.
- Assign business logic, state transitions, event handling, data flow, API integration, and validation logic to `frontend-developer` (or `backend-developer` when server-side).
- If a phase mixes both concerns, split it into separate phases/tasks with explicit `owner_agent` per concern.
- Every execution block (`Phase n`, `Tn`) must include `- owner_agent: \`{agent-name}\``.
- `owner_agent` must match an existing agent file: `./agents/{agent-name}.md`.
- Do not rely only on heading text such as `(Owner: ...)`.

Use template references when drafting:

- Sequential template: `./.codex/skills/architect/references/plan-template-sequential.md`
- DAG template: `./.codex/skills/architect/references/plan-template-dag.md`

### Step 3.5. Generate unit test plan (conditional)

If the plan includes testable logic boundaries (hooks, services, utilities, validators, mappers, use cases, state management, controller methods) **and** constraint IDs (`[C-...]`), run the `plan-unit-test` workflow:

1. Read `./.codex/skills/plan-unit-test/SKILL.md`
2. Execute the plan-unit-test workflow to generate test files under `./plans/{task-name}/tests/`
3. Verify `tests/manifest.md` shows 100% constraint coverage with explicit defensive and edge/exception review

**Skip** if the plan contains only documentation, configuration, or structural changes with no testable code units.

Test files are plan artifacts, not implementation code. Developers copy them to the source tree during the TDD Red phase.

### Step 3.6. Generate browser integration test plan (conditional)

If the task changes user-facing UI within a feature, screen, modal, or other bounded browser surface, run the `plan-e2e-test` workflow:

0. Confirm the frontend browser contracts are fully resolved in `plan.md`
1. Read `./.codex/skills/plan-e2e-test/SKILL.md`
2. Execute the plan-e2e-test workflow to generate Playwright `.spec.ts` files under `./plans/{task-name}/e2e/`
3. Verify `e2e/manifest.md` shows 100% coverage for in-scope browser-integration constraints, includes the `data-testid` registry, and explicitly lists any full-flow journeys deferred to `playwright-guard`

Use `plan-e2e-test` for:

- Same-surface form validation, error display, and submit gating
- Loading, disabled, success, and API error states visible within the feature
- Browser-visible integration across components/modules within one bounded feature surface

Do **not** use `plan-e2e-test` for:

- Multi-route full journeys
- Auth/session handoffs across pages
- Reload persistence across the application shell
- Post-implementation regression hardening

Those belong to a later `playwright-guard` phase.

Browser integration tests are **frozen at planning time** (strict AI TDD). Implementation must pass them; tests are not modified to match implementation. If these tests fail, fix the implementation, NOT the tests.

**Skip** for backend-only, documentation-only, or configuration-only scope.
If any frontend browser contract is missing, do not run `plan-e2e-test`; return to clarification first.

### Step 3.7. Plan full-flow Playwright guard phase (conditional)

If the task changes a cross-route user journey, auth/session transition, redirect chain, persisted browser state, or any release-critical flow that needs post-implementation regression hardening, add a later execution phase owned by `playwright-guard`.

Required planning rules:

1. Set `owner_agent: playwright-guard`
2. Set `primary_skill: guard-e2e-test`
3. Schedule the phase after implementation reaches green on its core validation commands
4. State the trigger and scope explicitly:
   - changed journey or affected routes
   - expected final user-visible outcome
   - known fragile/risky behavior or failed verification signal
   - target app URL or start route
5. State the expected output as real Playwright guard specs in the project test tree, not in `plans/`
6. State that `playwright-guard` must not edit frozen `plan-e2e-test` artifacts

Skip this phase only when the task has no full-flow journey or regression-hardening requirement.

### Step 4. Conditional parallelization decision (required)

Do not default to parallel. Decide mode by work-unit and file-overlap analysis:

Inputs:

- Work units (what must be executed)
- Expected file change sets per work unit
- Artifact dependencies between work units

Decision rules:

1. `sequential`

- Choose when all major work units share critical files, or
- when most work units depend on the same predecessor output.

2. `partial-parallel`

- Choose when at least one predecessor unit must run first, and
- 2+ downstream units are independently executable after that predecessor.

3. `parallel`

- Choose only when major work units are independent with no critical file conflicts.

Enforcement:

- If mode is `sequential`, generate only `plan.md`.
- If mode is `partial-parallel` or `parallel`, generate `plan.md` + `plan-{track}.md` files.
- Never generate parallel tracks when sequential conditions hold.

For conflict risk assessment and the parallel safety checklist, see `./.codex/skills/architect/references/parallel-safety.md`.

When track files are generated, each `plan-{track}.md` must include:

```markdown
**Branch:** {type}/{summary}-{track}
```

And these required metadata sections:

- `Track`
- `DependsOn` (track ids or `none`)
- `StartCondition`
- `ReadyCheck` (command)
- `BlockingFiles` (list)
- `Outputs`
- `MergeCondition`
- Per-task `owner_agent` field in every `Tn` block

Parallel track rules:

- Track-level `BlockingFiles` intersections must be empty unless explicitly serialized in `DependsOn`.
- `DependsOn` graph must be acyclic.

### Step 5. Quality gates (required)

Run these checks before finalizing:

1. Every phase/task block has a concrete `owner_agent` field and the value maps to `./agents/{agent-name}.md`.
2. No unresolved blocking policy/contract/schema/UX ambiguity remains.
3. No `TBD` assignee or unresolved critical dependency.
4. Every executable plan file includes `Branch` header.
5. Execution Mode Decision matches generated artifacts:
    - `sequential` => no `plan-{track}.md`
    - `partial-parallel`/`parallel` => 2+ track plans with required metadata
6. Track dependency graph is acyclic.
7. `Resolved Decisions` records all user-confirmed blocking choices, and `Explicit Defaults` contains only non-blocking defaults.
8. Failure Escalation Policy is explicit (`bug-report` create -> `codex-debug` on unresolved/repeat -> `bug-report` update).
9. Visual/design-oriented work is assigned to `publisher`; logic-oriented work is assigned to developer agents.
10. For UI/feature-browser scope, `plan-e2e-test` artifacts exist under `plans/{task-name}/e2e/` with frozen browser-integration `.spec.ts` files.
11. For UI/user-journey or regression-hardening scope, a later `playwright-guard` phase exists with explicit trigger, scope, and exit criteria.
12. For UI scope, `Resolved Decisions` contains all five frontend browser contracts before any implementation or `plan-e2e-test` artifact is produced.

### Step 6. Self-review gate (required)

After drafting plan artifacts, run a strict self-review and incorporate critical findings.
Self-review checklist:

1. Plan scope, goals, and acceptance criteria are internally consistent.
2. No unresolved blocking policy ambiguity remains, including frontend UX/state/validation policy and backend contract/schema/rule policy.
3. `Resolved Decisions` contains all blocking choices, and `Explicit Defaults` contains only low-risk non-blocking defaults.
4. Every phase/task has `owner_agent`, and each value maps to `./agents/{agent-name}.md`.
5. Every executable plan file includes `Branch`.
6. Validation commands and exit criteria are explicit and executable.
7. Rollback/fallback strategy is concrete and testable.
8. If `Execution Mode = sequential`, confirm no track files are generated.
9. If `Execution Mode != sequential`, confirm every track has `DependsOn` and `ReadyCheck`.
10. Confirm no circular dependencies in the track graph.
11. Confirm Failure Escalation Policy is actionable and phase owners can execute it.
12. Confirm visual/design tasks are owned by `publisher` and not mixed with logic in the same execution block.
13. For UI/feature-browser scope, confirm `plan-e2e-test` artifacts exist with frozen browser-integration `.spec.ts` files and `data-testid` registry.
14. For UI/user-journey or regression-hardening scope, confirm a later `playwright-guard` phase is planned with explicit trigger and scope.
15. For UI/user-flow scope, confirm `Resolved Decisions` explicitly defines route, user state, action, visible outcome, and locator/testability contracts.
   Do not request execution before this gate is complete.

### Step 7. Compatibility policy (required)

- Plan Artifact Interface v2 applies to newly created plans.
- Existing plans are not automatically migrated.
- If a legacy plan format is detected during update:
    - keep user-requested scope,
    - add a warning note in plan summary,
    - avoid broad migration unless explicitly requested.

### Step 8. Execution handoff

Architect does not execute implementation directly.
Provide a concise execution handoff summary:

1. Plan file path(s)
2. First executable phase and its `owner_agent` value
3. Execution invocation command(s):
   - sequential: run `planner-lite` session against `plan.md`
   - parallel: run one `planner-lite` session per `plan-{track}.md`
4. Confirm branch merge rule: `planner-lite` enforces `Agent(... isolation: "worktree")` per phase, merges after each worker completes, then performs final merge into each file's `Branch` with `--no-ff`
5. For UI/user-flow scope, confirm whether `plan-e2e-test` artifacts are included and whether a later `playwright-guard` phase is scheduled for full-flow/regression coverage
6. Explicit defaults and deferred low-risk choices recorded in the plan

## Output contract

- Sequential mode:
    - `./plans/{task-name}/plan.md`
- Partial/parallel mode:
    - `./plans/{task-name}/plan.md` (master index)
    - `./plans/{task-name}/plan-{track}.md` (2+)
- Unit test artifacts (when Step 3.5 applies):
    - `./plans/{task-name}/tests/manifest.md`
    - `./plans/{task-name}/tests/{mirrored-source-paths}`
- E2E test artifacts (when Step 3.6 applies):
    - `./plans/{task-name}/e2e/manifest.md`
    - `./plans/{task-name}/e2e/{domain}/{scenario}.spec.ts`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code.
- Test files generated by `plan-unit-test` and `plan-e2e-test` are plan artifacts, not implementation code.
- `playwright-guard` generates real regression tests later; architect only plans that phase.
- Do not omit browser-integration planning (`plan-e2e-test`) when feature-level UI/browser scope exists.
- Do not omit a `playwright-guard` phase when full-flow journey or regression-hardening coverage is required.
- Focus on "what to execute" and "in what order".
- Ensure all gates are explicit and testable.
- Do not produce a plan with unresolved blocking product-policy ambiguity.
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning.
  </Instructions>
  </Skill_Guide>


