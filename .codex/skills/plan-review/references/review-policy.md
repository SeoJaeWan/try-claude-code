# Plan Review Policy

Use this file for severity mapping, outcome states, and review artifact shape. Use the active review wiki core docs and selected patterns as the source of truth for plan artifact meaning, quality gates, test-strategy expectations, execution handoff, visual comparison policy, and learned domain rules.

## Outcome States

- `blocked`: one or more `blocker` findings exist; do not treat the plan as execution-ready.
- `ready-with-findings`: no blocker exists, but `major` or `minor` findings remain.
- `ready`: no findings remain.

`plan-review` is read-only. If the review is `blocked`, return the plan to `architect` for revision instead of rewriting it inside this skill.

## Severity Model

### Blocker

Use `blocker` when the plan is not safely executable, violates an active review wiki mandatory contract, or would force later skills to guess a canonical decision.

Typical blocker signals:

- missing or invalid required plan artifacts, linked phase detail files, `Branch` header, or phase routing metadata.
- `plan.md` and linked phase detail files disagree on phase boundary, outcome, owner, or completion signal.
- unresolved `blocking` ambiguity under the active review wiki decision policy.
- missing user-request traceability, inclusion/exclusion boundary, or user-visible completion criteria.
- missing affected public boundary, canonical output, important negative/no-op output, recipient, final interpretation boundary, or risky scenario invariant.
- missing test-strategy decisions required by the active review wiki decision policy when `plan-materialize` would otherwise choose the gate.
- plan count, local prerequisite relationship, authority artifact, reference-comparison, Figma parity, or Figma inventory provenance contradicts the active review wiki contract.
- selected pattern guidance reveals a direct contradiction that the plan leaves unresolved.

### Major

Use `major` when the plan is probably executable but materially raises rework risk or review confidence gaps.

Typical major signals:

- validation exists but is too weak for the claimed boundary.
- verification unit choice is plausible but thin or poorly justified.
- UI-facing observability or identifier detail is likely derivable but not clearly locked.
- topology or phase boundary is defensible but hides important sequencing or ownership assumptions.
- user-request traceability, public contract scanability, local prerequisite parity, or repo-fit evidence is thinner than it should be.
- visible prose terminology drift reduces scanability without making the contract ambiguous enough for a blocker.

### Minor

Use `minor` for non-blocking polish that does not change execution readiness.

Typical minor signals:

- optional contract notes are uneven but unambiguous.
- isolated terminology drift exists, but no reviewer has to guess behavior or ownership.
- low-risk repetition or labeling drift exists in explanatory prose.

Prefer no finding over a low-value minor note.

## Required Review Focus

Check the plan against:

1. resolved `review_wiki_root/registry.json`, listed stage core docs, and selected matching patterns.
2. architect plan and phase templates.
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
plan_path: ./plans/.../plan.md
task_slug: ...
plan_signature: ...
outcome: blocked | ready-with-findings | ready
next_action: architect | developer_review
finding_signature: ...
requires_user_decision: true | false
issue_codes: []
affected_phase_paths: []
---

# plan-review

- plan: `./plans/.../plan.md`
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
