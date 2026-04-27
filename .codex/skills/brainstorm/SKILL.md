---
name: brainstorm
description: Codex entry skill for request-lock brainstorming. Use when the user's goal, scope, public boundary, acceptance, exclusions, or user-visible UI direction must be decomposed and fixed in the user's own language before planning.
---

# Brainstorm

Lock ambiguous request scope, public boundaries, ownership, exclusions, and pre-planning risks before `architect` writes executable plans.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for when to use this skill and what request state it must lock.
2. [references/workflow.md](references/workflow.md) for analysis, preflight, option comparison, request-lock snapshot, artifact export, and handoff rules.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable brainstorm constraints.
4. [../architect/references/terminology-policy.md](../architect/references/terminology-policy.md) before producing request-lock or handoff text.

## Controller Rules

- Do not write implementation plans or code.
- Treat the user wording as canonical and avoid replacing it with planner shorthand.
- Ask only unresolved high-impact questions and derive everything possible from local context first.
- Return Korean-first tables for request lock, work bundles, public boundaries, exclusions, state ownership, and review wiki preflight when relevant.
- Do not hand off to `architect` while blocking ambiguity remains.
