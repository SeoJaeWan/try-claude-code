---
name: orchestrator
description: Explicit multi-agent planning orchestrator for requests that should run through the repository's planning loop instead of a one-off planning pass. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for the automated planning/review/developer-review/materialize workflow, and Codex should coordinate upstream feedback triage, `architect`, `plan-review`, browser-based developer review, developer-review learning capture, and `plan-materialize` through generic skill-driven sub-agents with explicit developer approval before test materialization.
---

# Orchestrator

Run the repository's planning loop as a stateless, artifact-driven workflow with skill-driven planning sub-agents, fresh cold review, browser-based developer approval, developer-review learning capture, and test materialization.

Use this skill only for explicit planning orchestration requests. Do not use it as a generic replacement for request-scope locking, UI direction locking, `architect`, `plan-review`, or `plan-materialize`.

## Required Reading

Read these references in order for every orchestration run:

1. [references/contracts.md](references/contracts.md) for inputs, authoritative artifacts, freshness, handoff packets, wait policy, failure taxonomy, chat requirements, and output contract.
2. [references/workflow.md](references/workflow.md) for the Step 0 through Step 10 controller workflow.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable orchestration constraints.

Read these references when the corresponding stage is active:

- [references/developer-review.md](references/developer-review.md) before entering Step 5 or Step 6.
- [references/developer-review-learning.md](references/developer-review-learning.md) before entering Step 7 or invoking `review-wiki-ingest`.
- [references/developer-review-ui.md](references/developer-review-ui.md) before generating the browser review package.

## Controller Rules

- Treat only the artifacts listed in `references/contracts.md` as durable orchestration evidence.
- Recompute orchestration state from artifacts on every re-entry; do not rely on hidden state files or stale chat memory.
- Keep orchestration helper state current-turn only and safely discardable.
- Always require fresh `plan-review` after architect revisions.
- Always require submitted browser developer review approval for the exact current `plan_signature` before materialization.
- Treat non-approved developer review feedback as triage input; route it through Step 6 instead of sending raw labels directly to `architect`.
- Run developer-review learning capture only after the review round is submitted and preserved; do not let learning capture become a materialization gate.
- Orchestrate role sub-agents through concise handoff packets; do not ask them to rediscover controller-owned paths or signatures.
- Report precise failure classifications from `references/contracts.md`.
- Keep user-facing orchestration updates short and present user-decision questions in Korean.
- Write browser-visible developer-review history prose in Korean; keep schema keys, enum values, paths, globs, package names, and code identifiers in their original spelling.
