---
name: architect
description: Codex entry skill for rigorous implementation planning. Use when a request needs decision-complete sequential execution plans under ./plans after resolving blocking product policy, UX, contract, schema, validation, state, permission, and frontend UI-contract ambiguity.
---

<Skill_Guide>
<Purpose>
Create decision-complete implementation plans as a single sequential plan file with explicit execution phases and execution handoff.
</Purpose>

<Instructions>
# architect

Use this as the preferred planning entrypoint for complex or high-impact requests, or after `brainstorm` confirms key decisions.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context
2. `./.codex/skills/architect/references/agents-lite.md` - execution agent catalog
3. `./.codex/skills/architect/references/planning-policy.md` - canonical planning rules and quality gates
4. `./.codex/skills/architect/references/git.md` - commit message, branch naming, and worktree naming rules
5. `./.codex/skills/architect/references/plan-template-sequential.md` - sequential plan template
6. Relevant execution contracts only when routing or mode-sensitive conventions matter:
   - for `frontend-developer` or `backend-developer`, prefer narrow command-scoped CLI help first
   - use top-level `frontend --help`, `backend --help` only for command discovery
   - for `general-developer`, inspect only the minimum repo-local tool/validation contract that governs the work (for example `docker compose config`, `nginx -t`, CI config schema, or deploy script entrypoints)

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
- Do not hide unresolved blocking decisions outside the relevant phase or plan file.
- Carry forward `deferrable` items only as inline phase defaults or short constraint notes when they matter to execution.

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- Existing related features
- Tech stack and major boundaries
- Expected integration points
- Existing policies, contracts, behaviors, and conventions that answer missing questions

Do not deep-dive into implementation details.

### Step 2.5. Resolve execution contracts before routing (required for implementation plans)

- Before assigning `owner_agent` to implementation phases, inspect the relevant execution contract for the work type.
- For `frontend-developer` or `backend-developer`:
  - start with top-level `frontend --help` or `backend --help` only when command discovery is needed
  - then inspect only the minimum relevant command-scoped help for the chosen work
  - treat the returned help as the active mode-specific contract for path policy, naming, validation, scaffold shape, and available command surface
- For `general-developer`:
  - there is no dedicated CLI contract in this repository
  - inspect only the minimum repo-local tool or validation command that governs the work
  - use those commands as the active execution contract for file boundaries, validation, and rollout constraints
- Use those contracts to confirm execution routing, phase boundaries, and inline defaults/constraints inside the relevant phase blocks.
- If one request spans multiple concerns, inspect each relevant contract instead of guessing from stale skill prose.
- Do not explain detailed task-by-task command situations in the plan prompt itself; defer command selection details to execution time.

### Step 3. Design plan structure

- Create plan artifacts in `./plans/{task-name}/`.
- Draft every executable plan from `plan-template-sequential.md`.
- Required branch headers, phase metadata, routing policy, browser-contract requirements, and UI test-phase split must follow `planning-policy.md`.
- Keep plan artifacts phase-first and terse.
- Make each phase/task the primary execution contract by recording purpose, work, and verification checklist there instead of scattering those details across multiple summary sections.
- Use as many `작업` bullets or paragraphs as needed to make the phase executable; do not force arbitrary counts.
- Branch names must follow `./.codex/skills/architect/references/git.md` when available; worktree directory names are derived from the branch by replacing `/` with `-`.

### Step 3.2. Enforce single-plan output (required)

- Always create exactly one sequential plan at `./plans/{task-name}/plan.md`.
- Use phases inside that file to express execution order and scope boundaries.
- Do not split one request into multiple plan files.
- Do not generate DAG graphs, numbered plan folders, or any extra plan files.

### Step 3.5. Generate unit test plan (conditional)

If a plan file includes testable logic boundaries and constraint IDs (`[C-...]`):

1. Read `./.codex/skills/plan-unit-test/SKILL.md`
2. Execute the `plan-unit-test` workflow using the same directory as the owning `plan.md`:
   - `./plans/{task-name}/tests/`
3. Add or refresh `## 테스트 계획` in the owning `plan.md` with the unit-test manifest path and a brief scope summary
4. Verify the test manifest meets the coverage and implementation-handoff requirements defined by that skill

Skip for documentation-only, configuration-only, or structural-only scope with no testable code units.

### Step 3.6. Generate UI E2E test plan (conditional)

If a plan file changes feature-level user-facing behavior within a bounded UI surface:

1. Confirm frontend UI contracts are fully resolved
2. Read `./.codex/skills/plan-e2e-test/SKILL.md`
3. Execute `plan-e2e-test` using the same directory as the owning `plan.md`:
   - `./plans/{task-name}/e2e/`
4. Add or refresh `## 테스트 계획` in the owning `plan.md` with the E2E manifest path, runner, and bounded surface summary
5. Verify the manifest matches the E2E policy and implementation-handoff requirements in `planning-policy.md`

`plan-e2e-test` covers frozen feature/screen E2E artifacts only, using the runner selected from the environment. Browser full-flow regression coverage still belongs to a later `playwright-guard` phase.

### Step 3.7. Plan full-flow Playwright guard phase (conditional)

If a plan file changes cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or any release-critical flow that needs regression hardening:

- Add a later phase with `owner_agent: playwright-guard`
- Define trigger, scope, and expected outputs using `planning-policy.md`

### Step 4. Quality gates (required)

- Run the quality-gate checklist in `planning-policy.md` before finalizing.

### Step 5. Self-review gate (required)

- Re-run the same checklist in `planning-policy.md`.
- Incorporate critical findings before handoff.

### Step 6. Compatibility policy (required)

- Plan Artifact Interface v5 applies to newly created plans.
- Existing plans are not automatically migrated.
- If a legacy plan format is detected during update:
  - keep user-requested scope
  - add a warning note near the top of the plan
  - avoid broad migration unless explicitly requested

### Step 7. Execution handoff

Architect does not execute implementation directly.
Provide a concise execution handoff summary using the handoff requirements in `planning-policy.md`.

## Output contract

- Plan file:
  - `./plans/{task-name}/plan.md`
- Unit test artifacts when Step 3.5 applies:
  - `./plans/{task-name}/tests/manifest.md`, `./plans/{task-name}/tests/{flat-artifact-files}`
- E2E test artifacts when Step 3.6 applies:
  - `./plans/{task-name}/e2e/manifest.md`, plus flat runner-appropriate artifacts such as `./plans/{task-name}/e2e/{surface-id}.spec.ts` or `./plans/{task-name}/e2e/{flow-id}.yaml`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code.
- Every executable plan file is sequential-only.
- Test files generated by `plan-unit-test` and `plan-e2e-test` are plan artifacts, not implementation code.
- Do not freeze final source-tree test placement in planning artifacts; implementation agents resolve it later from the relevant manifest, coding rules, and local conventions.
- `playwright-guard` execution happens later; architect only plans that phase.
- Do not produce a plan with unresolved blocking ambiguity.
- Do not generate multiple plan files, DAG metadata, or root graph metadata.
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning.
- Do not prescribe arbitrary `작업` bullet counts.
  </Instructions>
  </Skill_Guide>
