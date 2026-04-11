---
name: plan-review
description: Read-only critical review skill for executable `./plans/**/plan.md` artifacts and their linked phase detail files created by `architect`. Use when Codex needs an independent cold review before execution, checking reviewer-facing readability, template compliance, blocking ambiguity, topology quality, owner routing, scenario-level technical input/output contracts, and `plan-materialize` derivation readiness without rewriting the plan.
---

<Skill_Guide>
<Purpose>
Provide a cold, skeptical review of an executable plan and report blocker, major, and minor findings before implementation begins.
</Purpose>

<Instructions>
# plan-review

Review the finished plan artifact, not the original request. Stay read-only.

## Inputs to inspect

1. Target executable plan file: `./plans/**/plan.md`
2. Linked phase detail files referenced from that `plan.md`
3. `../architect/references/planning-policy.md`
4. `../architect/references/plan-template-sequential.md`
5. `../architect/references/phase-template-detail.md`
6. `../architect/references/agents-lite.md`
7. `./references/review-policy.md`
8. Repo-local execution contracts only when needed to verify routing, validation, or repo-fit claims in the plan
9. Directly referenced local prerequisite plan files only when the reviewed phase detail names them in `선행조건`

## Workflow

### Step 0. Read required references

Before judging the plan:

- read `architect/references/planning-policy.md`
- read `architect/references/plan-template-sequential.md`
- read `architect/references/phase-template-detail.md`
- read `plan-review/references/review-policy.md`

### Step 1. Load one executable plan

- Review one executable `plan.md` at a time.
- Derive `task-slug` from the owning plan directory.
- Load every phase detail file linked from that `plan.md`.
- Derive the same deterministic `plan_revision` fingerprint from the current `plan.md` plus its linked phase detail files.
- Treat the plan summary, linked phase detail files, and required references as the source of truth.
- Do not infer missing policy from the original user request when the plan itself is ambiguous.
- If a reviewed phase detail names a local prerequisite plan in `선행조건`, load only that directly referenced plan and inspect only the minimum upstream phase needed to verify the prerequisite contract.
- Do not recurse into a larger plan graph or turn the review into a full multi-plan orchestration pass.

### Step 2. Run a cold review

Judge the plan against:

- template compliance
- `plan.md` readability for a non-developer reviewer
- parity between the `plan.md` phase summary and the linked technical detail file
- blocking ambiguity
- topology quality and plan-count justification
- `owner_agent` routing
- scenario-level `input -> output` contract completeness in the phase detail files
- canonical outputs, negative outputs, and recipients or interpretation boundaries when relevant
- one-hop prerequisite contract parity when the reviewed plan references a local prerequisite plan
- verification realism and repo-fit
- whether the phase detail contracts are explicit enough for later `plan-materialize` derivation
- `playwright-guard` planning when the policy requires it

Prefer findings over compliments. Do not invent repo facts that the plan does not support.

### Step 3. Classify findings

- Use the severity model in `references/review-policy.md`.
- Record only real issues that materially affect execution readiness, reviewability, or later test derivation.
- When a weakness comes from an explicit user tradeoff, note it accurately instead of silently normalizing it away.
- If no findings remain, say so explicitly.

### Step 4. Decide the outcome

- Mark the review `blocked` if any `blocker` finding exists.
- Mark the review `ready-with-findings` if no blocker exists but `major` or `minor` findings remain.
- Mark the review `ready` only when no findings remain.
- Do not rewrite the plan in this skill.

### Step 5. Write the review artifact

Write:

- `./.codex/artifacts/plan-review/{task-slug}/review.md`

Include:

- a YAML frontmatter block at the top with at least:
  - `plan_path`
  - `task_slug`
  - `plan_revision`
  - `outcome`
  - `next_action`
  - `finding_signature`
- reviewed plan path
- outcome
- blocker, major, and minor findings
- assumptions or unknowns that constrained the review
- explicit execution-readiness note

Frontmatter rules:

- `outcome`: `ready` | `ready-with-findings` | `blocked`
- `next_action`:
  - `user_gate` when `outcome = ready`
  - `architect` when `outcome = ready-with-findings` or `blocked`
- `finding_signature`: a stable short fingerprint of the current finding set for this exact `plan_revision`; use `none` when no findings remain

### Step 6. Respond in chat

- Present findings first, ordered by severity.
- Use file references to the reviewed `plan.md`, any especially relevant phase detail file, and the written `review.md` artifact.
- If the outcome is `blocked`, say execution should not proceed until `architect` revises the plan.
- If the outcome is `ready-with-findings`, separate advisory issues from blockers clearly.

## Guardrails

- Read-only: do not edit the plan, source code, or tests.
- Do not silently fix or rewrite the plan inside the review.
- Do not downgrade a blocker just to keep momentum.
- Do not treat partial notes, briefs, or non-executable artifacts as execution-ready plans.
- Do not perform a second full review of upstream plans; inspect only the direct prerequisite parity needed to judge the reviewed plan's execution readiness.
- Do not let missing canonical outputs, negative outputs, recipients, winner or loser rules, terminal-state policy, side-effect coupling, or invalid topology pass silently when later execution would have to guess.
- Do not let `plan.md` hide the actual phase role behind unexplained jargon or vague prose while the technical meaning lives only in the detail file.

</Instructions>
</Skill_Guide>
