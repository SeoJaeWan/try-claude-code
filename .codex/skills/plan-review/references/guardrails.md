# Plan Review Guardrails

## Guardrails

- Do not edit the plan, source code, source-tree tests, plan wiki, or local helper artifacts.
- Do not create scratch files, alternate review artifacts, or sidecar notes.
- Do not silently fix or rewrite the plan inside the review.
- Do not downgrade blockers to preserve momentum.
- Do not treat partial notes, briefs, or non-executable artifacts as execution-ready plans.
- Do not bypass the resolved `plan_wiki_root` with hardcoded external paths after the workspace sync path is available.
- In orchestrated mode, do not redo plan wiki bootstrap already owned by the orchestrator.
- In orchestrated mode, do not invent alternate `plan_path`, `task_slug`, `plan_wiki_root`, or `plan_signature` metadata.
- In reused reviewer sessions, re-read the current plan files from disk and treat old findings as untrusted history.
- Do not recursively review a full upstream plan graph; inspect only direct prerequisite parity when a phase detail names it.
- Do not approve a plan that leaves canonical outputs, negative outputs, recipients, public boundaries, exclusions, or verification ownership for later agents to guess.
- Do not approve a UI plan that leaves critical user-visible hierarchy, state coverage, responsive behavior, or accessibility implications unresolved.
- Do not approve a plan that makes `plan.md` a second implementation spec by repeating phase-local file maps, scenario tables, validation matrices, or long phase summaries.
- Do not approve Figma-derived plan artifacts that lack manifest-backed provenance when the plan depends on Figma inventory or classification.
