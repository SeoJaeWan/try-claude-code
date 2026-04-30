---
name: ui-spec
description: Codex entry skill for locking a user-visible UI direction artifact. Use when a request changes user-visible screens, pages, components, layout, information hierarchy, interaction states, or responsive behavior and the UI direction is not concrete enough for artifact consumers. Run consultation mode first to define the visual/system direction and state expectations, then use shotgun mode only when multiple concrete UI directions still remain.
---

# UI Spec

Lock user-visible UI direction when hierarchy, state presentation, responsive behavior, or design-system fit is still ambiguous.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for when to use this skill and what UI direction must be locked.
2. [references/workflow.md](references/workflow.md) for consultation-first specification, optional variant comparison, snapshots, artifact export, and handoff rules.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable UI specification constraints.
4. [../../review-wiki/sync/current/core/common/용어-정책.md](../../review-wiki/sync/current/core/common/용어-정책.md) before producing snapshots or artifact handoff text.

## Controller Rules

- Use consultation mode before shotgun mode.
- Do not write implementation code or source-tree tests.
- Keep the result concrete enough for artifact consumers to use without guessing.
- Write Korean-first UI direction snapshots and keep English only for exact identifiers, tokens, paths, field keys, or quoted product text.
- Do not present a locked UI specification while blocking UI-direction ambiguity remains.
