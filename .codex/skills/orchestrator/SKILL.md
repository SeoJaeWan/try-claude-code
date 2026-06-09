---
name: orchestrator
description: Explicit planning orchestrator for requests that already have locked upstream scope and should run through the repository's plan-maker/TDD/review loop. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for automated planning orchestration after brainstorm/request-lock work is done; Codex should run `plan-maker` and `plan-tdd` inline by default, run every `plan-review` as a fresh cold-review sub-agent, and continue until plans are planning-complete or blocked.
---

# Orchestrator

Run the repository's planning loop as a stateless, artifact-driven workflow with inline skill-driven `plan-maker` and `plan-tdd` passes, fresh sub-agent `plan-review` passes, and explicit planning docs approval before planning is complete. For implementation-scope plans, TDD contract authoring happens before `plan-review`, so the reviewer and browser gate can judge `plan.md` and `tdd.md` together.

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
- Do not run or substitute for `brainstorm`; stop with a missing-decision blocker when the request is not locked enough for `plan-maker`.
- If the plan wiki fast-forward freshness preflight fails, stop before planning roles with `plan_wiki_sync_required` and route sync/repair to `plan-wiki-setup`; do not repair the nested wiki repo in orchestrator.
- If the workspace has opted in to dev wiki, refresh `.codex/dev-wiki/source` with `git pull --ff-only` before planning roles. If that fast-forward fails, stop with `dev_wiki_sync_required` and route sync/repair to `dev-wiki-setup`; do not repair the nested dev wiki repo in orchestrator.
- Always require fresh `plan-tdd` after plan-maker revisions before `plan-review`.
- Always require fresh `plan-review` after the current plan and TDD artifacts are available.
- Always require explicit planning docs approval after fresh `plan-review` and before reporting `planning_complete`.
- When reporting `planning_complete` for implementation-scope plans, state that `tdd.md` has already been reviewed and the next step is implementation against the approved plan/TDD contract.
- Treat blocked review findings as input to the next `plan-maker` pass.
- Run `plan-maker` and `plan-tdd` inline by default in the controller session, using their local skills and write-scope guardrails.
- Run every `plan-review` pass as a fresh sub-agent; never review the controller's own plan/TDD inline.
- Use concise handoff packets only for fresh reviewers and explicit optional delegated passes; do not ask them to rediscover controller-owned paths or signatures.
- Report precise failure classifications from `references/contracts.md`.
- Keep user-facing orchestration updates short and present user-decision questions in Korean.
