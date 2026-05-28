# Plan Review Workflow

## Workflow

### Step 0. Resolve mode and plan wiki

- Determine execution mode before judging the plan.
- In orchestrated mode:
  - require `task_slug`, `plan_path`, and `plan_wiki_root`.
  - use the provided `plan_path` and `plan_wiki_root` exactly.
  - preserve a provided current `plan_signature`.
  - do not run plan wiki staging or setup.
- In direct mode:
  - read `../plan-wiki-setup/references/staging-contract.md`.
  - read `../plan-wiki-setup/references/platform-commands.md`.
  - resolve `plan_wiki_root` to `./.codex/plan-wiki/source/wiki`.
  - stop if the workspace sync path is missing.
- Read `{plan_wiki_root}/registry.json`.
- Read every core document listed in `stage_core.review`; if absent, read the registry `core` array.
- Select candidate patterns using registry `selection.review`, `domain_taxonomy`, and `adjacency_rules`; always include `common`, then add touched domains only.
- Read only selected pattern files whose `적용 조건` actually match the reviewed plan file.
- Read the active plan wiki `core/common/용어-정책.md` before drafting findings.

### Step 1. Load the plan and TDD report

- Review one executable plan file at a time.
- Load the target plan file from disk and parse only its YAML frontmatter enough to confirm `plan_slug`, `branch`, and `owner_agent` are present.
- When implementation scope applies, load adjacent `tdd.md` or the orchestrator-provided `tdd_path` before judging readiness.
- Confirm `tdd.md` frontmatter `plan_path` and `plan_signature` match the reviewed plan when those keys are present.
- Treat missing, stale, or contradictory `tdd.md` as a review blocker for implementation-scope plans because browser review must see plan row to test/manual/blocker mapping.
- Do not load linked phase detail files as part of the current contract. Legacy phase detail paths are evidence only when the task explicitly targets legacy migration or review.
- Derive user-request items from the latest user request, upstream request-lock handoff, and the reviewed plan.
- Treat the plan file, active plan wiki guidance, and user request as the source of truth.
- If the plan names a local prerequisite plan, inspect only that direct prerequisite and the minimum needed to verify parity. Do not require prerequisite files to complete the reviewed plan's execution meaning.
- When Figma-derived artifacts are in scope, require manifest-backed provenance as specified by the active plan wiki authority guidance and the reviewed plan.

### Step 2. Challenge the plan shape

Before the main review, check whether the plan shape itself is justified:

- existing code, flow, or policy that already solves part of the request.
- simpler repo-local patterns or framework built-ins.
- over-split or under-split plan-file topology.
- new abstractions, services, or boundaries that are not justified by the request or repo fit.
- execution-agent selection that does not match the upstream locked execution areas.

Treat scope-challenge findings as normal review evidence.

### Step 3. Run the main review

Judge the plan against:

- active plan wiki core docs and selected patterns.
- active plan wiki plan artifact contract.
- current `tdd.md` plan row/scenario to test mapping, manual smoke gates, TDD blockers, expected red reasons, actual red results when validation was attempted, and completion gates.
- required YAML frontmatter and valid `owner_agent` routing.
- plan self-containment for one execution agent.
- implementation-scope phase readiness: a `## 실행 흐름` section with reviewable Phase entries, completion signals, validation, and commit boundaries when the work is not a trivial single-step change.
- user-request traceability.
- blocking ambiguity.
- plan-count justification when multiple plan files exist.
- scenario-level `input -> output` contract completeness.
- affected public boundaries, exclusions, no-op rules, recipients, and final interpretation boundaries.
- source/test/fixture/artifact topology: implementation-scope plans should show concrete paths, status, owning phase, responsibility, and repo-local evidence for placement instead of invented or duplicate paths.
- planning-only evidence artifacts: UI/API/backend/utility/function evidence referenced by the plan should live under `evidence/**`, map to the stated phase and input/output/state/function/recipient contract, and avoid production-code or live-server implications. For UI scope, check that HTML/CSS preview evidence is present and connected when the plan relies on browser developer review judgment; do not approve or reject the preview on behalf of the reviewer. Also check whether shell, screen, component, and state/variant evidence are separated when they are separate implementation judgment units, whether finite component/repeated-UI target counts have matching preview coverage or explicit exclusions, and whether token/schema/registry/variant transformations have `function-contract` input-output harnesses instead of only visual preview.
- first-time test runner, command, spec root, source/test topology, mock/API fixture policy, storage/auth state policy, and expected red reason when implementation-first setup does not already exist.
- verification realism and readiness.
- plan/TDD traceability: every selected plan row or scenario that changes behavior, runtime lifecycle, policy, UI failure state, no-op rule, recipient, or final interpretation has a source-tree test, a narrow execution command, an explicit TDD blocker, or a manual smoke gate when automation is not realistic.
- TDD subset loss: rows that remain only in plan prose but are absent from `tdd.md` mapping or manual smoke must be treated as findings rather than silently accepted.
- UI direction completeness when UI scope exists.
- reference-based visual comparison, Figma parity, or Figma inventory provenance when in scope.

Apply the plan wiki as the policy source for plan artifact meaning, test strategy expectations, quality gates, and learned pattern rules. Use `references/review-policy.md` only to map issues to severity and artifact shape.

### Step 4. Classify findings

- Use `references/review-policy.md`.
- Record only issues that materially affect execution readiness, contract clarity, reviewability, or later test derivation.
- Prefer no finding over low-value polish notes.
- If no findings remain, say that explicitly.

### Step 5. Decide outcome

- `blocked`: one or more blocker findings exist.
- `ready-with-findings`: no blocker exists, but major or minor findings remain.
- `ready`: no findings remain.

Do not rewrite the plan.

### Step 6. Write the review artifact

Write `./plans/_orchestrator/review/{task-slug}/review.md`.

Required frontmatter keys:

- `plan_path`
- `task_slug`
- `plan_signature`
- `outcome`
- `next_action`
- `finding_signature`
- `requires_user_decision`
- `issue_codes`
- `affected_plan_paths`

Rules:

- preserve an orchestrator-provided current `plan_signature`.
- compute signatures from the current plan and finding set when not provided.
- set `requires_user_decision: true` only when a fresh user decision is required.
- set `next_action: plan_revision` for `blocked`; otherwise `planning_complete`.
- `planning_complete` here means cold-review complete for the current plan/TDD pair. The orchestrator must still require browser developer review approval for implementation-scope plans before final orchestration completion.

### Step 7. Respond in chat

- Present findings first, ordered by severity.
- Reference the reviewed plan file and the written `review.md`.
- State clearly whether the plan requires revision or is planning-complete from the cold-review perspective.
