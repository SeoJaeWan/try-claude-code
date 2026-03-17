---
name: architect
description: Codex entry skill for rigorous implementation planning. Use when a request needs a decision-complete execution plan under ./plans after resolving blocking product policy, UX, contract, schema, validation, state, permission, and frontend UI-contract ambiguity, and when runner-appropriate feature-level E2E tests must be separated from later browser full-flow Playwright guard phases.
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

1. User request and latest conversation context
2. `./.codex/skills/architect/references/agents-lite.md` - execution agent catalog
3. `./.codex/skills/architect/references/planning-policy.md` - canonical planning rules and quality gates
4. `./.codex/skills/architect/references/git.md` - commit message and branch naming rules (없으면 로컬 규칙 탐색 후 Explicit Defaults에 fallback 규칙 기록)
5. Template references only when drafting:
   - `./.codex/skills/architect/references/plan-template-sequential.md`
   - `./.codex/skills/architect/references/plan-template-dag.md`
6. `./.codex/skills/architect/references/parallel-safety.md` only when Step 4 evaluates parallel execution
7. Relevant active CLI help only when execution routing or mode-sensitive conventions matter:
   - prefer narrow command-scoped text help first
   - use top-level `tcp --help`, `tcf --help`, `tcb --help` only for command discovery

## Workflow

### Step 0. Read routing references (required)

Before writing any plan artifact:

- Read `./.codex/skills/architect/references/agents-lite.md`
- Read `./.codex/skills/architect/references/planning-policy.md`

### Step 1. Analyze request

- Clarify goals, boundaries, constraints, acceptance criteria, and feature policy.
- Classify missing information as `blocking`, `derivable`, or `deferrable` using `planning-policy.md`.
- Derive what can be confirmed from local context before asking the user.

### Step 1.5. Resolve blocking decisions before planning (required)

- Do not write any plan artifact while `blocking` ambiguity remains.
- Route unresolved `blocking` ambiguity to `brainstorm` first.
- If direct clarification is necessary, ask only concise, actionable questions:
  - Batch at most 4 blocking questions at once
  - Prefer structured user-input tooling when available
  - Otherwise ask concise plain-text questions in chat
- For frontend/UI scope, UI contracts defined in `planning-policy.md` must be decision-complete before implementation planning or `plan-e2e-test`.
- Do not hide unresolved blocking decisions inside `Assumptions and risks`.
- Only carry forward `deferrable` items as explicit defaults.

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- Existing related features
- Tech stack and major boundaries
- Expected integration points
- Existing policies, contracts, behaviors, and conventions that answer missing questions

Do not deep-dive into implementation details.

### Step 2.5. Resolve mode-sensitive CLI contracts before execution routing (required for implementation plans)

- Before assigning `owner_agent` or `primary_skill` to implementation phases, inspect the relevant CLI help for the work type.
- Start with top-level `tcp --help`, `tcf --help`, or `tcb --help` only when command discovery is needed.
- Then inspect only the minimum relevant command-scoped help for the chosen work.
- Treat the returned help as the active mode-specific contract for path policy, naming, validation, scaffold shape, and available command surface.
- Use those contracts to confirm execution routing, phase boundaries, and `Explicit Defaults`.
- If one request spans multiple concerns, inspect each relevant CLI instead of guessing from stale skill prose.
- Do not explain detailed task-by-task CLI situations in the plan prompt itself; route through CLI help at execution time.

### Step 3. Design plan structure

- Create plan artifacts in `./plans/{task-name}/`.
- Draft from the sequential or DAG template reference.
- Required sections, branch headers, `owner_agent` formatting, routing policy, browser-contract requirements, and UI test-phase split must follow `planning-policy.md`.
- Make every phase/task purpose explicit in the plan itself so readers can see why the block exists, not just what files or commands it touches.
- Branch names must follow `./.codex/skills/architect/references/git.md` when available; when unavailable, derive from local conventions and record the fallback in `Explicit Defaults`.
- For `partial-parallel`/`parallel`, use track folders: `plan-{track}/plan.md` (flat `plan-{track}.md` 금지).

### Step 3.5. Generate unit test plan (conditional)

If the plan includes testable logic boundaries and constraint IDs (`[C-...]`):

1. Read `./.codex/skills/plan-unit-test/SKILL.md`
2. Execute the `plan-unit-test` workflow:
   - sequential: `./plans/{task-name}/tests/`
   - non-sequential: `./plans/{task-name}/plan-{track}/tests/`
3. Verify the test manifest meets the coverage and implementation-handoff requirements defined by that skill

Skip for documentation-only, configuration-only, or structural-only scope with no testable code units.

### Step 3.6. Generate UI E2E test plan (conditional)

If the task changes feature-level user-facing behavior within a bounded UI surface:

1. Confirm frontend UI contracts are fully resolved
2. Read `./.codex/skills/plan-e2e-test/SKILL.md`
3. Execute `plan-e2e-test`:
   - sequential: `./plans/{task-name}/e2e/`
   - non-sequential: `./plans/{task-name}/plan-{track}/e2e/`
4. Verify the manifest matches the E2E policy and implementation-handoff requirements in `planning-policy.md`

`plan-e2e-test` covers frozen feature/screen E2E artifacts only, using the runner selected from the environment. Browser full-flow regression coverage still belongs to a later `playwright-guard` phase.

### Step 3.7. Plan full-flow Playwright guard phase (conditional)

If the task changes cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or any release-critical flow that needs regression hardening:

- Add a later phase with `owner_agent: playwright-guard`
- Set `primary_skill: guard-e2e-test`
- Define trigger, scope, and expected outputs using `planning-policy.md`

### Step 4. Conditional parallelization decision (required)

- Decide `sequential`, `partial-parallel`, or `parallel` based on work units, file overlap, and artifact dependencies.
- Use `./.codex/skills/architect/references/parallel-safety.md` for conflict-risk assessment and checklist details.
- Generated artifacts must match the chosen mode.

### Step 5. Quality gates (required)

- Run the quality-gate checklist in `planning-policy.md` before finalizing.

### Step 6. Self-review gate (required)

- Run the self-review checklist in `planning-policy.md`.
- Incorporate critical findings before handoff.

### Step 7. Compatibility policy (required)

- Plan Artifact Interface v2 applies to newly created plans.
- Existing plans are not automatically migrated.
- If a legacy plan format is detected during update:
  - keep user-requested scope
  - add a warning note in plan summary
  - avoid broad migration unless explicitly requested

### Step 8. Execution handoff

Architect does not execute implementation directly.
Provide a concise execution handoff summary using the handoff requirements in `planning-policy.md`.

## Output contract

- Sequential mode:
  - `./plans/{task-name}/plan.md`
- Partial/parallel mode:
  - `./plans/{task-name}/plan.md`
  - `./plans/{task-name}/plan-{track}/plan.md` (2+)
  - `./plans/{task-name}/tests/manifest.md` (track test manifest index)
  - `./plans/{task-name}/e2e/manifest.md` (track e2e manifest index)
- Unit test artifacts when Step 3.5 applies:
  - sequential: `./plans/{task-name}/tests/manifest.md`, `./plans/{task-name}/tests/{flat-artifact-files}`
  - non-sequential: `./plans/{task-name}/plan-{track}/tests/manifest.md`, `./plans/{task-name}/plan-{track}/tests/{flat-artifact-files}`
- E2E test artifacts when Step 3.6 applies:
  - sequential: `./plans/{task-name}/e2e/manifest.md`, plus flat runner-appropriate artifacts such as `./plans/{task-name}/e2e/{surface-id}.spec.ts` or `./plans/{task-name}/e2e/{flow-id}.yaml`
  - non-sequential: `./plans/{task-name}/plan-{track}/e2e/manifest.md`, plus track-local runner-appropriate artifacts
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code.
- Test files generated by `plan-unit-test` and `plan-e2e-test` are plan artifacts, not implementation code.
- Do not freeze final source-tree test placement in planning artifacts; implementation agents resolve it later from coding rules and local conventions.
- `playwright-guard` execution happens later; architect only plans that phase.
- Do not produce a plan with unresolved blocking ambiguity.
- In non-sequential mode, every implementation track must have matching `plan/tests/e2e` artifacts or an explicit `N/A` rationale.
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning.
  </Instructions>
  </Skill_Guide>
