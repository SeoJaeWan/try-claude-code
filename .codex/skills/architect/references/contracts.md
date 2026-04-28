# Architect Contracts

## Purpose

Create decision-complete implementation plans as one or more sequential executable plans that follow the active review wiki core contracts, preserve the user's wording, expose concrete work bundles, and keep later execution from guessing.

## Entry Notes

Use this as the preferred planning entrypoint for complex or high-impact requests, or after upstream decisions have locked the request scope enough for planning.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context
2. Optional orchestrator handoff in the latest conversation context when invoked by `orchestrator`:
   - `task_slug`
   - `plan_path`
   - `review_wiki_root`
   - optional `latest_review_path`
   - optional locked request summary when the parent intentionally narrowed context
   - optional `authoritative_existing_inputs` containing controller-verified literal upstream artifact paths
   - optional `known_missing_inputs` containing referenced but missing literal paths as non-authoritative warnings
3. Optional locked UI direction handoff from the latest conversation context or a directly referenced `./.codex/artifacts/ui-spec/{feature-name}.md`
4. `./references/agents-lite.md` - canonical `owner_agent` catalog
5. `../review-wiki-setup/references/staging-contract.md` - review wiki sync resolution and refresh rules
6. `../review-wiki-setup/references/platform-commands.md` - platform-specific link and planning-root commands
7. Resolved planning `review_wiki_root` containing `registry.json`, `core/`, `patterns/`, and selection policy. Use `./.codex/review-wiki/sync/current` as the planning root.
8. Every core document listed in `stage_core.architect`, or the registry `core` array when no architect-specific override exists, in listed order
9. Candidate pattern files selected from the registry `patterns` list using the `architect` selection mode plus matching `적용 조건`
10. `./references/git.md` - commit message, branch naming, and worktree naming rules
11. `./references/plan-template-sequential.md` - sequential plan template
12. `./references/phase-template-detail.md` - per-phase technical detail template
13. `./references/terminology-policy.md` - Korean-first visible prose and allowed English identifier rules
14. `./references/visual-parity-contract.md` - canonical comparison-mode, surface-role, and metric-contract rules for visual parity tasks
15. Relevant execution contracts only when routing or mode-sensitive conventions matter:
   - inspect only the minimum repo-local tool/validation/runtime contract that governs the work
   - examples: `package.json` scripts, framework config, test config, CI config schema, deploy script entrypoints, or existing source-tree placement conventions
16. Context7 MCP tools only as fallback when external library or API facts can still change the planning boundary after local inspection and any prior upstream decision handoff:
   - use Context7 only for version-sensitive library/framework/API behavior, migration constraints, deprecation status, or current recommended patterns
   - do not use Context7 for repo-local conventions, stable language basics, or facts already derivable from local context

## Output contract

- Plan artifacts:
  - single executable plan summary: `./plans/{task-slug}/plan.md`
  - matching phase detail files: `./plans/{task-slug}/phases/{nn}-{phase-slug}.md`
  - multiple executable plan summaries when required: `./plans/{task-group}-{nn}-{slice-slug}/plan.md`
  - each multi-plan artifact also owns matching phase detail files under its own `phases/`
- Optional orchestration blocking decision packet returned in chat when planning must stop before any executable plan is writable
- In orchestrated mode, the terminal result must be exactly one of:
  - `result = wrote_plan` with `written_paths` listing every created or updated artifact path
  - `result = blocking_packet` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, `options`, `recommendation`, and `default`
- Output language: Korean
- Visible prose language: Korean-first, following `references/terminology-policy.md`
