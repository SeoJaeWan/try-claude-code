# Plan Review Policy

Use this file for severity mapping, outcome states, and review artifact shape. Use the active plan wiki core docs and selected patterns as the source of truth for plan artifact meaning, quality gates, test-strategy expectations, execution handoff, visual comparison policy, and learned domain rules.

## Outcome States

- `blocked`: one or more `blocker` findings exist; do not treat the plan as execution-ready.
- `ready-with-findings`: no blocker exists, but `major` or `minor` findings remain.
- `ready`: no findings remain.

`plan-review` is read-only. If the review is `blocked`, mark the artifact as requiring plan revision instead of rewriting it inside this skill.

## Severity Model

### Blocker

Use `blocker` when the plan is not safely executable, violates an active plan wiki mandatory contract, or would force later skills to guess a canonical decision.

Typical blocker signals:

- missing or invalid required plan file, YAML frontmatter, `plan_slug`, `branch`, or `owner_agent`.
- `owner_agent` is not in the active routing catalog or contradicts the plan body.
- the plan is not self-contained and requires another plan, shared contract, phase detail, or unstated planning note to understand execution meaning.
- unresolved `blocking` ambiguity under the active plan wiki decision policy.
- missing user-request traceability, inclusion/exclusion boundary, or user-visible completion criteria.
- missing affected public boundary, canonical output, important negative/no-op output, recipient, final interpretation boundary, or risky scenario invariant.
- implementation-scope topology is committed without repo-local inspection evidence, or it duplicates/contradicts existing local surfaces the plan should have reused.
- file/folder topology, phase rows, feature contracts, and evidence artifacts contradict each other on phase, path, input, output, state, or ownership.
- evidence artifacts are presented as production code or require real API calls, DB access, filesystem writes, live dev servers, React builds, or production stack execution for planning review.
- missing test-strategy decisions required by the active plan wiki decision policy when later verification would otherwise choose the gate.
- missing first-time test runner, command, spec root or test-owner placement, source/test topology, mock/API fixture policy, browser storage/auth state policy, or expected red reason when the plan expects contract tests before the test environment exists.
- plan count, local prerequisite relationship, authority artifact, reference-comparison, Figma parity, or Figma inventory provenance contradicts the active plan wiki contract.
- Figma-first, external-reference, inventory, classification, or fixture authority is required for implementation or validation, but the plan moves that authority creation into an implementation phase instead of consuming a verified planning input artifact.
- implementation scope is large enough to require staged execution or developer review, but the plan has no reviewable `## 실행 흐름` Phase entries, so later tooling or the user would have to infer phase boundaries.
- visible prose terminology violates the active terminology policy in a way that hides scope, ownership, completion criteria, validation meaning, or required user-visible behavior.
- selected pattern guidance reveals a direct contradiction that the plan leaves unresolved.

### Major

Use `major` when the plan is probably executable but materially raises rework risk or review confidence gaps.

Typical major signals:

- validation exists but is too weak for the claimed boundary.
- verification unit choice is plausible but thin or poorly justified.
- UI-facing observability or identifier detail is likely derivable but not clearly locked.
- expected red reason is present but too thin to distinguish valid completion-blocking failure from malformed test/setup failure.
- plan-file split is defensible but hides important sequencing or ownership assumptions.
- implementation scope has Phase entries, but one or more phases lacks a meaningful completion signal, validation owner, or commit boundary.
- developer review readiness is thin because phase labels are present but do not expose what the user should approve or what would trigger plan revision.
- user-request traceability, public contract scanability, local prerequisite parity, topology evidence, or repo-fit evidence is thinner than it should be.
- visible prose terminology drift reduces scanability or leaves repeated non-literal English shorthand, without making the contract ambiguous enough for a blocker.

### Minor

Use `minor` for non-blocking polish that does not change execution readiness.

Typical minor signals:

- optional contract notes are uneven but unambiguous.
- isolated terminology drift exists, but no reviewer has to guess behavior or ownership.
- low-risk repetition or labeling drift exists in explanatory prose.

Prefer no finding over a low-value minor note.

## Required Review Focus

Check the plan against:

1. resolved `plan_wiki_root/registry.json`, listed stage core docs, and selected matching patterns.
2. active plan wiki plan artifact contract.
3. terminology policy for visible prose.
4. repo-local execution contracts only when the plan makes concrete claims that depend on them.
5. directly referenced local prerequisite plans only for one-hop parity.

## Review Artifact

Write:

```text
./plans/_orchestrator/review/{task-slug}/review.md
```

Recommended structure:

```text
---
plan_path: ./plans/.../frontend.plan.md
task_slug: ...
plan_signature: ...
outcome: blocked | ready-with-findings | ready
next_action: plan_revision | planning_complete
finding_signature: ...
requires_user_decision: true | false
issue_codes: []
affected_plan_paths: []
---

# plan-review

- plan: `./plans/.../frontend.plan.md`
- outcome: `blocked | ready-with-findings | ready`

## Findings

### Blocker
- ...

### Major
- ...

### Minor
- ...

## Assumptions
- ...

## Execution Readiness
- ...
```

Findings must appear before summary commentary.
