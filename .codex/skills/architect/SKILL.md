---
name: architect
description: Codex entry skill for request-traceable implementation planning. Use when a request needs one or more executable plan artifacts under `./plans` after resolving blocking product policy, UX, contract, schema, validation, state, permission, and any upstream UI-direction ambiguity handled by `brainstorm` or `design-discovery`, with a controller-facing `plan.md` written in plain Korean that keeps the user's request items visible, groups work by concrete boundaries, exposes public contracts before execution order, and links per-phase technical detail files for later `plan-review` and `plan-materialize`, plus registry-backed review wiki core/pattern guidance.
---

<Skill_Guide>
<Purpose>
Create decision-complete implementation plans as one or more sequential executable plans, with explicit execution phases, scenario-first boundary I/O contracts, and controller-first plan artifacts that preserve the user's wording, expose concrete work bundles and public contracts before execution order, and keep later execution from guessing.
</Purpose>

<Instructions>
# architect

Use this as the preferred planning entrypoint for complex or high-impact requests, or after `brainstorm` confirms key decisions.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context
2. Optional orchestrator handoff in the latest conversation context when invoked by `orchestrator`:
   - `task_slug`
   - `plan_path`
   - `review_wiki_root`
   - optional `latest_review_path`
   - optional locked request summary when the parent intentionally narrowed context
   - optional `authoritative_existing_inputs` containing controller-verified literal upstream artifact paths
   - optional `known_missing_inputs` containing referenced but missing literal paths as non-authoritative warnings
3. Optional `design-discovery` handoff from the latest conversation context or a directly referenced `./.codex/artifacts/design-discovery/{feature-name}.md`
4. `./references/agents-lite.md` - execution agent catalog
5. `../review-wiki-setup/references/staging-contract.md` - review wiki sync resolution and refresh rules
6. `../review-wiki-setup/references/platform-commands.md` - platform-specific link and planning-root commands
7. Resolved planning `review_wiki_root` containing `registry.json`, `core/`, `patterns/`, and selection policy. Use `./.codex/review-wiki/sync/current` as the planning root.
8. Every core document listed in the registry `core` array, in listed order
9. Candidate pattern files selected from the registry `patterns` list using the `architect` selection mode plus matching `Apply When`
10. `./references/git.md` - commit message, branch naming, and worktree naming rules
11. `./references/plan-template-sequential.md` - sequential plan template
12. `./references/phase-template-detail.md` - per-phase technical detail template
13. `./references/visual-parity-contract.md` - canonical comparison-mode, surface-role, and metric-contract rules for visual parity tasks
14. Relevant execution contracts only when routing or mode-sensitive conventions matter:
   - inspect only the minimum repo-local tool/validation/runtime contract that governs the work
   - examples: `package.json` scripts, framework config, test config, CI config schema, deploy script entrypoints, or existing source-tree placement conventions
15. Context7 MCP tools only as fallback when external library or API facts can still change the planning boundary after local inspection and any prior `brainstorm` handoff:
   - use Context7 only for version-sensitive library/framework/API behavior, migration constraints, deprecation status, or current recommended patterns
   - do not use Context7 for repo-local conventions, stable language basics, or facts already derivable from local context

## Workflow

### Step 0. Read routing references (required)

Before writing any plan artifact:

- Determine execution mode first:
  - if an explicit orchestrator handoff provides `task_slug`, `plan_path`, and `review_wiki_root`, enter orchestrated mode
  - otherwise enter direct mode
- Read `./references/agents-lite.md`
- In orchestrated mode:
  - treat the provided `task_slug`, `plan_path`, and `review_wiki_root` as authoritative
  - if `authoritative_existing_inputs` is provided, treat only those literal paths as authoritative task-local upstream inputs
  - if `known_missing_inputs` is provided, treat them only as explicit missing-path warnings and not as prompts for substitute discovery
  - if this architect instance is being reused for the same `task-slug`, treat the current plan artifacts and latest review artifact as higher priority than stale chat memory
  - if `latest_review_path` is provided and exists, read it
  - do not run review wiki staging
  - do not verify legacy planning-profile availability
  - do not inspect runtime or CLI invocation paths
  - do not broaden the task by searching for substitute or similarly named upstream paths unless the controller explicitly passed them
  - if the orchestrator handoff is missing required fields or contradictory, block instead of guessing
- In direct mode:
  - read `../review-wiki-setup/references/staging-contract.md`
  - read `../review-wiki-setup/references/platform-commands.md`
  - resolve `review_wiki_root` to `./.codex/review-wiki/sync/current`
  - if the workspace sync is missing:
    - report the missing dependency explicitly
    - use `review-wiki-setup` when available to repair it before continuing
- Read `{review_wiki_root}/registry.json`
- Read every path listed in the registry `core` array, in order, resolving relative paths from `review_wiki_root`
- Derive initial tags from the user request and repo-local context
- Select candidate pattern files from the registry `patterns` list using the registry `selection.architect` mode and `adjacency_rules`
- Read only the selected pattern files whose `Apply When` clauses actually match the request or repo-local context
- Do not skip the registry because the request looks familiar; it is the mandatory routing contract

### Step 1. Analyze request

- First consume any `design-discovery` handoff and treat its approved UI direction, hierarchy, state-presentation expectations, responsive constraints, reuse rules, and referenced visuals as the default planning input for UI work
- Clarify goals, boundaries, constraints, acceptance criteria, and feature policy
- Treat the user's wording as canonical and keep it traceable through the plan
- Decompose the request into concrete items and touched work bundles before naming phases
- Classify missing information as `blocking`, `derivable`, or `deferrable` using the active review wiki core decision policy
- Apply relevant selected pattern guidance before deciding that a boundary, canonical identifier, prerequisite, or verification strategy is already obvious
- Derive what can be confirmed from local context before asking the user
- For behavior-changing work, identify the domain scenario first rather than jumping to implementation layers
- Treat the scenario's `input -> output` contract as the planning primitive
- Do not replace the user's wording with planner shorthand when a concrete itemized restatement is possible

### Step 1.2. Verify unstable external facts when needed (conditional)

- First consume any `brainstorm` handoff and treat its confirmed library/framework/API decisions as the default planning input
- If the planning boundary still depends on current library/framework/API behavior, or the upstream handoff is missing, incomplete, or risky, query Context7 before freezing the plan
- Prefer Context7 over general web search for package docs, framework APIs, migration notes, and recommended usage patterns
- Use Context7 to confirm only the minimum facts that can change the plan:
  - canonical API or feature availability
  - version-sensitive constraints or breaking changes
  - deprecated or replaced patterns
  - current recommended integration or configuration shape
- If Context7 is unavailable or incomplete:
  - state that explicitly
  - avoid presenting assumptions as confirmed facts
  - ask the user to confirm the risky assumption only when it would change the plan boundary or phase contract
- Do not dump raw documentation into the plan; compress the result into planning-relevant constraints and choices only

### Step 1.5. Resolve blocking decisions before planning (required)

- Do not write any plan artifact while `blocking` ambiguity remains
- Route unresolved `blocking` ambiguity to `brainstorm` first
- If UI scope exists and user-visible hierarchy, state presentation, responsive behavior, or design-system fit are still ambiguous enough that planning would force later design guessing, route that ambiguity to `design-discovery` before writing the plan
- If direct clarification is necessary, ask only concise, actionable questions:
  - batch at most 4 blocking questions at once
  - prefer structured user-input tooling when available
  - otherwise ask concise plain-text questions in chat
- In orchestrated mode, if `blocking` ambiguity remains before any executable plan can be written:
  - return a concise blocking decision packet in the response instead of writing helper files
  - include at least:
    - `task_slug`
    - `needs_user_input`
    - `next_action`
    - `why_it_matters`
    - `options`
    - `recommendation`
    - `default`
  - stop before creating or updating `./plans/**`
- In orchestrated mode, if the provided authoritative inputs are insufficient, stale, or missing for safe planning, block with the decision packet instead of repairing authority through broader repo discovery
- If the blocking issue is missing UI direction, hierarchy, or state presentation, make the decision packet explicitly tell the user to run `design-discovery` or provide equivalent locked UI decisions before planning continues
- For user-visible scope, resolve behavior well enough to define stable boundaries and expected outcomes in the plan
- For touched public boundaries such as components, hooks, APIs, routes, or services, resolve enough detail to name the public surface that will change:
  - props / inputs / outputs
  - callback names and handoff meaning
  - state ownership (`controlled`, `default`, `internal`, `host-owned`) when relevant
  - invalid / no-op rules when execution would otherwise guess
  - explicit exclusions that need user approval
- For notification, permission, routing, workflow, state-transition, or other behavior-changing scope, resolve enough detail to define:
  - trigger or precondition
  - canonical output that must happen
  - negative output that must not happen
  - observable state or output markers for interactive behavior when execution or later tests would otherwise have to guess
  - recipient, delivery target, or final interpretation boundary when delivery or interpretation matters
  - sibling output candidates that are explicitly rejected when multiple identifiers, data shapes, or interpretation paths are plausible
- Do not force detailed E2E surface metadata into the plan when `plan-materialize` can derive it later
- Do not hide unresolved blocking decisions outside the relevant phase or plan file
- Carry forward `deferrable` items only as inline phase defaults or short constraint notes when they matter to execution

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- existing related features
- tech stack and major boundaries
- expected integration points
- existing policies, contracts, behaviors, and conventions that answer missing questions
- `design-discovery` outcomes when they materially affect user-visible planning boundaries, hierarchy, or state coverage
- the selected pattern files when they affect split topology, contracts, state/validation, rollout, rollback, or verification quality

Do not deep-dive into implementation details.

### Step 2.5. Resolve execution contracts before routing (required for implementation plans)

- Before assigning `owner_agent` to implementation phases, inspect the relevant execution contract for the work type
- For `frontend-developer` or `backend-developer`:
  - there is no dedicated frontend/backend CLI contract in this repository
  - inspect only the minimum repo-local command, config, or existing source-tree convention that governs the work
  - treat that repo-local contract as the source of truth for path policy, naming, validation, scaffold shape, and rollout constraints
- For `visual-comparator`:
  - there is no dedicated compare CLI contract in this repository
  - inspect only the minimum repo-local reference source, selector policy, capture path, and artifact location that govern the comparison phase
  - if visual parity is part of acceptance, also inspect `./references/visual-parity-contract.md`
  - treat the comparison mode, gating metric, non-gating metric, surface-role mapping, comparison policy, and metric treatment as part of the compare execution contract
  - treat those repo-local inputs as the source of truth for what gets captured, what gets compared, and what evidence must be committed
- For `general-developer`:
  - there is no dedicated CLI contract in this repository
  - inspect only the minimum repo-local tool or validation command that governs the work
  - use those commands as the active execution contract for file boundaries, validation, and rollout constraints
- Use those contracts to confirm execution routing, phase boundaries, and inline defaults or constraints inside the relevant phase blocks
- If one request spans multiple concerns, inspect each relevant contract instead of guessing from stale skill prose
- Do not explain detailed task-by-task command situations in the plan prompt itself; defer command selection details to execution time

### Step 3. Design plan structure

- Create executable plan artifacts under `./plans/`
- Draft every reviewer-facing `plan.md` from `plan-template-sequential.md`
- Draft one technical detail file per phase under `./plans/{task-slug}/phases/` from `phase-template-detail.md`
- Required branch headers, phase metadata, routing policy, and execution handoff rules must follow the active review wiki core docs
- Treat `plan-template-sequential.md` as the complete `plan.md` structure and `phase-template-detail.md` as the complete per-phase detail structure
- Do not add extra top-level sections unless a core doc explicitly requires them or the user explicitly asks for them
- Do not add a dedicated top-level design-discovery recap section; compress approved UI-direction decisions into the existing request, contract, and phase detail tables
- Treat `plan.md` as a controller-first user-facing review artifact
- Keep the top preamble minimal: `Branch`, a one-line `Worktree dir`, then a compact routing table with `# | Phase | Agent`
- In that routing table, use the linked phase detail path in `Phase` and mirror the linked detail-file `owner_agent` in `Agent`
- After the routing table, use the sections fixed by `plan-template-sequential.md` in the same order.
- Keep `plan.md` reviewable without opening phase detail files first.
- Lead with tables, not paragraph blocks.
- The top half of `plan.md` must let a human reviewer answer:
  - what the user asked for
  - which concrete work bundles will change
  - which public contracts are being locked
  - what is explicitly excluded
- Use `## 요청 추적` to map the user's request items to the plan scope without replacing them with planner taxonomy.
- Use `## 작업 단위 요약` to group work by concrete boundaries such as components, hooks, routes, services, or screens.
- Use `## 공개 계약 요약` to expose touched public surfaces before phase ordering.
- Use `## 소유권/상태 규칙` when ownership, winner rules, open/close rules, or no-op rules matter.
- Use `## 제외 범위` to show excluded items one row at a time with reason and approval status.
- Use `## 단계 개요` and `## Phase 단계 설명` to explain sequence after the work bundles and public contracts are already visible.
- End `plan.md` with `## 검토 체크리스트`.
- When Context7 changed or confirmed a planning decision, record only the outcome in the top-level request / contract tables or the relevant phase detail file:
  - do not restate the whole lookup when `brainstorm` already resolved it; carry forward the confirmed outcome and only note the delta if `architect` had to re-check it
  - use the top-level request / contract tables for cross-phase choices such as library selection, version policy, or migration direction
  - use the relevant phase detail file for phase-local API constraints, deprecations, or integration rules
- When a `design-discovery` handoff exists, record only the locked outcome in the top-level request / contract tables or the relevant phase detail file:
  - do not restate the whole consultation history or variant loop
  - use the top-level request / contract tables for cross-phase UI direction, design-system, or hierarchy constraints
  - use the relevant phase detail file for phase-local state presentation, responsive behavior, or component interaction rules
- Treat the compact top routing table as navigation metadata only; keep routing rationale, scenario I/O contracts, detailed validation commands, test taxonomy, and orchestration metadata out of `plan.md` unless the user explicitly asks for them
- Keep high-level boundary changes and human-readable completion conditions in `plan.md`; keep file-level change maps and detailed constraints in the linked phase detail files
- Write each `plan.md` phase card as a short metadata table, not a prose block
- Avoid unexplained jargon in `plan.md`
- Make work-bundle names concrete
- Use the phase detail files for work-bundle cards, file-level preconditions, execution ordering, constraints, and `검증`
- Start every phase detail file with `## Phase 요약` and `## 작업 순서`
- Then break the phase into concrete work-bundle sections such as `## 작업 묶음 A. ...`, `## 작업 묶음 B. ...`
- Inside each work-bundle section, expose:
  - why it changes
  - current problem
  - target state
  - kept boundaries
  - related files
  - public contract
  - validation points
- Keep `plan.md` and each linked phase detail file in parity
- Do not restate a conclusion already fixed in a top-level contract table unless a later skill would otherwise have to guess the contract
- When a later phase only finalizes exports, migration, or consumer validation, record the delta from earlier phases instead of restating the full contract
- When fallback or default-selection policy matters, prefer short rule lists or state-to-outcome mappings in the detail file
- Keep `시작 조건` in `plan.md` short and human-readable
- In work-bundle file tables, use `파일 | 작업 방식 | 완료 조건`
- Keep phase detail sections table-heavy and scan-friendly; do not collapse a whole phase into one long paragraph
- Use one canonical `task-slug` per executable plan
- For each behavior-changing phase, make the linked phase detail file precise enough that `plan-materialize` can derive a stable scenario contract without guessing
- Do not leave multiple plausible canonical outputs unresolved inside one phase
- If a controller cannot answer "what the user asked for, which boundaries change, which public contracts are locked, what is excluded, and what each phase fixes" from the top-level tables plus the phase work-bundle cards, the plan fails the quality bar

### Step 3.2. Choose plan count before writing (required)

- Default to one sequential executable plan at `./plans/{task-slug}/plan.md`
- Emit multiple standalone executable plans only when the active core contract says the request contains multiple independently mergeable change boundaries
- Before deciding plan count, list the candidate merge boundaries in one sentence each and test them against:
  - independent reviewability
  - independent rollback safety
  - validation-command overlap
  - whether one slice creates a shared foundation or contract that later slices consume
- When multiple valid topologies exist, prefer the one that exposes truly independent executable plans that can run in parallel without a mandatory later harmonization pass
- When multiple-plan output is required:
  - write one executable plan per boundary
  - place each plan in its own folder
  - keep every plan sequential and template-based
  - give every plan its own `Branch` header, reviewer-facing phase summaries, and linked phase detail files
  - if one local plan depends on another, record the same prerequisite contract in the downstream phase detail `선행조건` and in exactly one upstream phase detail `output` plus `검증`
- Do not force multiple plans only because many files change or one phase would be long
- Do not generate overview, index, DAG, or root graph files

### Step 3.5. Prepare automatic test materialization (conditional)

If a plan file includes implementation scope beyond documentation-only or structural-only work:

1. Read `../plan-materialize/SKILL.md`
2. Make the phase detail contracts explicit enough that `plan-materialize` can derive tests later without guessing
3. Let execution handoff treat a later `plan-materialize` sub-agent pass as an automatic prerequisite for implementation plans
4. When the plan includes behavior, state, routing, or contract-selection changes, make the phase detail contract explicit enough for later materialization

`architect` does not generate tests directly.
`plan-materialize` later decides `unit`, `runtime`, selected `e2e`, `skip`, or `block` from the plan summary, the phase detail files, and local project conventions.
`architect` does not enumerate owner-test inventories or choose concrete test files.

### Step 3.6. Plan journey and full-flow E2E ownership in `plan-materialize` (conditional)

If a plan file changes cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or any release-critical flow that needs regression hardening:

- Do not add a dedicated `playwright-guard` phase just for that coverage
- Make the changed journey contract explicit enough that `plan-materialize` can materialize the selected full-flow E2E directly
- Define trigger, scope, state checkpoints, and expected outputs in the relevant phase detail file using the active review wiki core docs

### Step 3.7. Plan reference-based visual comparison phase (conditional)

If a plan implements UI against an external visual reference such as a live URL, image, screenshot set, or Figma file, and acceptance depends on comparing the implementation against that reference:

- Add a later phase with `owner_agent: visual-comparator`
- Choose exactly one `comparison mode` per compared state or scope
- Default to `structural parity` when fixture payloads, repeated mock media, synthetic body content, or other known non-reference-equivalent surfaces would otherwise dominate whole-canvas mismatch
- Make that phase capture or load the reference side and the current implementation side explicitly
- Make the phase detail file state one blocking `gating metric` and one separate `non-gating metric`, or `none` when no advisory metric is needed
- Use the canonical surface roles from `./references/visual-parity-contract.md`; task-local nouns can appear only as local mapping notes
- For each relevant surface, declare the `comparison policy` and `metric treatment`
- Require repo-local capture, diff, and report artifacts plus a pass/fail decision in the phase detail file
- Require the report contract to separate blocking pass/fail from global drift reporting
- If failed comparison can lead to more UI work, add a subsequent `frontend-developer` phase for fixes instead of hiding rework inside the compare phase

### Step 4. Quality gates (required)

- Run the quality-gate checklist in `{review_wiki_root}/core/quality-gates.md` before finalizing
- Treat missing review wiki routing or skipped applicable wiki guidance as a failed quality gate

### Step 5. Self-review gate (required)

- Re-run the same checklist in `{review_wiki_root}/core/quality-gates.md`
- Incorporate critical findings before handoff
- When multiple local plans exist, verify one-hop prerequisite parity before handoff:
  - each downstream detail-file `선행조건` maps to a specific upstream phase
  - the upstream detail-file `output` and `검증` restate the same contract without reinterpretation
  - the upstream detail-file `boundary` can actually establish that contract
- Treat this self-review as internal review only
- If the user asks for an independent critical review, finish the plan artifact and hand it off to an independent `plan-review` pass

### Step 6. Compatibility policy (required)

- Plan Artifact Interface v10 applies to newly created plans
- Existing plans are not automatically migrated
- If a legacy plan format is detected during update:
  - keep user-requested scope
  - add a warning note near the top of the plan
  - avoid broad migration unless explicitly requested

### Step 7. Execution handoff

Architect does not execute implementation or source-tree test generation directly.
If the user asks for an independent cold review before execution, route the finished executable plan to an independent `plan-review` pass after writing it. The workflow source of truth remains the `plan-review` skill.
Provide a concise execution handoff summary using the handoff requirements in `{review_wiki_root}/core/execution-handoff.md`.

## Output contract

- Plan artifacts:
  - single executable plan summary: `./plans/{task-slug}/plan.md`
  - matching phase detail files: `./plans/{task-slug}/phases/{nn}-{phase-slug}.md`
  - multiple executable plan summaries when required: `./plans/{task-group}-{nn}-{slice-slug}/plan.md`
  - each multi-plan artifact also owns matching phase detail files under its own `phases/`
- Optional orchestration blocking decision packet returned in chat when planning must stop before any executable plan is writable
- In orchestrated mode, the terminal result must be exactly one of:
  - `result = wrote_plan` with `written_paths` listing every created or updated artifact path
  - `result = blocking_packet` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, `options`, `recommendation`, and `default`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code
- Every executable plan file is sequential-only
- Do not write `plan.md` as if only implementers will read it
- Do not treat the review wiki as optional when its registry is available; always read the registry first and route from it
- Do not bypass the resolved `review_wiki_root` with hardcoded external-path reads once the workspace sync path is available
- In orchestrated mode, do not redo review wiki bootstrap or orchestration preflight that the orchestrator already completed
- In orchestrated mode, do not rediscover controller-owned authority beyond provided `authoritative_existing_inputs`
- Do not generate or edit source-tree tests inside `architect`
- `visual-comparator` execution happens later; architect only plans that phase
- Do not produce a plan with unresolved blocking ambiguity
- Do not replace the user's wording with planner shorthand when the user's wording can be preserved in a request row
- In orchestrated mode, do not leave pre-plan blocking questions only as vague chat questions; emit a structured decision packet instead
- In orchestrated mode, do not reinterpret `known_missing_inputs` as prompts to search for substitute paths
- In orchestrated mode, do not finish with progress-only updates; return plan artifacts or the blocking decision packet
- Do not leave user-visible hierarchy, state presentation, or responsive behavior implicit when `design-discovery` already resolved them
- Do not add new top-level plan sections just to mirror a `design-discovery` handoff
- Do not treat Context7 as mandatory for every plan; use it only when unstable external facts can change the boundary, contract, or phase split
- Do not re-query Context7 just because it is available when `brainstorm` already resolved the relevant library/framework/API decision well enough for planning
- Do not leave Context7-derived constraints only in transient reasoning; if they matter, compress them into the top-level request / contract tables or the relevant phase detail file
- Do not generate multiple executable plan files unless the active core plan-count rule requires it
- Do not generate overview, index, DAG, or root graph files
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning
- Do not prescribe arbitrary `작업 순서` step counts
- Do not let the plan folder name, branch summary, and worktree directory diverge
- Do not leave a local prerequisite contract only in handoff prose
- Do not leave canonical outputs, negative outputs, or recipients implicit when later test materialization would have to guess
- Do not hide the real phase role behind unexplained jargon in `plan.md`
- Do not make the controller open every phase detail file just to understand the whole plan flow
- Do not bury the actual work of a phase under routing metadata or abstract labels
- Do not make a reviewer reconstruct public props, callback names, state ownership, or exclusions from prose alone
- Do not use task-local UI nouns as the canonical taxonomy for a visual parity contract
- Do not claim scoped or structural visual parity closure without an explicit blocking gating metric and a separate non-gating metric decision
</Instructions>
</Skill_Guide>
