# Architect Contracts

## Purpose

Create decision-complete implementation plans as one or more sequential executable plans. Use the active review wiki as the policy source for plan artifact meaning, quality gates, test/review handoff, execution routing, and learned pattern guidance; use this skill's references for execution procedure, local templates, and artifact paths.

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
   - optional controller-verified Figma inventory `manifest.json` and snapshot paths from `./.codex/artifacts/figma-inventory/{task_slug}/` when Figma inventory or classification is required
3. Optional locked UI direction handoff from the latest conversation context or a directly referenced `./.codex/artifacts/ui-spec/{feature-name}.md`
4. Optional locked request-scope or test-strategy handoff from `brainstorm`, including verification unit, observable result, identifier policy, and excluded test scope when those choices affect the plan
5. `./references/agents-lite.md` - canonical `owner_agent` catalog
6. `../review-wiki-setup/references/staging-contract.md` - review wiki sync resolution and refresh rules
7. `../review-wiki-setup/references/platform-commands.md` - platform-specific link and planning-root commands
8. Resolved planning `review_wiki_root` containing `registry.json`, `core/`, `patterns/`, `tags/`, and domain-first selection policy. Use `./.codex/review-wiki/sync/current` as the planning root in direct mode.
9. Stage core documents and matching pattern files selected by the registry for `architect`.
11. `./references/git.md` - commit message, branch naming, and worktree naming rules
12. `./references/plan-template-sequential.md` - sequential plan template
13. `./references/phase-template-detail.md` - per-phase technical detail template
14. `./references/terminology-policy.md` - Korean-first visible prose and allowed English identifier rules
15. `./references/visual-parity-contract.md` - canonical comparison-mode, surface-role, and metric-contract rules for visual parity tasks
16. Relevant execution contracts only when routing or mode-sensitive conventions matter:
   - inspect only the minimum repo-local tool/validation/runtime contract that governs the work
   - examples: `package.json` scripts, framework config, test config, CI config schema, deploy script entrypoints, or existing source-tree placement conventions
17. Context7 MCP tools only as fallback when external library or API facts can still change the planning boundary after local inspection and any prior upstream decision handoff:
   - use Context7 only for version-sensitive library/framework/API behavior, migration constraints, deprecation status, or current recommended patterns
   - do not use Context7 for repo-local conventions, stable language basics, or facts already derivable from local context
18. Figma inventory snapshot artifacts only when Figma hierarchy, component-set inventory, Resource/* coverage, platform markers, or Figma-based classification changes the planning boundary:
   - use only controller-verified snapshot artifacts as full inventory evidence in orchestrated mode
   - do not treat Code Connect, design context, old parity reports, or package registries as complete Figma inventory by themselves
   - when writing Figma-derived classification or `figma-contract` artifacts, include provenance to the source manifest path, snapshot paths, `fileKey`, root node ids, `generatedAt`, fidelity, and coverage completeness

## Output contract

- Plan artifacts:
  - single executable plan summary: `./plans/{task-slug}/plan.md`
  - matching phase detail files: `./plans/{task-slug}/phases/{nn}-{phase-slug}.md`
  - multiple executable plan summaries when required: `./plans/{task-group}-{nn}-{slice-slug}/plan.md`
  - each multi-plan artifact also owns matching phase detail files under its own `phases/`
- Optional Figma-derived plan-local artifacts, when required by the plan boundary:
  - `./plans/{task-slug}/figma-contract/*.md`
  - `./plans/{task-slug}/figma-contract/*.json`
  - each artifact must cite the controller-verified Figma inventory `manifest.json`, referenced snapshot paths, `fileKey`, root node ids, `generatedAt`, fidelity, and `coverageComplete`
- Optional orchestration blocking decision packet returned in chat when planning must stop before any executable plan is writable
- In orchestrated mode, the terminal result must be exactly one of:
  - `result = wrote_plan` with `written_paths` listing every created or updated artifact path
  - `result = blocking_packet` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, `options`, `recommendation`, and `default`
  - when `needs_user_input = false`, the blocking packet may instead include `blocker_type = tool_data_blocker`, `blocker`, `required_data`, and `next_action` if no user decision can resolve the missing tool/data input
- Output language: Korean
- Visible prose language: Korean-first, following `references/terminology-policy.md`
