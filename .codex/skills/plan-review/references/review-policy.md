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
- UI-facing plans rely on planning docs approval but do not provide connected HTML/CSS wireframe evidence for the user-visible structure, feature placement, state coverage, and responsive behavior the reviewer must judge.
- UI-facing plans collapse separate shell, screen, component, or state/variant implementation judgment units into one broad preview in a way that would force implementation agents to infer component quality, route composition, or responsive behavior from unrelated context.
- plans that name a finite component/repeated-UI target count do not expose matching component-preview coverage or an explicit excluded-unit rationale.
- UI evidence for a new or revised plan omits `fidelity`, or uses unlabeled placeholder blocks so the reviewer cannot identify regions, actions, repeated units, states, or responsive transitions.
- plans claim brand, landing, Figma, design-system parity, or component visual fidelity from standalone HTML/CSS evidence instead of naming a reference authority and implementation-time validation method.
- plans that introduce token, schema, registry, variant, or design-system value transformation through a function, mapper, adapter, or serializer do not provide a `function-contract` input/output harness or equivalent structured contract showing input, function/adapter, output recipient, and negative/no-op cases.
- missing current `tdd.md` for an implementation-scope plan, or `tdd.md` whose `plan_signature` does not match the reviewed plan.
- missing plan row/scenario to test mapping in `tdd.md` for selected behavior, runtime lifecycle, policy, failure UI, no-op, recipient, or final-interpretation clauses.
- missing manual smoke gate in `tdd.md` for selected plan clauses that are explicitly not automatable before implementation.
- TDD reports `blocker_type = plan_contract` for a selected clause, or hides a TDD blocker behind a ready plan review.
- missing test-strategy decisions required by the active plan wiki decision policy when TDD authoring would otherwise choose the gate.
- missing `../plan-tdd/references/contracts.md` First-Time Test Contract Fields when the plan expects contract tests before the test environment exists.
- plan count, local prerequisite relationship, authority artifact, reference-comparison, Figma parity, or Figma inventory provenance contradicts the active plan wiki contract.
- Figma-first, external-reference, inventory, classification, or fixture authority is required for implementation or validation, but the plan moves that authority creation into an implementation phase instead of consuming a verified planning input artifact.
- implementation scope is large enough to require staged execution or planning docs, but the plan has no reviewable `## 실행 흐름` Phase entries, so later tooling or the user would have to infer phase boundaries.
- visible prose terminology violates the active terminology policy in a way that hides scope, ownership, completion criteria, validation meaning, or required user-visible behavior.
- selected pattern guidance reveals a direct contradiction that the plan leaves unresolved.

### Major

Use `major` when the plan is probably executable but materially raises rework risk or review confidence gaps.

Typical major signals:

- validation exists but is too weak for the claimed boundary.
- TDD mapping exists but the expected red reason, actual red result, or completion gate is too thin to tell valid red contract failure from malformed test/setup failure.
- verification unit choice is plausible but thin or poorly justified.
- UI-facing observability or identifier detail is likely derivable but not clearly locked.
- UI preview evidence exists but its review points, phase mapping, or covered states are too thin for the reviewer to know what judgment the preview is meant to support.
- UI preview evidence is present but its wireframe labels are too generic, omits representative state/variant examples, or hides component coverage inside a shell preview instead of making the built units reviewable.
- `reference-linked` visual scope exists but the reference authority, comparison surface, or post-implementation visual validation method is too thin for a later implementation/review agent to apply.
- `function-contract` evidence exists but the input, selected function/adapter, output recipient, or prohibited output is too thin to become a later unit or Component Test contract.
- expected red reason is present but too thin to distinguish valid completion-blocking failure from malformed test/setup failure.
- plan-file split is defensible but hides important sequencing or ownership assumptions.
- implementation scope has Phase entries, but one or more phases lacks a meaningful completion signal, validation owner, or commit boundary.
- planning docs readiness is thin because phase labels are present but do not expose what the user should approve or what would trigger plan revision.
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
5. current `tdd.md` mapping completeness and blocker/manual smoke visibility.
6. directly referenced local prerequisite plans only for one-hop parity.

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
