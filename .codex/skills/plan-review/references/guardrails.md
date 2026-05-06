# Plan Review Guardrails

## Guardrails

- Do not edit the plan, source code, source-tree tests, plan wiki, or local helper artifacts.
- Do not create scratch files, alternate review artifacts, or sidecar notes.
- Do not silently fix or rewrite the plan inside the review.
- Do not downgrade blockers to preserve momentum.
- Do not treat partial notes, briefs, legacy phase details, or non-executable artifacts as execution-ready plans.
- Do not bypass the resolved `plan_wiki_root` with hardcoded external paths after the workspace sync path is available.
- In orchestrated mode, do not redo plan wiki bootstrap already owned by the orchestrator.
- In orchestrated mode, do not invent alternate `plan_path`, `task_slug`, `plan_wiki_root`, or `plan_signature` metadata.
- In reused reviewer sessions, re-read the current plan file from disk and treat old findings as untrusted history.
- Do not recursively review a full upstream plan graph; inspect only direct prerequisite parity when a plan names it.
- Do not approve a plan that leaves canonical outputs, negative outputs, recipients, public boundaries, exclusions, or verification ownership for later agents to guess.
- Do not approve a plan that expects first-time TDD but leaves runner, command, spec root, source/test topology, mock/API fixture policy, storage/auth state policy, or expected red reason for later test authoring to invent.
- Do not approve an implementation-scope plan that commits new source/test/fixture topology without showing repo-local inspection evidence for those placements.
- Do not approve a plan whose file/folder topology, phase rows, feature contracts, and evidence artifacts point to different paths, phases, inputs, outputs, or states.
- Do not approve a plan that presents HTML/JS evidence as production code or requires real API calls, DB access, filesystem writes, live dev servers, React builds, or production stack execution for planning review.
- Do not approve a UI plan that leaves critical user-visible hierarchy, state coverage, responsive behavior, or accessibility implications unresolved.
- Do not approve a non-trivial implementation plan that lacks reviewable Phase entries, completion signals, validation, and commit boundaries for developer review.
- Do not approve a plan that requires a separate shared contract, linked phase detail file, or unstated note to understand execution meaning.
- Do not approve Figma-derived plan artifacts that lack manifest-backed provenance when the plan depends on Figma inventory or classification.
