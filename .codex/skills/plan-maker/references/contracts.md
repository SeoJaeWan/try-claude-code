# Plan Maker Contracts

## Purpose

Create decision-complete implementation plans as one or more self-contained executable plan files. Use the active plan wiki as the policy source for plan artifact meaning, quality gates, execution routing, test/review handoff, and learned pattern guidance; use this skill's references for execution procedure, local templates, and artifact paths.

## Entry Notes

Use this as the preferred planning entrypoint after upstream decisions have locked the request scope enough for planning, including the required and excluded execution areas. Direct execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context.
2. Optional orchestrator handoff in the latest conversation context:
   - `task_slug`
   - optional target `plan_path`
   - `plan_wiki_root`
   - optional `dev_wiki_root`
   - optional `latest_review_path`
   - optional locked request summary when the parent intentionally narrowed context
   - optional `authoritative_existing_inputs` containing controller-verified literal upstream artifact paths
   - optional `known_missing_inputs` containing referenced but missing literal paths as non-authoritative warnings
   - optional controller-verified Figma inventory `manifest.json` and snapshot paths from `./.codex/artifacts/figma-inventory/{task_slug}/` when Figma inventory or classification is required
3. Locked request-scope, diagnostic, UI-direction, or test-strategy artifact or packet, especially the required execution areas and explicit exclusions.
4. Active plan wiki `core/common/계획-산출물-계약.md` - executable plan file contract.
5. Active plan wiki `core/common/실행-라우팅.md` - canonical `owner_agent` catalog and routing rules.
6. `../plan-wiki-setup/references/staging-contract.md` and `../plan-wiki-setup/references/platform-commands.md` in direct mode.
7. Resolved planning `plan_wiki_root` containing `registry.json`, `core/`, `patterns/`, `tags/`, and domain-first selection policy.
8. Stage core documents and matching pattern files selected by the registry for `plan-maker`.
9. `./references/git.md` - branch naming rules when needed.
10. `./references/plan-template-sequential.md` - self-contained plan file template.
11. Active plan wiki `core/common/용어-정책.md` - Korean-first visible prose and allowed English identifier rules.
12. `./references/visual-parity-contract.md` when visual parity tasks are in scope.
13. Relevant execution contracts only when routing or mode-sensitive conventions matter, using the minimum repo-local context that governs the work.
14. `../dev-wiki-setup/references/consumer-context.md` when `dev_wiki_root` is provided.
15. Context7 MCP tools only as fallback when external library or API facts can still change the planning boundary after local inspection and any prior upstream decision handoff.
16. Figma inventory snapshot artifacts only when Figma hierarchy, component-set inventory, Resource/* coverage, platform markers, or Figma-based classification changes the planning boundary.

## Output contract

- Plan artifacts:
  - one or more executable plan files under `./plans/{task-slug}/`
  - each plan file must follow the active plan wiki plan artifact contract
  - each plan file must be self-contained for its single `owner_agent`
- Optional Figma-derived plan-local artifacts only when required by the plan boundary and allowed by the active plan wiki authority guidance.
- Optional orchestration blocking decision packet returned in chat when planning must stop before any executable plan is writable.
- In orchestrated mode, the terminal result must be exactly one of:
  - `result = wrote_plan` with `written_paths` listing every created or updated artifact path
  - `result = blocking_packet` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, `options`, `recommendation`, and `default`
  - when `needs_user_input = false`, the blocking packet may instead include `blocker_type = tool_data_blocker`, `blocker`, `required_data`, and `next_action` if no user decision can resolve the missing tool/data input
- Output language: Korean.
- Visible prose language: Korean-first, following the active plan wiki terminology policy.
