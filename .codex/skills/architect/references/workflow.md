# Architect Workflow

## Workflow

### Step 0. Resolve mode and review wiki

Before writing any plan artifact:

- Determine execution mode:
  - `orchestrated`: an orchestrator handoff provides `task_slug`, `plan_path`, and `review_wiki_root`.
  - `direct`: no orchestrator handoff exists.
- In orchestrated mode:
  - treat provided `task_slug`, `plan_path`, and `review_wiki_root` as authoritative.
  - treat `authoritative_existing_inputs` as the only task-local upstream authority.
  - treat `known_missing_inputs` only as explicit missing-path warnings.
  - if reused for the same `task_slug`, prefer current disk artifacts and latest review over stale chat memory.
  - do not run review wiki staging, bootstrap, legacy planning-profile checks, runtime CLI discovery, or substitute-path searches.
  - block if required handoff fields are missing or contradictory.
- In direct mode:
  - read `../review-wiki-setup/references/staging-contract.md`.
  - read `../review-wiki-setup/references/platform-commands.md`.
  - resolve `review_wiki_root` to `./.codex/review-wiki/sync/current`.
  - if missing, repair with `review-wiki-setup` when available or stop with the missing dependency.
- Read `{review_wiki_root}/registry.json`.
- Read every core document listed in `stage_core.architect`; if absent, read the registry `core` array.
- Select candidate patterns using registry `selection.architect` and `adjacency_rules`; always include `common`, then add touched domains only.
- Read only selected pattern files whose `적용 조건` match the request, repo-local context, or authoritative upstream inputs.
- Read the active review wiki `core/common/용어-정책.md` before drafting visible prose.

### Step 1. Analyze the request and upstream decisions

- Consume locked request-scope, test-strategy, UI-direction, diagnostic, or Figma-inventory handoffs before deriving new decisions.
- Preserve the user's wording in request rows; do not replace it with planner shorthand.
- Decompose the request into concrete items, touched work bundles, public boundaries, and exclusions before naming phases.
- Classify missing information as `blocking`, `derivable`, or `deferrable` using the active review wiki decision policy.
- Derive what local context can answer before asking the user.
- For behavior-changing work, identify scenario-level `input -> output` contracts before implementation layers.
- Apply selected review wiki patterns before deciding that a boundary, canonical identifier, prerequisite, or verification strategy is obvious.

### Step 2. Verify external or tool-derived authority when needed

Use this step only when a planning boundary depends on facts not already locked by upstream inputs.

- For version-sensitive library/framework/API facts, prefer Context7 and record only planning-relevant outcomes.
- If reliable research tooling is unavailable or incomplete, state the risk and ask only when it changes the plan boundary.
- For Figma hierarchy, component-set inventory, Resource/* coverage, platform markers, or classification:
  - use only controller-verified `figma-inventory` manifest and snapshot files passed as authoritative input.
  - do not treat Code Connect, design context, package registries, old parity reports, memory, or raw tool output as complete inventory.
  - if required inventory is missing, stale, or incomplete, return a `tool_data_blocker` instead of inventing classification.
  - when writing plan-local Figma-derived artifacts, include manifest-backed provenance required by the active review wiki authority guidance.

### Step 3. Resolve blocking decisions before planning

- Do not write `./plans/**` while `blocking` ambiguity remains.
- In orchestrated mode, return a structured blocking packet instead of helper files.
- Resolve enough detail for every touched public boundary that implementation or later test materialization would otherwise guess:
  - inputs, outputs, props, callbacks, handoff meaning, state ownership, invalid/no-op rules, exclusions, recipients, and final interpretation boundaries.
  - verification unit, observable result, stable identifier policy, and selected E2E reason when the choice affects the completion gate.
  - committed source topology when new paths or test-owner placement shape implementation.
- Do not force concrete test files, helper names, exhaustive locator lists, or runner mechanics into the plan when local conventions can derive them later.
- Carry `deferrable` items only as short defaults or constraints when they matter to execution.

### Step 4. Gather high-level implementation context

Inspect only enough repo-local context to make the plan executable:

- related features, source topology, ownership, and integration points.
- relevant existing tests, commands, config, scripts, or CI contracts.
- current UI direction, design-system conventions, accessibility constraints, or visual acceptance inputs when in scope.
- selected review wiki patterns that affect topology, contracts, state, validation, rollout, rollback, or verification quality.

Do not deep-dive into implementation details or write source-tree tests.

### Step 5. Draft plan artifacts

- Create executable plan artifacts under `./plans/`.
- Use `./references/plan-template-sequential.md` as the `plan.md` skeleton.
- Use `./references/phase-template-detail.md` as the phase detail skeleton.
- Apply the active review wiki plan artifact contract for:
  - required sections.
  - `plan.md` vs phase detail split.
  - overview/detail parity.
  - authority input artifacts.
  - related-plan lineage.
  - reviewable completion criteria.
- Keep `plan.md` overview-level and phase detail files execution-level.
- Do not add extra top-level sections unless a core doc or the user explicitly requires them.
- Treat concrete paths in phase detail `파일 영향` as committed topology; omit or block when still tentative.
- Keep each phase detail precise enough that an owner agent and verification materialization can act without guessing.

### Step 6. Choose plan count

- Default to one sequential executable plan at `./plans/{task-slug}/plan.md`.
- Emit multiple standalone plans only when the active review wiki contract supports independently mergeable, independently reviewable, rollback-safe boundaries.
- When multiple plans are required:
  - place each plan in its own folder.
  - keep every plan sequential and template-based.
  - record local prerequisites in both downstream `선행 조건` and the specific upstream phase `output` plus `검증`.
- Do not create extra navigation or graph artifacts outside the active review wiki plan artifact contract.

### Step 7. Prepare verification contracts

If the plan includes implementation scope beyond documentation-only or structural-only work:

- Make behavior, state, routing, UI interaction, and contract-selection phases explicit enough for source-tree test or command materialization to produce `unit`, `Component Test`, selected `E2E`, `skip`, or `block` outcomes.
- Lock the verification unit, observable result, stable identifier policy, and selected E2E journey reason when leaving them open would let the same plan produce different materialized tests.
- Do not generate source-tree tests in this skill.
- Do not add a dedicated E2E phase just for selected browser journey coverage; put the journey contract in the relevant phase detail file.

### Step 8. Plan comparison or audit phases when acceptance requires them

- If external screenshots, images, or live pages are acceptance references, apply active review wiki visual-comparison guidance and `./references/visual-parity-contract.md`.
- If Figma URL parity is acceptance, route comparison to the appropriate Figma parity audit phase under the active review wiki contract.
- Keep comparison or audit evidence and pass/fail handoff in phase detail files.

### Step 9. Run quality gates

- Run the active review wiki quality gate checklist before finalizing.
- Re-check selected patterns, plan/phase parity, request traceability, public contracts, verification ownership, related-plan lineage, authority artifacts, and execution handoff requirements.
- Fix critical self-review findings before handoff.
- If a required wiki registry, core doc, or pattern cannot be read, treat that as a failed quality gate.

### Step 10. Compatibility and handoff

- Plan Artifact Interface v11 applies to newly created plans.
- Existing plans are not automatically migrated; update legacy plans narrowly unless the user requests migration.
- This skill does not execute implementation or source-tree test generation.
- Provide the concise execution handoff required by the active review wiki execution-handoff core doc.
