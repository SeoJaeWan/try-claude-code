# Plan Review Policy

Canonical review rules for `plan-review`.

Use this file for:

- severity classification
- review scope
- outcome rules
- artifact contract

---

## Outcome States

- `blocked`: one or more `blocker` findings exist; do not treat the plan as execution-ready
- `ready-with-findings`: no blocker exists; `major` or `minor` findings remain as advisory review input
- `ready`: no findings remain

`plan-review` is read-only.
If the review is `blocked`, return the plan to `architect` for revision instead of rewriting it inside the review skill.

---

## Severity Model

### Blocker

Use `blocker` when the plan is not safely executable, not reviewable, or would force later skills to guess a canonical contract.

Typical blocker cases:

- invalid or missing `Branch` header
- slug mismatch between plan path and branch summary
- missing required `plan.md` summary fields or missing linked phase detail files from the active core plan artifact contract
- a `plan.md` phase summary and its linked phase detail file describe different change boundaries or incompatible outcomes
- unresolved blocking ambiguity
- invalid or missing `owner_agent`
- no believable verification path
- missing canonical `must happen` output for a behavior-changing phase
- missing important `must not happen` output when absence is part of product policy
- missing recipient, delivery target, or final interpretation boundary when relevant
- missing winner rule, loser no-op rule, terminal-state rule, or side-effect coupling for risky scenarios
- plan count or topology that is clearly over-split, under-justified, or not independently mergeable under the active core contract
- missing `playwright-guard` phase when the active core docs require it
- the reviewed plan depends on a local prerequisite plan, but no specific upstream phase credibly provides the prerequisite contract in the detail file `output` and `검증`
- the reviewed plan depends on a local prerequisite plan, but the supposed provider phase boundary or verification path cannot actually establish that contract
- selected pattern guidance reveals a direct contradiction that the plan leaves unresolved

### Major

Use `major` when the plan is probably executable but has a material weakness that raises review cost, rework risk, or confidence gaps.

Typical major cases:

- validation is real but too weak for the claimed boundary
- topology is defensible but likely suboptimal
- phase boundaries are technically valid but hide important sequencing or ownership assumptions
- `plan.md` is technically complete but still obscures what the step actually changes, especially for a non-developer reviewer
- the `plan.md` summary and technical detail file are individually plausible but drift in wording enough to raise rework risk
- repo-fit claims exist but rely on thin local evidence
- `plan-materialize` can probably proceed, but the phase contract is thinner than it should be for later test derivation
- a local prerequisite relationship probably works, but the downstream detail-file `선행조건` and upstream `output` or `검증` use thinner or drifted wording that raises rework risk

### Minor

Use `minor` for clarity, density, or polish issues that do not change execution readiness.

Typical minor cases:

- redundant prose
- slightly uneven checklist quality
- wording that is awkward but still precise enough

Prefer no finding over a low-value minor note.

---

## Review Scope

Check the plan against:

1. the resolved `review_wiki_root/registry.json` plus the listed core docs; prefer `./.codex/cache/review-wiki/current`, then fall back to `~/.codex/reviewWiki/wiki` only when the cache is unavailable
2. selected pattern files that match the reviewed plan under the registry `selection.review` policy
3. `architect/references/plan-template-sequential.md`
4. `architect/references/phase-template-detail.md`
5. repo-local execution contracts only when the plan makes a concrete claim that depends on them
6. directly referenced local prerequisite plan files only for one-hop contract parity when the reviewed phase detail names them in `선행조건`

Required focus areas:

1. template compliance
2. reviewer-facing readability of `plan.md`
3. summary/detail parity
4. blocking ambiguity and scenario completeness
5. plan count and topology quality
6. routing and ownership fit
7. verification realism
8. `plan-materialize` derivation readiness
9. `playwright-guard` planning when relevant
10. direct prerequisite contract parity when relevant

### One-Hop Prerequisite Audit

When the reviewed phase detail names a local prerequisite plan in `선행조건`:

- inspect only the directly referenced upstream plan file, not the whole plan graph
- find the specific upstream phase that should satisfy the prerequisite
- compare the downstream detail-file `선행조건` contract with the upstream detail-file `output` and `검증`
- treat the review as `blocker` when the prerequisite requires guesswork, broad foundation wording, or an upstream phase whose boundary cannot credibly establish the contract
- treat the review as `major` when the relationship is plausible but the wording or verification parity is thin enough to invite stop-time reinterpretation

---

## Artifact Contract

Write the review artifact to:

```text
./.codex/artifacts/plan-review/{task-slug}/review.md
```

Recommended artifact structure:

```text
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
