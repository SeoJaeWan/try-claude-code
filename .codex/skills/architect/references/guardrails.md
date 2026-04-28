# Architect Guardrails

## Guardrails

- Planning only: do not write implementation code
- Every executable plan file is sequential-only
- Follow the active review wiki plan artifact contract for the intended `plan.md` audience and detail split
- Do not treat the review wiki as optional when its registry is available; always read the registry first and route from it
- Do not bypass the resolved `review_wiki_root` with hardcoded external-path reads once the workspace sync path is available
- In orchestrated mode, do not redo review wiki bootstrap or orchestration preflight that the orchestrator already completed
- In orchestrated mode, do not rediscover controller-owned authority beyond provided `authoritative_existing_inputs`
- Do not generate or edit source-tree tests inside `architect`
- `visual-comparator` execution happens later; architect only plans that phase
- Do not produce a plan with unresolved blocking ambiguity
- Do not replace the user's wording with planner shorthand when the user's wording can be preserved in a request row
- In orchestrated mode, do not leave pre-plan blocking questions only as vague chat questions; emit a structured decision packet instead
- In orchestrated mode, do not reinterpret `known_missing_inputs` as prompts to search for substitute paths
- In orchestrated mode, do not finish with progress-only updates; return plan artifacts or the blocking decision packet
- Do not leave user-visible hierarchy, state presentation, or responsive behavior implicit when upstream UI direction already resolved them
- Do not add new top-level plan sections just to mirror an upstream UI direction handoff
- Do not treat Context7 as mandatory for every plan; use it only when unstable external facts can change the boundary, contract, or phase split
- Do not re-query Context7 just because it is available when upstream decisions already resolved the relevant library/framework/API decision well enough for planning
- Do not leave Context7-derived constraints only in transient reasoning; if they matter, compress them into the top-level request / contract tables or the relevant phase detail file
- Do not generate multiple executable plan files unless the active core plan-count rule requires it
- Do not generate overview, index, DAG, or root graph files
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning
- Do not prescribe arbitrary `작업 순서` step counts
- Do not let the plan folder name, branch summary, and worktree directory diverge
- Do not leave a local prerequisite contract only in handoff prose
- Do not leave canonical outputs, negative outputs, or recipients implicit when later test materialization would have to guess
- Do not hide the real phase role behind unexplained jargon in `plan.md`
- Do not leave English planner shorthand such as `surface`, `user action`, `completion condition`, general `routing`, or `metadata` in visible prose unless it is an exact identifier or schema key
- Do not make the controller open every phase detail file just to understand the whole plan flow
- Do not bury the actual work of a phase under routing metadata or abstract labels
- Do not make a reviewer reconstruct public props, callback names, state ownership, or exclusions from prose alone
- Do not use task-local UI nouns as the canonical taxonomy for a visual parity contract
- Do not claim scoped or structural visual parity closure without an explicit blocking gating metric and a separate non-gating metric decision
