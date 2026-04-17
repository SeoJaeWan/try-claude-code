---
name: architect
description: Codex entry skill for boundary-centered implementation planning. Use when a request needs one or more executable plan artifacts under `./plans` after resolving blocking product policy, UX, contract, schema, validation, state, or permission ambiguity, with a controller-facing `plan.md` written in plain Korean that includes a work-at-a-glance summary, an agreement table, a phase flow summary, phase-by-phase execution checkpoints, and linked per-phase technical detail files for later `plan-review` and `plan-materialize`, plus registry-backed review wiki core/pattern guidance.
---

<Skill_Guide>
<Purpose>
Create decision-complete implementation plans as one or more sequential executable plans, with explicit execution phases, scenario-first boundary I/O contracts, and controller-first plan artifacts that expose the whole flow and each phase's actual work before technical orchestration detail.
</Purpose>

<Instructions>
# architect

Use this as the preferred planning entrypoint for complex or high-impact requests, or after `brainstorm` confirms key decisions.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context
2. Optional orchestration state file when invoked by `orchestrator`:
   - `./.codex/artifacts/plan/{task-slug}/state.json`
3. `./references/agents-lite.md` - execution agent catalog
4. `../review-wiki-setup/references/staging-contract.md` - review wiki cache resolution and staging rules
5. `../review-wiki-setup/references/platform-commands.md` - platform-specific link and staging commands
6. Resolved planning `review_wiki_root` containing `registry.json`, `core/`, `patterns/`, and selection policy. Prefer `./.codex/cache/review-wiki/current`; fall back to `~/.codex/reviewWiki/wiki` only when the cache is unavailable.
7. Every core document listed in the registry `core` array, in listed order
8. Candidate pattern files selected from the registry `patterns` list using the `architect` selection mode plus matching `Apply When`
9. `./references/git.md` - commit message, branch naming, and worktree naming rules
10. `./references/plan-template-sequential.md` - sequential plan template
11. `./references/phase-template-detail.md` - per-phase technical detail template
12. Relevant execution contracts only when routing or mode-sensitive conventions matter:
   - inspect only the minimum repo-local tool/validation/runtime contract that governs the work
   - examples: `package.json` scripts, framework config, test config, CI config schema, deploy script entrypoints, or existing source-tree placement conventions
13. Context7 MCP tools only as fallback when external library or API facts can still change the planning boundary after local inspection and any prior `brainstorm` handoff:
   - use Context7 only for version-sensitive library/framework/API behavior, migration constraints, deprecation status, or current recommended patterns
   - do not use Context7 for repo-local conventions, stable language basics, or facts already derivable from local context

## Workflow

### Step 0. Read routing references (required)

Before writing any plan artifact:

- Determine execution mode first:
  - if an explicit orchestration `state.json` path is provided and `state.json.preflight.mode = "orchestrated"` with `state.json.preflight.complete = true`, enter orchestrated mode
  - otherwise enter direct mode
- Read `./references/agents-lite.md`
- In orchestrated mode:
  - read the provided `state.json`
  - require `state.json.preflight.review_wiki_root` to be present
  - treat `state.json.preflight.review_wiki_root` as authoritative
  - if this architect instance is being reused for the same `task-slug`, treat the current `state.json`, current plan artifacts, and latest review artifact as higher priority than stale chat memory
  - do not run review wiki staging
  - do not verify named-agent availability
  - do not inspect runtime or CLI invocation paths
  - if `state.json.preflight` is missing, incomplete, or contradictory, block instead of guessing
- In direct mode:
  - read `../review-wiki-setup/references/staging-contract.md`
  - read `../review-wiki-setup/references/platform-commands.md`
  - resolve `review_wiki_root` in this order:
    1. `./.codex/cache/review-wiki/current`
    2. `~/.codex/reviewWiki/wiki`
  - if the cache is missing and the external wiki root is readable, run the platform-appropriate staging command from `platform-commands.md` from the workspace root, then use the refreshed cache
  - if the external wiki root is missing or broken and the cache is absent:
    - report the missing dependency explicitly
    - use `review-wiki-setup` when available to repair it before continuing
  - if the external wiki root is permission-blocked but the cache exists, continue with the cache and note the fallback in the final handoff
- Read `{review_wiki_root}/registry.json`
- Read every path listed in the registry `core` array, in order, resolving relative paths from `review_wiki_root`
- Derive initial tags from the user request and repo-local context
- Select candidate pattern files from the registry `patterns` list using the registry `selection.architect` mode and `adjacency_rules`
- Read only the selected pattern files whose `Apply When` clauses actually match the request or repo-local context
- Do not skip the registry because the request looks familiar; it is the mandatory routing contract

### Step 1. Analyze request

- Clarify goals, boundaries, constraints, acceptance criteria, and feature policy
- Classify missing information as `blocking`, `derivable`, or `deferrable` using the active review wiki core decision policy
- Apply relevant selected pattern guidance before deciding that a boundary, canonical identifier, prerequisite, or verification strategy is already obvious
- Derive what can be confirmed from local context before asking the user
- For behavior-changing work, identify the domain scenario first rather than jumping to implementation layers
- Treat the scenario's `input -> output` contract as the planning primitive

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
- If direct clarification is necessary, ask only concise, actionable questions:
  - batch at most 4 blocking questions at once
  - prefer structured user-input tooling when available
  - otherwise ask concise plain-text questions in chat
- In orchestrated mode, if `blocking` ambiguity remains before any executable plan can be written:
  - write `./.codex/artifacts/plan/{task-slug}/clarification.md`
  - emit a concrete decision packet instead of plain chat questions
  - stop before creating or updating `./plans/**`
- For user-visible scope, resolve behavior well enough to define stable boundaries and expected outcomes in the plan
- For notification, permission, routing, workflow, state-transition, or other behavior-changing scope, resolve enough detail to define:
  - trigger or precondition
  - canonical output that must happen
  - negative output that must not happen
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
- Keep the plan artifacts phase-first and terse
- Treat `plan.md` as a controller-first user-facing review artifact
- Keep the top preamble minimal: `Branch`, a one-line `Worktree dir`, then a compact routing table with `# | Phase | Agent`
- In that routing table, use the linked phase detail path in `Phase` and mirror the linked detail-file `owner_agent` in `Agent`
- Add `## 이번 작업 한눈에 보기` after the routing table
- In `이번 작업 한눈에 보기`, summarize the plan in short bullets:
  - `목표`
  - `이번 계획의 핵심 변경`
  - `완료되면 달라지는 점`
  - `제외 범위`
- Add `## 사전 합의` after `이번 작업 한눈에 보기`
- In `사전 합의`, record the pre-agreed policy, scope, or contract decisions from the conversation as a markdown table with:
  - `항목`
  - `합의 내용`
  - `적용 범위`
  - `메모`
- When Context7 changed or confirmed a planning decision, record only the outcome in `사전 합의` or the relevant phase detail file:
  - do not restate the whole lookup when `brainstorm` already resolved it; carry forward the confirmed outcome and only note the delta if `architect` had to re-check it
  - use `사전 합의` for cross-phase choices such as library selection, version policy, or migration direction
  - use the relevant phase detail file for phase-local API constraints, deprecations, or integration rules
- Add `## Phase 흐름 요약` after `사전 합의` so the controller can understand the full sequence without opening the phase detail files
- In `Phase 흐름 요약`, summarize every phase in order with concise answers to:
  - what role this phase plays
  - what work happens in this phase
  - what state is fixed when it finishes
  - what it hands off to the next phase
- Add `## 단계별 실행` after `Phase 흐름 요약`
- Treat the compact top routing table as navigation metadata only; keep routing rationale, scenario I/O contracts, detailed validation commands, test taxonomy, and orchestration metadata out of `plan.md` unless the user explicitly asks for them
- Keep high-level boundary changes and human-readable completion conditions in `plan.md`; keep file-level change maps in the linked phase detail files
- Write each `plan.md` heading as `### Phase n. {짧고 쉬운 역할 이름}`
- In `plan.md`, make each phase understandable through `목적`, one short sequencing-rationale line, `시작 조건`, `핵심 변경`, `완료 조건`, the explicit handoff or final output line, and `상세 문서`
- Use the sequencing-rationale line to explain why the phase belongs at that point in the sequence; for example `왜 먼저 하는가`, `왜 이 단계가 필요한가`, or `왜 마지막 단계인가`
- Write `핵심 변경` so a controller can tell which boundary changes in this phase without reading the detail file; use short review-friendly bullets or phrases, not abstract theme labels
- Write the handoff line so the next phase can start without reinterpreting the contract; use `다음 단계로 넘기는 것` for intermediate phases and `최종 산출물` for the last phase
- Write `완료 조건` so a controller can tell what visible or inspectable state closes the phase
- End `plan.md` with `## 체크포인트`
- In `체크포인트`, write one approval-style checkbox per phase so the controller can see which state must be fixed before the next handoff or final rollout
- Avoid unexplained jargon in `plan.md`
- Make the role label concrete
- Use the phase detail files for `owner_agent`, technical `input/output`, file-level preconditions, execution ordering, constraints, and `검증`
- Start every phase detail file with a controller digest in this order:
  - `## 컨트롤러 다이제스트`
  - `### 파일별 작업`
  - `### 완료 증거`
- Keep that digest readable without the later technical sections; detailed commands, contracts, and routing stay below it
- After the digest, add one `## 실행 계약` block for the technical detail section
- Keep `plan.md` and each linked phase detail file in parity
- Do not restate a conclusion already fixed in `컨트롤러 다이제스트` or `파일별 작업` unless a later skill would otherwise have to guess the canonical contract
- When a later phase only finalizes exports, migration, or consumer validation, record the delta from earlier phases instead of restating the full contract
- When fallback or default-selection policy matters, prefer short rule lists or state-to-outcome mappings in the detail file
- Keep `시작 조건` in `plan.md` short and human-readable
- Use a numbered `작업 순서` list in the detail file so the execution order is visible without rereading the whole file map
- In the detail-file `파일별 작업`, use `파일 | 작업 방식 | 사전 정의 | 완료 조건`
- In the detail file `boundary`, describe change boundaries rather than re-listing every writable file; the writable file map belongs in `파일별 작업`
- In the detail file `작업 순서`, lead with concrete file or boundary changes
- Keep `완료 증거` human-readable and outcome-focused; keep `검증` command-oriented and avoid duplicating the same sentence across both
- Use one canonical `task-slug` per executable plan
- For each behavior-changing phase, make the linked phase detail file precise enough that `plan-materialize` can derive a stable scenario contract without guessing
- Do not leave multiple plausible canonical outputs unresolved inside one phase
- If a controller cannot answer "why this phase exists now, what changes here, what state gets fixed, what is handed off, and when do we stop" from the phase summary plus the phase digest, the plan fails the quality bar

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
3. Let execution handoff treat the named custom agent `plan-materializer` as an automatic prerequisite for implementation plans
4. When the plan includes behavior, state, routing, or contract-selection changes, make the phase detail contract explicit enough for later materialization

`architect` does not generate tests directly.
`plan-materialize` later decides `unit`, selected `e2e`, `skip`, or `block` from the plan summary, the phase detail files, and local project conventions.

### Step 3.6. Plan journey and full-flow E2E ownership in `plan-materialize` (conditional)

If a plan file changes cross-route journeys, auth/session transitions, redirect chains, persisted browser state, or any release-critical flow that needs regression hardening:

- Do not add a dedicated `playwright-guard` phase just for that coverage
- Make the changed journey contract explicit enough that `plan-materialize` can materialize the selected full-flow E2E directly
- Define trigger, scope, state checkpoints, and expected outputs in the relevant phase detail file using the active review wiki core docs

### Step 3.7. Plan reference-based visual comparison phase (conditional)

If a plan implements UI against an external visual reference such as a live URL, image, screenshot set, or Figma file, and acceptance depends on comparing the implementation against that reference:

- Add a later phase with `owner_agent: visual-comparator`
- Make that phase capture or load the reference side and the current implementation side explicitly
- Require repo-local capture, diff, and report artifacts plus a pass/fail decision in the phase detail file
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
- If the user asks for an independent critical review, finish the plan artifact and hand it off to `plan-reviewer`

### Step 6. Compatibility policy (required)

- Plan Artifact Interface v10 applies to newly created plans
- Existing plans are not automatically migrated
- If a legacy plan format is detected during update:
  - keep user-requested scope
  - add a warning note near the top of the plan
  - avoid broad migration unless explicitly requested

### Step 7. Execution handoff

Architect does not execute implementation or source-tree test generation directly.
If the user asks for an independent cold review before execution, route the finished executable plan to the named custom agent `plan-reviewer` after writing it. The workflow source of truth remains the `plan-review` skill.
Provide a concise execution handoff summary using the handoff requirements in `{review_wiki_root}/core/execution-handoff.md`.

## Output contract

- Plan artifacts:
  - single executable plan summary: `./plans/{task-slug}/plan.md`
  - matching phase detail files: `./plans/{task-slug}/phases/{nn}-{phase-slug}.md`
  - multiple executable plan summaries when required: `./plans/{task-group}-{nn}-{slice-slug}/plan.md`
  - each multi-plan artifact also owns matching phase detail files under its own `phases/`
- Optional orchestration clarification packet when planning must stop before any executable plan is writable:
  - `./.codex/artifacts/plan/{task-slug}/clarification.md`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code
- Every executable plan file is sequential-only
- Do not write `plan.md` as if only implementers will read it
- Do not treat the review wiki as optional when its registry is available; always read the registry first and route from it
- Do not bypass the resolved `review_wiki_root` with hardcoded external-path reads when a workspace cache exists
- In orchestrated mode, do not redo review wiki bootstrap or named-agent preflight that the orchestrator already completed
- Do not generate or edit source-tree tests inside `architect`
- `visual-comparator` execution happens later; architect only plans that phase
- Do not produce a plan with unresolved blocking ambiguity
- In orchestrated mode, do not leave pre-plan blocking questions only in chat when a `clarification.md` packet is required
- Do not treat Context7 as mandatory for every plan; use it only when unstable external facts can change the boundary, contract, or phase split
- Do not re-query Context7 just because it is available when `brainstorm` already resolved the relevant library/framework/API decision well enough for planning
- Do not leave Context7-derived constraints only in transient reasoning; if they matter, compress them into `사전 합의` or the relevant phase detail file
- Do not generate multiple executable plan files unless the active core plan-count rule requires it
- Do not generate overview, index, DAG, or root graph files
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning
- Do not prescribe arbitrary `작업 순서` step counts
- Do not let the plan folder name, branch summary, and worktree directory diverge
- Do not leave a local prerequisite contract only in handoff prose
- Do not leave canonical outputs, negative outputs, or recipients implicit when later test materialization would have to guess
- Do not re-list the same file inventory in `boundary` after `파일별 작업` already fixed it
- Do not hide the real phase role behind unexplained jargon in `plan.md`
- Do not make the controller open every phase detail file just to understand the whole plan flow
- Do not bury the actual work of a phase under routing metadata or abstract labels
</Instructions>
</Skill_Guide>
