---
name: architect
description: Codex entry skill for boundary-centered implementation planning. Use when a request needs one or more executable plan artifacts under `./plans` after resolving blocking product policy, UX, contract, schema, validation, state, or permission ambiguity, with a reviewer-facing `plan.md` written in plain Korean and per-phase technical detail files that expose the execution contracts for later `plan-review` and `plan-materialize`.
---

<Skill_Guide>
<Purpose>
Create decision-complete implementation plans as one or more sequential executable plans, with explicit execution phases, scenario-first boundary I/O contracts, and user-facing plan artifacts that stay focused on execution rather than orchestration metadata.
</Purpose>

<Instructions>
# architect

Use this as the preferred planning entrypoint for complex or high-impact requests, or after `brainstorm` confirms key decisions.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context
2. `./references/agents-lite.md` - execution agent catalog
3. `./references/planning-policy.md` - canonical planning rules and quality gates
4. `~/.codex/reviewWiki/wiki/index.md` - review-derived planning rule router
5. `./references/git.md` - commit message, branch naming, and worktree naming rules
6. `./references/plan-template-sequential.md` - sequential plan template
7. `./references/phase-template-detail.md` - per-phase technical detail template
8. Relevant execution contracts only when routing or mode-sensitive conventions matter:
    - inspect only the minimum repo-local tool/validation/runtime contract that governs the work
    - examples: `package.json` scripts, framework config, test config, CI config schema, deploy script entrypoints, or existing source-tree placement conventions

## Workflow

### Step 0. Read routing references (required)

Before writing any plan artifact:

- Read `./references/agents-lite.md`
- Read `./references/planning-policy.md`
- Read `~/.codex/reviewWiki/wiki/index.md`
- If the review wiki link or index is missing, broken, or unreadable, stop pretending it is optional:
    - report the missing dependency explicitly
    - use `review-wiki-setup` when available to repair it before continuing
- After reading the index, read only the review wiki documents whose `read_when` matches the current request and repo-local context.
- Do not skip the review wiki index just because the request looks familiar; the index is the mandatory router, not an optional reference dump.

### Step 1. Analyze request

- Clarify goals, boundaries, constraints, acceptance criteria, and feature policy.
- Classify missing information as `blocking`, `derivable`, or `deferrable` using `planning-policy.md`.
- Apply relevant review wiki guidance before deciding that a boundary, canonical identifier, prerequisite, or verification strategy is already obvious.
- Derive what can be confirmed from local context before asking the user.
- For behavior-changing work, identify the domain scenario first rather than jumping to implementation layers.
- Treat the scenario's `input -> output` contract as the planning primitive.

### Step 1.5. Resolve blocking decisions before planning (required)

- Do not write any plan artifact while `blocking` ambiguity remains.
- Route unresolved `blocking` ambiguity to `brainstorm` first.
- If direct clarification is necessary, ask only concise, actionable questions:
    - Batch at most 4 blocking questions at once
    - Prefer structured user-input tooling when available
    - Otherwise ask concise plain-text questions in chat
- For frontend/UI scope, resolve user-visible behavior well enough to define stable boundaries and expected outcomes in the plan.
- For notification, permission, routing, workflow, state-transition, or other behavior-changing scope, resolve enough detail to define:
    - trigger or precondition
    - canonical output that must happen
    - negative output that must not happen
    - recipient, delivery target, or final interpretation boundary when delivery or interpretation matters
    - sibling output candidates that are explicitly rejected when multiple identifiers, data shapes, or interpretation paths are plausible
- Do not force detailed E2E surface metadata into the plan when `plan-materialize` can derive it from the plan and local project context later.
- Do not hide unresolved blocking decisions outside the relevant phase or plan file.
- Carry forward `deferrable` items only as inline phase defaults or short constraint notes when they matter to execution.

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- Existing related features
- Tech stack and major boundaries
- Expected integration points
- Existing policies, contracts, behaviors, and conventions that answer missing questions
- Review wiki documents routed from `~/.codex/reviewWiki/wiki/index.md` when they affect split topology, contracts, state/validation, rollout, rollback, or verification quality

Do not deep-dive into implementation details.

### Step 2.5. Resolve execution contracts before routing (required for implementation plans)

- Before assigning `owner_agent` to implementation phases, inspect the relevant execution contract for the work type.
- For `frontend-developer` or `backend-developer`:
    - there is no dedicated frontend/backend CLI contract in this repository
    - inspect only the minimum repo-local command, config, or existing source-tree convention that governs the work
    - treat that repo-local contract as the source of truth for path policy, naming, validation, scaffold shape, and rollout constraints
- For `general-developer`:
    - there is no dedicated CLI contract in this repository
    - inspect only the minimum repo-local tool or validation command that governs the work
    - use those commands as the active execution contract for file boundaries, validation, and rollout constraints
- Use those contracts to confirm execution routing, phase boundaries, and inline defaults/constraints inside the relevant phase blocks.
- If one request spans multiple concerns, inspect each relevant contract instead of guessing from stale skill prose.
- Do not explain detailed task-by-task command situations in the plan prompt itself; defer command selection details to execution time.

### Step 3. Design plan structure

- Create executable plan artifacts under `./plans/`.
- Draft every reviewer-facing `plan.md` from `plan-template-sequential.md`.
- Draft one technical detail file per phase under `./plans/{task-slug}/phases/` from `phase-template-detail.md`.
- Required branch headers, phase metadata, routing policy, and execution handoff rules must follow `planning-policy.md`.
- Treat `plan-template-sequential.md` as the complete `plan.md` structure and `phase-template-detail.md` as the complete per-phase detail structure.
- Do not add extra top-level sections unless `planning-policy.md` explicitly requires them or the user explicitly asks for them.
- Keep the plan artifacts phase-first and terse.
- Treat `plan.md` as a user-facing review artifact. Assume the primary reader may not know implementation jargon.
- Keep technical execution detail, test taxonomy, orchestration metadata, and tool-routing detail out of `plan.md` unless the user explicitly asks for them.
- Write each `plan.md` heading as `### Phase n. {짧고 쉬운 역할 이름}` so the reader can identify the step's role before reading the full block.
- In `plan.md`, make each phase understandable through `목적`, `변경 내용`, `이전 상태`, and `이후 상태` rather than technical labels such as `boundary`, `input`, or `output`.
- Avoid unexplained jargon in `plan.md`. If a technical term is unavoidable, explain it in plain Korean on the same line.
- Make the role label concrete: prefer the changed area, moved responsibility, removed dependency, or resulting artifact over abstract labels such as `정리` or `마감` alone.
- Use the phase detail files for `owner_agent`, technical `input/output`, file-level boundary, `작업`, and `검증`.
- Keep `plan.md` and each linked phase detail file in parity. The detail file may refine the same phase, but it must not introduce a different change boundary or contradict the summary.
- When a later phase only finalizes exports, migration, or consumer validation, record the delta from earlier phases instead of restating the full contract verbatim.
- When fallback or default-selection policy matters, prefer short rule lists or state-to-outcome mappings over abstract prose in the detail file.
- Keep `시작 조건` in `plan.md` short and human-readable. Keep precise `선행조건` contracts in the phase detail file.
- Use as many `작업` bullets or paragraphs as needed in the detail file to make the phase executable; do not force arbitrary counts.
- In the detail file `작업`, lead with concrete file or boundary changes before abstract phrasing like `정리`, `마감`, or `닫기`.
- Use one canonical `task-slug` per executable plan. The owning plan folder name, the `Branch` summary, and the worktree directory must reuse that same slug. Follow `./references/git.md` for the exact branch/worktree format.
- For each behavior-changing phase, make the linked phase detail file precise enough that `plan-materialize` can derive a stable scenario contract without guessing:
    - scenario or trigger
    - inputs and preconditions
    - outputs that must happen
    - outputs that must not happen
    - recipient, delivery target, or final interpretation boundary when relevant
- Do not leave multiple plausible canonical outputs unresolved inside one phase. If the plan could support sibling outputs such as two competing identifiers, data shapes, or interpretation paths, resolve the winner in the plan or stop for clarification.

### Step 3.2. Choose plan count before writing (required)

- Default to one sequential executable plan at `./plans/{task-slug}/plan.md`.
- Emit multiple standalone executable plans only when `planning-policy.md` says the request contains multiple independently mergeable change boundaries.
- Before deciding plan count, list the candidate merge boundaries in one sentence each and test them against:
    - independent reviewability
    - independent rollback safety
    - validation-command overlap
    - whether one slice creates a shared foundation or contract that later slices consume
- When multiple valid topologies exist, prefer the one that exposes truly independent executable plans that can run in parallel without a mandatory later harmonization pass.
- For frontend/package UI work, prefer a separate foundation plan when an earlier slice establishes reusable component, asset, type, or export boundaries that later visual shells consume and can be validated on its own.
- For frontend/package UI work, allow a common-foundation plan plus parallel surface plans only when at least one downstream surface remains meaningfully independent of that shared work and can be reviewed, validated, and merged without waiting for a later mandatory integration slice.
- If common work, shared internals, or overlapping integration tasks pervade nearly every target surface, keep those serially coupled surfaces in one sequential plan and express the decomposition through narrower phases instead of forcing extra plans that only add orchestration cost.
- Do not split sibling visual shells into separate plans only because their layouts differ when they still share the same package boundary, owner agent, validation commands, and foundational helper contracts.
- When multiple-plan output is required:
    - write one executable plan per boundary
    - place each plan in its own folder, for example `./plans/{task-group}-{nn}-{slice-slug}/plan.md`
    - keep every plan sequential and template-based
    - give every plan its own `Branch` header, reviewer-facing phase summaries, and linked phase detail files
    - if one local plan depends on another, record the same prerequisite contract in the downstream phase detail `선행조건` and in exactly one upstream phase detail `output` plus `검증`
    - do not rely on broad foundation wording, handoff prose, or implied repo knowledge to prove a local prerequisite contract
- Do not force multiple plans only because many files change or one phase would be long.
- Do not generate overview, index, DAG, or root graph files.

### Step 3.5. Prepare automatic test materialization (conditional)

If a plan file includes implementation scope beyond documentation-only or structural-only work:

1. Read `../plan-materialize/SKILL.md`
2. Make the phase detail contracts explicit enough that `plan-materialize` can derive tests later without guessing
3. Let execution handoff treat the named custom agent `plan-materializer` as an automatic prerequisite for implementation plans
4. When the plan includes behavior, state, routing, or contract-selection changes, make the phase detail contract explicit enough for later materialization:
    - include the scenario-level `input -> output` contract in the phase detail file
    - include important negative outputs when they are part of the feature policy
    - avoid ambiguous output identifiers, data shapes, transformation boundaries, or interpretation boundaries

`architect` does not generate tests directly.
`plan-materialize` later decides `unit`, bounded-surface `e2e`, `skip`, or `defer` from the plan summary, the phase detail files, and local project conventions.

### Step 3.6. Plan full-flow Playwright guard phase (conditional)

If a plan file changes cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or any release-critical flow that needs regression hardening:

- Add a later phase with `owner_agent: playwright-guard`
- Define trigger, scope, and expected outputs using `planning-policy.md`

### Step 4. Quality gates (required)

- Run the quality-gate checklist in `planning-policy.md` before finalizing.
- Treat missing review wiki routing or skipped applicable wiki guidance as a failed quality gate.

### Step 5. Self-review gate (required)

- Re-run the same checklist in `planning-policy.md`.
- Incorporate critical findings before handoff.
- When multiple local plans exist, verify one-hop prerequisite parity before handoff:
    - each downstream detail-file `선행조건` maps to a specific upstream phase
    - the upstream detail-file `output` and `검증` restate the same contract without reinterpretation
    - the upstream detail-file `boundary` can actually establish that contract
- Treat this self-review as internal review only.
- If the user asks for an independent critical review, finish the plan artifact and hand it off to `plan-reviewer` instead of silently continuing to rewrite inside the same pass.

### Step 6. Compatibility policy (required)

- Plan Artifact Interface v7 applies to newly created plans.
- Existing plans are not automatically migrated.
- If a legacy plan format is detected during update:
    - keep user-requested scope
    - add a warning note near the top of the plan
    - avoid broad migration unless explicitly requested

### Step 7. Execution handoff

Architect does not execute implementation or source-tree test generation directly.
If the user asks for an independent cold review before execution, route the finished executable plan to the named custom agent `plan-reviewer` after writing it. The workflow source of truth remains the `plan-review` skill.
Provide a concise execution handoff summary using the handoff requirements in `planning-policy.md`.

## Output contract

- Plan artifacts:
    - single executable plan summary: `./plans/{task-slug}/plan.md`
    - matching phase detail files: `./plans/{task-slug}/phases/{nn}-{phase-slug}.md`
    - multiple executable plan summaries when required: `./plans/{task-group}-{nn}-{slice-slug}/plan.md`
    - each multi-plan artifact also owns matching phase detail files under its own `phases/`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code.
- Every executable plan file is sequential-only.
- Do not write `plan.md` as if only implementers will read it; keep it understandable to non-developers.
- Do not treat the review wiki as optional when its index is available; always read the index first and route from it.
- Do not generate or edit source-tree tests inside `architect`; hand them off to `plan-materialize`.
- `playwright-guard` execution happens later; architect only plans that phase.
- Do not produce a plan with unresolved blocking ambiguity.
- Do not generate multiple executable plan files unless plan-count rules in `planning-policy.md` require it.
- Do not generate overview, index, DAG, or root graph files.
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning.
- Do not prescribe arbitrary `작업` bullet counts.
- Do not let the plan folder name, branch summary, and worktree directory diverge.
- Do not leave a local prerequisite contract only in handoff prose; mirror it in the downstream phase detail `선행조건` and the upstream provider phase detail.
- Do not leave canonical outputs, negative outputs, or recipients implicit when later test materialization would have to guess.
- Do not hide the real phase role behind unexplained jargon such as `visual grammar`, `consumer`, `projection`, `wiring`, or `canonical` in `plan.md`.
- Do not impersonate `plan-reviewer`; when the user requests an external critical pass, hand off the finished plan instead of continuing to self-edit under the same skill.
  </Instructions>
</Skill_Guide>
