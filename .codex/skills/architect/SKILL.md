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

1. User request and latest conversation context
2. `./.codex/skills/architect/references/agents-lite.md` - execution agent catalog
3. `./.codex/skills/architect/references/planning-policy.md` - canonical planning rules and quality gates
4. `./.ai/references/coding-rules/git.md` - branch naming rules
5. Template references only when drafting:
   - `./.codex/skills/architect/references/plan-template-sequential.md`
   - `./.codex/skills/architect/references/plan-template-dag.md`
6. `./.codex/skills/architect/references/parallel-safety.md` only when Step 4 evaluates parallel execution

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
- For frontend/UI scope, browser contracts defined in `planning-policy.md` must be decision-complete before implementation planning or `plan-e2e-test`.
- Do not hide unresolved blocking decisions inside `Assumptions and risks`.
- Only carry forward `deferrable` items as explicit defaults.

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- Existing related features
- Tech stack and major boundaries
- Expected integration points
- Existing policies, contracts, behaviors, and conventions that answer missing questions

Do not deep-dive into implementation details.

### Step 3. Design plan structure

- Create plan artifacts in `./plans/{task-name}/`.
- Draft from the sequential or DAG template reference.
- Required sections, branch headers, `owner_agent` formatting, routing policy, browser-contract requirements, and UI test-phase split must follow `planning-policy.md`.
- Branch names must follow `./.ai/references/coding-rules/git.md`.

### Step 3.5. Generate unit test plan (conditional)

If the plan includes testable logic boundaries and constraint IDs (`[C-...]`):

1. Read `./.codex/skills/plan-unit-test/SKILL.md`
2. Execute the `plan-unit-test` workflow under `./plans/{task-name}/tests/`
3. Verify the test manifest meets the coverage requirements defined by that skill

Skip for documentation-only, configuration-only, or structural-only scope with no testable code units.

### Step 3.6. Generate browser integration test plan (conditional)

If the task changes feature-level user-facing browser behavior:

1. Confirm frontend browser contracts are fully resolved
2. Read `./.codex/skills/plan-e2e-test/SKILL.md`
3. Execute `plan-e2e-test` under `./plans/{task-name}/e2e/`
4. Verify the manifest matches the browser-integration policy in `planning-policy.md`

`plan-e2e-test` covers frozen feature/screen browser-integration tests only. Cross-route journeys and post-implementation regression coverage belong to a later `playwright-guard` phase.

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
  - `./plans/{task-name}/plan-{track}.md` (2+)
- Unit test artifacts when Step 3.5 applies:
  - `./plans/{task-name}/tests/manifest.md`
  - `./plans/{task-name}/tests/{mirrored-source-paths}`
- Browser integration test artifacts when Step 3.6 applies:
  - `./plans/{task-name}/e2e/manifest.md`
  - `./plans/{task-name}/e2e/{domain}/{scenario}.spec.ts`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code.
- Test files generated by `plan-unit-test` and `plan-e2e-test` are plan artifacts, not implementation code.
- `playwright-guard` execution happens later; architect only plans that phase.
- Do not produce a plan with unresolved blocking ambiguity.
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning.
</Instructions>
</Skill_Guide>
