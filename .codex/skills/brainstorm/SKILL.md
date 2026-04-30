---
name: brainstorm
description: Codex entry skill for request-lock brainstorming. Use when the user's goal, scope, public boundary, acceptance, exclusions, or user-visible UI direction must be decomposed and fixed in the user's own language before planning, or when existing implementation problems, consistency drift, parity gaps, broken behavior, or cross-surface mismatches require bounded diagnostic inventory before planning scope can be locked.
---

# Brainstorm

Lock ambiguous request scope, or establish a bounded diagnostic baseline for existing-system problems, before executable planning.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for when to use this skill and what request or diagnostic state it must lock.
2. [references/workflow.md](references/workflow.md) for analysis, diagnostic path selection, preflight, option comparison, request-lock snapshot, artifact export, and handoff rules.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable brainstorm constraints.
4. [../../plan-wiki/sync/current/core/common/용어-정책.md](../../plan-wiki/sync/current/core/common/용어-정책.md) before producing request-lock or artifact handoff text.

## Controller Rules

- Do not write implementation plans or code.
- Treat the user wording as canonical and avoid replacing it with planner shorthand.
- Ask only unresolved high-impact questions and derive everything possible from local context first.
- For existing-system problem requests, run bounded diagnostic inventory before asking questions unless the investigation boundary itself is unclear.
- Return Korean-first tables for request lock, work bundles, public boundaries, exclusions, state ownership, and plan wiki preflight when relevant.
- Do not present the request as planning-ready while blocking ambiguity remains.
