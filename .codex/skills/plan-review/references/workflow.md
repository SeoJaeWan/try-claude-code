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
  - resolve `plan_wiki_root` to `./.codex/plan-wiki/sync/current`.
  - stop if the workspace sync path is missing.
- Read `{plan_wiki_root}/registry.json`.
- Read every core document listed in `stage_core.review`; if absent, read the registry `core` array.
- Select candidate patterns using registry `selection.review`, `domain_taxonomy`, and `adjacency_rules`; always include `common`, then add touched domains only.
- Read only selected pattern files whose `적용 조건` actually match the reviewed plan or phase detail files.
- Read the active plan wiki `core/common/용어-정책.md` before drafting findings.

### Step 1. Load the plan

- Review one executable `plan.md` at a time.
- Load every phase detail file linked from that `plan.md`.
- Derive user-request items from the latest user request, upstream request-lock handoff, and the reviewed plan.
- Treat the plan summary, linked phase details, active plan wiki guidance, and user request as the source of truth.
- If a phase detail names a local prerequisite plan in `선행 조건`, inspect only that direct prerequisite and the minimum upstream phase needed to verify parity.
- When Figma-derived artifacts are in scope, require manifest-backed provenance as specified by the active plan wiki authority guidance and the reviewed plan.

### Step 2. Challenge the plan shape

Before the main review, check whether the plan shape itself is justified:

- existing code, flow, or policy that already solves part of the request.
- simpler repo-local patterns or framework built-ins.
- over-split or under-split plan topology.
- new abstractions, services, or boundaries that are not justified by the request or repo fit.

Treat scope-challenge findings as normal review evidence.

### Step 3. Run the main review

Judge the plan against:

- active plan wiki core docs and selected patterns.
- active plan wiki plan artifact contract.
- user-request traceability.
- summary/detail parity.
- blocking ambiguity.
- topology and plan-count justification.
- `owner_agent` routing.
- scenario-level `input -> output` contract completeness.
- affected public boundaries, exclusions, no-op rules, recipients, and final interpretation boundaries.
- stable `scenario_id` coverage for phase-local `시나리오 / 계약` rows.
- first-time test runner, command, spec root, source/test topology, mock/API fixture policy, storage/auth state policy, and expected red reason when implementation-first setup does not already exist.
- verification realism and TDD readiness.
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
- `affected_phase_paths`

Rules:

- preserve an orchestrator-provided current `plan_signature`.
- compute signatures from the current plan and finding set when not provided.
- set `requires_user_decision: true` only when a fresh user decision is required.
- set `next_action: plan_revision` for `blocked`; otherwise `developer_review`.

### Step 7. Respond in chat

- Present findings first, ordered by severity.
- Reference the reviewed `plan.md`, relevant phase detail files, and the written `review.md`.
- State clearly whether execution should proceed, requires plan revision, or can continue to developer review with findings.
