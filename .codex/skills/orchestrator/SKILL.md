---
name: orchestrator
description: Explicit planning orchestrator for requests that already have locked upstream scope and should run through the repository's architect/TDD/review loop. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for automated planning orchestration after brainstorm/request-lock work is done; Codex should coordinate `architect`, `plan-tdd`, and fresh `plan-review` passes through skill-driven sub-agents until plans are planning-complete or blocked.
---

# Orchestrator

Run the repository's planning loop as a stateless, artifact-driven workflow with skill-driven `architect`, `plan-tdd`, fresh `plan-review` passes, and explicit planning docs approval before planning is complete. For implementation-scope plans, TDD contract authoring happens before `plan-review`, so the reviewer and browser gate can judge `plan.md` and `tdd.md` together.

Use this skill only for explicit planning orchestration requests after the user or prior context has locked request scope enough for planning. Do not use it as a replacement for `brainstorm`, request-scope locking, or UI direction locking.

## Required Reading

Read these references in order for every orchestration run:

1. [references/contracts.md](references/contracts.md) for inputs, authoritative artifacts, freshness, handoff packets, wait policy, failure taxonomy, chat requirements, and output contract.
2. [references/workflow.md](references/workflow.md) for the controller workflow.
3. [references/planning-docs.md](references/planning-docs.md) for the planning docs gate and feedback routing.
4. [references/planning-docs-learning.md](references/planning-docs-learning.md) for non-blocking learning capture from submitted planning docs rounds.
5. [references/planning-docs-ui.md](references/planning-docs-ui.md) when generating or triaging planning docs packages.
6. [references/guardrails.md](references/guardrails.md) for non-negotiable orchestration constraints.

## Controller Rules

- Treat only the artifacts listed in `references/contracts.md` as durable orchestration evidence.
- Recompute orchestration state from artifacts on every re-entry; do not rely on hidden state files or stale chat memory.
- Keep orchestration helper state current-turn only and safely discardable.
- Do not run or substitute for `brainstorm`; stop with a missing-decision blocker when the request is not locked enough for `architect`.
- Always require fresh `plan-tdd` after architect revisions before `plan-review`.
- Always require fresh `plan-review` after the current plan and TDD artifacts are available.
- Always require explicit planning docs approval after fresh `plan-review` and before reporting `planning_complete`.
- When reporting `planning_complete` for implementation-scope plans, state that `tdd.md` has already been reviewed and the next step is implementation against the approved plan/TDD contract.
- Treat blocked review findings as input to the next `architect` pass.
- Orchestrate role sub-agents through concise handoff packets; do not ask them to rediscover controller-owned paths or signatures.
- Report precise failure classifications from `references/contracts.md`.
- Keep user-facing orchestration updates short and present user-decision questions in Korean.
