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
- `orchestrator` may run one fast-forward pull preflight with `git -C .codex/plan-wiki/source pull --ff-only` before routing planning roles.
- If that fast-forward preflight fails because the source clone is dirty, behind with local commits, diverged, conflicted, or otherwise cannot be advanced safely, route to the `plan-wiki-setup` sync/repair unit before invoking planning roles.
- `orchestrator` must not merge, rebase, reset, clean, stash, or push the plan wiki source clone during planning preflight.
- `plan-maker`, `brainstorm`, `plan-tdd`, and `plan-review` consume `./.codex/plan-wiki/source/wiki` directly and do not perform per-run clone, fetch, or pull inside the planning workflow.
- Plan wiki maintenance skills may edit `./.codex/plan-wiki/source` and then report the nested repo Git status.
- Plan wiki maintenance commits follow `platform-commands.md` Git Sync rules.
