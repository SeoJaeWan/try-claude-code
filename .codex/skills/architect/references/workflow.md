# Architect Workflow

## Workflow

### Step 0. Resolve mode and plan wiki

Before writing any plan artifact:

- Determine execution mode:
  - `orchestrated`: an orchestrator handoff provides `task_slug` and `plan_wiki_root`.
  - `direct`: no orchestrator handoff exists.
- In orchestrated mode:
  - treat provided `task_slug`, optional `plan_path`, and `plan_wiki_root` as authoritative.
  - treat `authoritative_existing_inputs` as the only task-local upstream authority.
  - treat `known_missing_inputs` only as explicit missing-path warnings.
  - if reused for the same `task_slug`, prefer current disk artifacts and latest review over stale chat memory.
  - do not run plan wiki staging, bootstrap, legacy planning-profile checks, runtime CLI discovery, or substitute-path searches.
  - block if required handoff fields are missing or contradictory.
- In direct mode:
  - read `../plan-wiki-setup/references/staging-contract.md`.
  - read `../plan-wiki-setup/references/platform-commands.md`.
  - resolve `plan_wiki_root` to `./.codex/plan-wiki/sync/current`.
  - if missing, repair with `plan-wiki-setup` when available or stop with the missing dependency.
- Read `{plan_wiki_root}/registry.json`.
- Read every core document listed in `stage_core.architect`; if absent, read the registry `core` array.
- Select candidate patterns using registry `selection.architect` and `adjacency_rules`; always include `common`, then add touched domains only.
- Read only selected pattern files whose `적용 조건` match the request, repo-local context, or authoritative upstream inputs.
- Read the active plan wiki `core/common/용어-정책.md` before drafting visible prose.

### Step 1. Analyze the request and upstream decisions

- Consume locked request-scope, execution-area, test-strategy, UI-direction, diagnostic, or Figma-inventory handoffs before deriving new decisions.
- Preserve the user's wording in request rows; do not replace it with planner shorthand.
- Decompose the request into concrete items, touched work bundles, public boundaries, exclusions, and required plan files before drafting.
- Classify missing information as `blocking`, `derivable`, or `deferrable` using the active plan wiki decision policy.
- Derive what local context can answer before asking the user.
- For behavior-changing work, identify scenario-level `input -> output` contracts before implementation layers.
- Apply selected plan wiki patterns before deciding that a boundary, canonical identifier, prerequisite, or verification strategy is obvious.
- Block instead of planning when the upstream request has not locked whether frontend, backend, infra, visual audit, docs-only, or other execution areas are included or excluded.

### Step 2. Verify external or tool-derived authority when needed

Use this step only when a planning boundary depends on facts not already locked by upstream inputs.

- For version-sensitive library/framework/API facts, prefer Context7 and record only planning-relevant outcomes.
- If reliable research tooling is unavailable or incomplete, state the risk and ask only when it changes the plan boundary.
- For Figma hierarchy, component-set inventory, Resource/* coverage, platform markers, or classification:
  - use only controller-verified `figma-inventory` manifest and snapshot files passed as authoritative input.
  - do not treat Code Connect, design context, package registries, old parity reports, memory, or raw tool output as complete inventory.
  - if required inventory is missing, stale, or incomplete, return a `tool_data_blocker` instead of inventing classification.
  - do not turn missing planning authority data into an implementation step; stop with the blocker shape required by `contracts.md`.
  - when writing plan-local Figma-derived artifacts, include manifest-backed provenance required by the active plan wiki authority guidance.

### Step 3. Resolve blocking decisions before planning

- Do not write `./plans/**` while `blocking` ambiguity remains.
- In orchestrated mode, return a structured blocking packet instead of helper files.
- Resolve enough detail for every touched public boundary that implementation or later test authoring would otherwise guess:
  - inputs, outputs, props, callbacks, handoff meaning, state ownership, invalid/no-op rules, exclusions, recipients, and final interpretation boundaries.
  - verification unit, observable result, stable identifier policy, and selected E2E reason when the choice affects the completion gate.
  - committed source topology and test-owner placement when new paths, route files, modules, or spec locations shape implementation.
  - first-time test runner, command, spec root, config ownership, browser/mobile bootstrap command, mock/API fixture policy, and storage/auth state policy when the current repository does not already provide the needed test environment.
- Do not force concrete test files, helper names, exhaustive locator lists, or runner mechanics into the plan when local conventions can derive them later.
- Carry `deferrable` items only as short defaults or constraints when they matter to execution.

### Step 4. Gather high-level implementation context

Inspect only enough repo-local context to make each plan file executable:

- related features, source topology, ownership, and integration points.
- relevant existing tests, commands, config, scripts, or CI contracts.
- current UI direction, design-system conventions, accessibility constraints, or visual acceptance inputs when in scope.
- selected plan wiki patterns that affect topology, contracts, state, validation, rollout, rollback, or verification quality.
- existing route/page/component/API/service/utility/test/fixture layout that could already satisfy or conflict with the requested change.
- naming, package boundary, and placement convention needed to avoid duplicate files or invented topology.

Do not deep-dive into implementation details or write source-tree tests.

### Step 5. Draft plan artifacts

- Create executable plan files under `./plans/`.
- Use `./references/plan-template-sequential.md` as a writing aid, then conform to the active plan wiki plan artifact contract.
- Write only the plan files required by the upstream locked execution areas.
- Make each plan file self-contained for exactly one `owner_agent`.
- For implementation-scope plans, write a `## 실행 흐름` section with reviewable 단계 행 inside the same plan file. Each row must include purpose, major changes, completion signal, validation, and commit boundary.
- For implementation-scope plans, write a `## 파일/폴더 구조 계약` section that locks the source/test/fixture/artifact topology derived from actual repo inspection. Include create/modify/keep/forbidden/remove paths, owning phase, responsibility, and the local evidence for each placement.
- Apply the active plan wiki artifact contract to decide when `## 체험 산출물` is required. When required, create planning-only HTML/JS evidence under `plans/{task_slug}/evidence/**`.
- Keep evidence implementation lightweight and reviewable: UI evidence shows expected screen shape and important states, while API/backend/utility evidence exposes sample body/query/params/auth/context inputs with representative output/status/effects. Do not require real API calls, DB access, filesystem writes, live dev servers, React builds, or production stack execution.
- Keep step content self-contained in the plan body. Do not create linked phase detail files for new plans unless explicitly performing legacy migration or review.
- Step boundaries are human review and commit boundaries, not separate `owner_agent` or branch boundaries unless the plan count has already been split by execution ownership.
- Include the required YAML frontmatter in every plan file.
- Put all contracts needed by the executing agent into that plan file's body; do not rely on `shared-contract.md`, linked phase detail files, or external planning notes for execution meaning.
- Record provenance paths only as evidence, not as required reading for the executing agent.
- Treat concrete future source paths, route paths, test paths, and spec roots as committed topology only when the plan intentionally uses them as the execution contract.
- After drafting plan files, run the active `용어-정책.md` writing pass on all human-readable prose. Translate avoidable English shorthand outside code spans, and keep English only when it has a literal identifier reason.

### Step 6. Choose plan count

- Default to the smallest number of executable plan files that matches the locked execution areas.
- Emit multiple standalone plan files only when the active plan wiki contract supports independently reviewable ownership boundaries.
- Do not create a plan file for an execution area that `brainstorm` excluded.
- Do not create a test-only plan unless the active `owner_agent` catalog contains a real test execution agent and the upstream lock selected it.
- If two planned files need the same owner to edit the same public boundary at the same time, merge or re-lock the boundary before writing.
- Do not split one `owner_agent` into multiple plan files just to represent phases; keep phases inside the self-contained plan unless ownership or independent review truly requires separate plan files.

### Step 7. Prepare verification contracts

If the plan includes implementation scope beyond documentation-only or structural-only work:

- Make behavior, state, routing, UI interaction, and contract-selection scenarios explicit enough for source-tree test or command verification to produce `unit`, `Component Test`, selected `E2E`, `skip`, or `block` outcomes.
- Lock the verification unit, observable result, stable identifier policy, and selected E2E journey reason when leaving them open would let the same plan produce different tests.
- If the target test environment does not exist yet, lock the planned runner, command, config owner, spec root or test file placement, source/test topology, and expected red reason so later test authoring can produce completion-blocking red contract tests instead of treating setup absence as the decision point.
- If mock API, fixture server, `storageState`, or seeded browser state is required before real integration exists, lock what the mock proves, what it does not prove, and the later integration gate that must turn the red contract green.
- Do not generate source-tree tests in this skill.

### Step 8. Plan comparison or audit work when acceptance requires it

- If external screenshots, images, or live pages are acceptance references, apply active plan wiki visual-comparison guidance and `./references/visual-parity-contract.md`.
- If Figma URL parity is acceptance, route comparison to the appropriate Figma parity audit owner under the active plan wiki contract.
- Keep comparison or audit evidence and pass/fail handoff inside the relevant self-contained plan file.

### Step 9. Run quality gates

- Run the active plan wiki quality gate checklist before finalizing.
- Re-check selected patterns, terminology policy compliance, plan self-containment, request traceability, public contracts, verification ownership, related-plan lineage, authority artifacts, and execution handoff requirements.
- Re-check that implementation-scope plans expose reviewable 단계 행 and commit boundaries that developer review can present without inventing step meaning.
- Re-check that implementation-scope topology was derived from actual repo structure, not invented paths, and that topology rows do not duplicate existing UI/API/utility surfaces.
- Re-check that every evidence row points under `evidence/**`, matches the plan's phase/input/output/state contract, and is clearly planning-only.
- Re-check that no missing authority input was moved into an implementation step and that avoidable English planner shorthand outside code spans was cleaned up under the active terminology policy.
- Fix critical self-review findings before handoff.
- If a required wiki registry, core doc, or pattern cannot be read, treat that as a failed quality gate.

### Step 10. Compatibility and handoff

- New plans follow the current active plan wiki plan artifact contract.
- Existing legacy plans are not automatically migrated; update legacy plans narrowly unless the user requests migration.
- This skill does not execute implementation or source-tree test generation.
- Provide the concise execution handoff required by the active plan wiki execution-handoff core doc.
