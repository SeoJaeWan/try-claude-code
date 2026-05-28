# Plan Wiki Planning Root Contract

Use this contract whenever planning agents need a workspace-local planning root for the plan wiki.

## Paths

- Source Git repository clone: `./.codex/plan-wiki/source`
- Workspace planning root: `./.codex/plan-wiki/source/wiki`

The planning root is a normal directory inside the project-local source clone. Do not create or depend on legacy sync-link directories.

Planning agents should find:

- `./.codex/plan-wiki/source/wiki/registry.json`
- `./.codex/plan-wiki/source/wiki/core/**`
- `./.codex/plan-wiki/source/wiki/patterns/**`
- `./.codex/plan-wiki/source/wiki/tags/**`
- `./.codex/plan-wiki/source/wiki/_meta/**`

`raw/`, `feedback/`, and `history/` live at `./.codex/plan-wiki/source/` and are not part of the planning root.

## Root Resolution

Resolve the planning `plan_wiki_root` in this order:

1. `./.codex/plan-wiki/source/wiki`

If the planning root is missing, stop and route to `plan-wiki-setup` instead of falling back to home-directory links or direct external-path reads.

## Freshness Policy

- `plan-wiki-setup` prepares or verifies `./.codex/plan-wiki/source`.
- `orchestrator`, `plan-maker`, `brainstorm`, and `plan-review` consume `./.codex/plan-wiki/source/wiki` directly and do not perform per-run clone or fetch inside the planning workflow.
- Plan wiki maintenance skills may edit `./.codex/plan-wiki/source` and then report the nested repo Git status.
- Commit and push are allowed only after explicit user approval.
- Plan wiki commits must include only files changed by the current operation and must not absorb unrelated dirty files in `./.codex/plan-wiki/source`.
