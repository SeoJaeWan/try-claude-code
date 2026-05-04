---
name: orchestrator
description: Explicit planning orchestrator for requests that already have locked upstream scope and should run through the repository's architect/review loop. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for automated planning orchestration after brainstorm/request-lock work is done; Codex should coordinate `architect` and fresh `plan-review` passes through skill-driven sub-agents until plans are planning-complete or blocked.
---

# Orchestrator

Run the repository's planning loop as a stateless, artifact-driven workflow with skill-driven `architect` and fresh `plan-review` passes.

Use this skill only for explicit planning orchestration requests after the user or prior context has locked request scope enough for planning. Do not use it as a replacement for `brainstorm`, request-scope locking, or UI direction locking.

## Required Reading

Read these references in order for every orchestration run:

1. [references/contracts.md](references/contracts.md) for inputs, authoritative artifacts, freshness, handoff packets, wait policy, failure taxonomy, chat requirements, and output contract.
2. [references/workflow.md](references/workflow.md) for the controller workflow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable orchestration constraints.

## Controller Rules

- Treat only the artifacts listed in `references/contracts.md` as durable orchestration evidence.
- Recompute orchestration state from artifacts on every re-entry; do not rely on hidden state files or stale chat memory.
- Keep orchestration helper state current-turn only and safely discardable.
- Do not run or substitute for `brainstorm`; stop with a missing-decision blocker when the request is not locked enough for `architect`.
- Always require fresh `plan-review` after architect revisions.
- Treat blocked review findings as input to the next `architect` pass.
- Orchestrate role sub-agents through concise handoff packets; do not ask them to rediscover controller-owned paths or signatures.
- Report precise failure classifications from `references/contracts.md`.
- Keep user-facing orchestration updates short and present user-decision questions in Korean.
