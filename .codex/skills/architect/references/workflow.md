# Architect Workflow

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
- Read every path listed in `stage_core.architect` when present, otherwise every path listed in the registry `core` array, resolving relative paths from `review_wiki_root`
- Read `./references/terminology-policy.md` before drafting visible plan or phase detail prose
- Derive initial tags from the user request and repo-local context
- Select candidate pattern files from the registry `patterns` list using the registry `selection.architect` mode and `adjacency_rules`
- Read only the selected pattern files whose `적용 조건` clauses actually match the request or repo-local context
- Do not skip the registry because the request looks familiar; it is the mandatory routing contract

### Step 1. Analyze request

- First consume any locked UI direction handoff and treat its approved hierarchy, state-presentation expectations, responsive constraints, reuse rules, and referenced visuals as the default planning input for UI work
- Clarify goals, boundaries, constraints, acceptance criteria, and feature policy
- Treat the user's wording as canonical and keep it traceable through the plan
- Decompose the request into concrete items and touched work bundles before naming phases
- Classify missing information as `blocking`, `derivable`, or `deferrable` using the active review wiki core decision policy
- Treat new production source topology as `blocking` unless it is uniquely derivable from existing repo conventions or an upstream request-scope / user decision
- Apply relevant selected pattern guidance before deciding that a boundary, canonical identifier, prerequisite, or verification strategy is already obvious
- Derive what can be confirmed from local context before asking the user
- For behavior-changing work, identify the domain scenario first rather than jumping to implementation layers
- Treat the scenario's `input -> output` contract as the planning primitive
- Do not replace the user's wording with planner shorthand when a concrete itemized restatement is possible

### Step 2. Verify unstable external facts when needed (conditional)

- First consume any upstream request-scope handoff and treat its confirmed library/framework/API decisions as the default planning input
- If an upstream request-scope handoff includes review wiki preflight findings, treat them as ambiguity-resolution notes, not as a substitute for reading the active architect core docs yourself
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

### Step 3. Resolve blocking decisions before planning (required)

- Do not write any plan artifact while `blocking` ambiguity remains
- Stop with a missing-decision packet when unresolved `blocking` ambiguity remains
- If UI scope exists and user-visible hierarchy, state presentation, responsive behavior, or design-system fit are still ambiguous enough that planning would force later design guessing, require `locked_ui_direction` before writing the plan
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
- If the blocking issue is missing UI direction, hierarchy, or state presentation, make the decision packet explicitly request `locked_ui_direction` or equivalent concrete UI decisions before planning continues
- For user-visible scope, resolve behavior well enough to define stable boundaries and expected outcomes in the plan
- For touched public boundaries such as components, hooks, APIs, routes, or services, resolve enough detail to name the public boundary that will change:
  - props / inputs / outputs
  - callback names and handoff meaning
  - state ownership (`controlled`, `default`, `internal`, `host-owned`) when relevant
  - invalid / no-op rules when execution would otherwise guess
  - explicit exclusions that need user approval
- For new files, folders, modules, or test-owner placement that will shape implementation:
  - derive the source topology from existing repo conventions before naming concrete paths
  - if multiple placements are plausible, ask for a locked request-scope decision before writing plan artifacts
  - do not record candidate or example paths as if they are committed file contracts
  - when topology is intentionally selected, make the owning boundary and rationale visible in `변경 형상`, `잠긴 계약`, or the relevant phase detail
- For notification, permission, routing, workflow, state-transition, or other behavior-changing scope, resolve enough detail to define:
  - trigger or precondition
  - canonical output that must happen
  - negative output that must not happen
  - observable state or output markers for interactive behavior when execution or later tests would otherwise have to guess
  - recipient, delivery target, or final interpretation boundary when delivery or interpretation matters
  - sibling output candidates that are explicitly rejected when multiple identifiers, data shapes, or interpretation paths are plausible
- Do not force detailed E2E ownership details into the plan when `plan-materialize` can derive them later
- Do not hide unresolved blocking decisions outside the relevant phase or plan file
- Carry forward `deferrable` items only as inline phase defaults or short constraint notes when they matter to execution

### Step 4. Gather high-level context (optional)

Use high-level inspection only:

- existing related features
- tech stack and major boundaries
- expected integration points
- existing policies, contracts, behaviors, and conventions that answer missing questions
- locked UI direction outcomes when they materially affect user-visible planning boundaries, hierarchy, or state coverage
- the selected pattern files when they affect split topology, contracts, state/validation, rollout, rollback, or verification quality

Do not deep-dive into implementation details.

### Step 5. Resolve execution contracts before routing (required for implementation plans)

- Before assigning `owner_agent`, apply the active review wiki execution-routing and test/review handoff core docs.
- Use `./references/agents-lite.md` only as the local catalog of available execution agents.
- Inspect the minimum repo-local command, config, plugin skill, or source-tree convention that governs the selected work type.
- If visual comparison acceptance is in scope, inspect `./references/visual-parity-contract.md` for local metric and surface-role schema only.
- Use those local contracts to confirm path policy, naming, validation, scaffold shape, evidence artifacts, and rollout constraints inside the relevant phase blocks.
- If one request spans multiple concerns, inspect each relevant local contract instead of guessing from stale skill prose.
- Do not explain detailed task-by-task command situations in the plan prompt itself; defer command selection details to execution time.

### Step 6. Design plan structure

- Create executable plan artifacts under `./plans/`
- Draft every `plan.md` from `plan-template-sequential.md`
- Draft one technical detail file per phase under `./plans/{task-slug}/phases/` from `phase-template-detail.md`
- Apply `terminology-policy.md` before writing any visible plan prose:
  - keep English for exact identifiers, commands, paths, API names, schema keys, agent names, and canonical taxonomy IDs
  - translate planner shorthand such as `surface`, `user action`, `completion condition`, general `routing`, `boundary`, `contract`, `metadata`, `owner`, and `phase` into Korean in human-readable prose
  - when an English key must remain literal, put it in code spans and write the surrounding explanation in Korean
- Required branch headers, phase metadata, routing policy, and execution handoff rules must follow the active review wiki core docs
- Treat `plan-template-sequential.md` as the complete `plan.md` structure and `phase-template-detail.md` as the complete per-phase detail structure
- Do not add extra top-level sections unless a core doc explicitly requires them or the user explicitly asks for them
- Do not add a dedicated top-level upstream UI recap section; compress approved UI-direction decisions into the existing request, contract, and phase detail tables
- Apply the active review wiki plan-artifact contract for the `plan.md` / phase-detail split; do not duplicate phase-local implementation detail in `plan.md`.
- Keep the top preamble minimal: `Branch`, a one-line `Worktree dir`, then the compact routing table with `# | Phase | Agent`
- In that routing table, use the linked phase detail path in `Phase` and mirror the linked detail-file `owner_agent` in `Agent`
- After the routing table, use the sections fixed by `plan-template-sequential.md` in the same order:
  - `## 요청과 범위`
  - `## 변경 형상`
  - `## 잠긴 계약`
  - `## 실행 흐름`
  - `## 리스크와 검증`
  - `## 검토 체크리스트`
- Keep `plan.md` reviewable without opening phase detail files first, but do not repeat phase-local execution details there
- Keep `plan.md` lean enough that an agent or review pass can validate the plan without scanning phase-local file maps, scenario grids, or validation tables
- The top-level plan must let a human reviewer answer:
  - what the user asked for, what is included, what is excluded, and what final completion means
  - what shape the change takes across components, routes, services, data flow, or UI states
  - which public contracts are locked before implementation starts
  - why the phase order exists and what each phase hands off
  - which risks or edge cases drive verification
- Keep only overview-level information in `plan.md`:
  - user request, included/excluded scope, and completion criteria
  - change shape and before/after structure
  - cross-phase or public-boundary contracts
  - one-row-per-phase flow summary
  - cross-phase risks and verification anchors
- Push phase-local implementation detail into the linked phase detail files:
  - phase field tables such as `목적`, `변경 내용`, `이전 상태`, `이후 상태`, `관련 영역`
  - per-phase file maps or `파일 | 작업 방식 | 완료 조건` tables
  - scenario-level contracts, validation matrices, and detailed risk tables
  - long API grammar inventories that only one phase owns
- Use `## 요청과 범위` to preserve the user's wording and combine inclusion, exclusion, and completion criteria in one place
- Use `## 변경 형상` for the Ultraplan-style shape of the change: structure, flow, dependencies, and before/after deltas; add a diagram only when it clarifies the plan
- Use `## 잠긴 계약` for affected public boundaries, `input`, `output`, ownership, callback/handoff, invalid/no-op, and visual parity contracts when relevant, but keep phase-local implementation grammar in the linked detail file unless it is needed for cross-phase approval
- Use `## 실행 흐름` as the only phase summary section; do not add separate phase cards that restate the same rows
- In `## 실행 흐름`, keep each phase to one summary row; do not append phase-local expansion blocks, repeated file tables, or repeated validation tables under `plan.md`
- Use `## 리스크와 검증` to connect likely failure modes to the phase, test, compare, command, or source inspection that will catch them
- End `plan.md` with `## 검토 체크리스트`
- When Context7 changed or confirmed a planning decision, record only the outcome in the top-level request / contract tables or the relevant phase detail file:
  - do not restate the whole lookup when upstream decisions already resolved it; carry forward the confirmed outcome and only note the delta if `architect` had to re-check it
  - use the top-level request / contract tables for cross-phase choices such as library selection, version policy, or migration direction
  - use the relevant phase detail file for phase-local API constraints, deprecations, or integration rules
- When a locked UI direction handoff exists, record only the locked outcome in the top-level request / contract tables or the relevant phase detail file:
  - do not restate the whole consultation history or variant loop
  - use the top-level request / contract tables for cross-phase UI direction, design-system, or hierarchy constraints
  - use the relevant phase detail file for phase-local state presentation, responsive behavior, or component interaction rules
- Treat the compact top routing table as navigation metadata only; keep routing rationale, scenario I/O contracts, detailed validation commands, test taxonomy, and orchestration metadata out of `plan.md` unless the user explicitly asks for them
- Keep high-level boundary changes and human-readable completion criteria in `plan.md`; keep file-level change maps and detailed scenario contracts in the linked phase detail files
- Do not add top-level sections such as `전체 작업 지도`, `핵심 파일별 작업 지도`, or `단계별 실행` when they merely restate the phase detail files
- Avoid unexplained jargon in `plan.md`
- Do not mix English planner shorthand into `plan.md` or phase detail prose when a natural Korean term exists
- Make boundary, contract, and phase names concrete
- Use the phase detail files for execution order, changed boundaries, scenario-level `input -> output` contracts, file impact, `검증`, and `failure/validation`
- Treat concrete paths in phase detail `## 파일 영향` as committed implementation topology, not examples; omit them or block until decided when the source structure is still tentative
- Start every phase detail file with the phase title and `- owner_agent: \`{agent-name}\`` so runner routing remains explicit
- Then use the phase detail sections fixed by `phase-template-detail.md` in the same order:
  - `## 목표와 완료 신호`
  - `## 작업 흐름`
  - `## 변경 경계`
  - `## 시나리오 / 계약`
  - `## 파일 영향`
  - `## 검증`
  - `## 리스크 / 주의점`
- Do not force arbitrary labeled subsections; add only the rows needed for the actual phase
- In `## 시나리오 / 계약`, expose `scenario`, `input`, `output`, `negative/no-op`, and `owner` for every behavior-changing boundary
- Keep `output`, `제약`, `failure/validation`, and `검증` wording visible in phase detail files when they matter so later `plan-materialize` can derive tests without guessing
- Keep `plan.md` and each linked phase detail file in parity
- Do not restate a conclusion already fixed in a top-level contract table unless a later skill would otherwise have to guess the contract
- When a later phase only finalizes exports, migration, or consumer validation, record the delta from earlier phases instead of restating the full contract
- When fallback or default-selection policy matters, prefer short rule lists or state-to-outcome mappings in the detail file
- Keep `선행 조건` in phase detail files short and human-readable
- In file impact tables, use `파일 | 작업 방식 | 완료 조건`
- Keep phase detail files scan-friendly; use short prose only where it explains the change shape better than another table
- Use one canonical `task-slug` per executable plan
- For each behavior-changing phase, make the linked phase detail file precise enough that `plan-materialize` can derive a stable scenario contract without guessing
- Do not leave multiple plausible canonical outputs unresolved inside one phase
- If a controller cannot answer "what was requested, what is in/out, what shape changes, which contracts are locked, what each phase fixes, and how risk is verified" from `plan.md`, the plan fails the quality bar

### Step 7. Choose plan count before writing (required)

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
  - give every plan its own `Branch` header, top-level phase summaries, and linked phase detail files
  - if one local plan depends on another, record the same prerequisite contract in the downstream phase detail `선행 조건` and in exactly one upstream phase detail `output` plus `검증`
- Do not force multiple plans only because many files change or one phase would be long
- Do not generate overview, index, DAG, or root graph files

### Step 8. Prepare automatic test materialization (conditional)

If a plan file includes implementation scope beyond documentation-only or structural-only work:

1. Read `../plan-materialize/SKILL.md`
2. Make the phase detail contracts explicit enough that `plan-materialize` can derive tests later without guessing
3. Let execution handoff treat a later `plan-materialize` sub-agent pass as an automatic prerequisite for implementation plans
4. When the plan includes behavior, state, routing, or contract-selection changes, make the phase detail contract explicit enough for later materialization

`architect` does not generate tests directly.
`plan-materialize` later decides `unit`, `runtime`, selected `e2e`, `skip`, or `block` from the plan summary, the phase detail files, and local project conventions.
`architect` does not enumerate owner-test inventories or choose concrete test files.

### Step 9. Plan journey and full-flow E2E ownership in `plan-materialize` (conditional)

If a plan file changes cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or any release-critical flow that needs regression hardening:

- Do not add a dedicated `playwright-guard` phase just for that coverage
- Make the changed journey contract explicit enough that `plan-materialize` can materialize the selected full-flow E2E directly
- Define trigger, scope, state checkpoints, and expected outputs in the relevant phase detail file using the active review wiki core docs

### Step 10. Plan reference-based visual comparison phase (conditional)

If a plan implements UI against a reference and acceptance depends on comparing against that reference:

- Apply the active review wiki execution-routing and test/review handoff core docs to decide whether a comparison phase is required.
- Use `./references/visual-parity-contract.md` for local comparison-mode, metric, and surface-role schema when a comparison phase is required.
- Put comparison evidence, pass/fail decision, and any later fix handoff in the phase detail file.

### Step 11. Quality gates (required)

- Run the quality-gate checklist in `{review_wiki_root}/core/quality-gates.md` before finalizing
- Treat missing review wiki routing or skipped applicable wiki guidance as a failed quality gate

### Step 12. Self-review gate (required)

- Re-run the same checklist in `{review_wiki_root}/core/quality-gates.md`
- Incorporate critical findings before handoff
- When multiple local plans exist and selected review wiki guidance requires prerequisite parity, verify it before handoff:
  - each downstream detail-file `선행조건` maps to a specific upstream phase
  - the upstream detail-file `output` and `검증` restate the same contract without reinterpretation
  - the upstream detail-file `boundary` can actually establish that contract
- Treat this self-review as internal review only
- If the user asks for an independent critical review, finish the plan artifact and hand it off to an independent `plan-review` pass

### Step 13. Compatibility policy (required)

- Plan Artifact Interface v11 applies to newly created plans
- Existing plans are not automatically migrated
- If a legacy plan format is detected during update:
  - keep user-requested scope
  - add a warning note near the top of the plan
  - avoid broad migration unless explicitly requested

### Step 14. Execution handoff

Architect does not execute implementation or source-tree test generation directly.
If the user asks for an independent cold review before execution, route the finished executable plan to an independent `plan-review` pass after writing it. The workflow source of truth remains the `plan-review` skill.
Provide a concise execution handoff summary using the handoff requirements in `{review_wiki_root}/core/execution-handoff.md`.
