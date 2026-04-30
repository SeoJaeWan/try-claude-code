# Plan Wiki Planning Root Contract

Use this contract whenever planning agents need a workspace-local planning root for the plan wiki.

## Paths

- External source root: `~/.codex/planWiki/wiki`
- Workspace planning root: `./.codex/plan-wiki/sync/current`

Use the platform-neutral preparation command from `references/platform-commands.md`:

- `node .codex/tools/stage-plan-wiki.mjs`

The workspace planning root always resolves at `./.codex/plan-wiki/sync/current`. It is prepared as a live directory link to the external `wiki/` root.

After refresh or repair, the planning root is `./.codex/plan-wiki/sync/current` itself, so planning agents should find:

- `./.codex/plan-wiki/sync/current/registry.json`
- `./.codex/plan-wiki/sync/current/core/**`
- `./.codex/plan-wiki/sync/current/patterns/**`
- `./.codex/plan-wiki/sync/current/tags/**`
- `./.codex/plan-wiki/sync/current/_meta/**`

`raw/` is not part of the planning root because the root points at `~/.codex/planWiki/wiki`. The planning root is read-only execution input, not the source of truth.

## Root resolution order

Resolve the planning `plan_wiki_root` in this order:

1. `./.codex/plan-wiki/sync/current`

If the workspace planning root is missing, stop and route to `plan-wiki-setup` instead of falling back to direct external-path reads in planning skills.

## Freshness policy

- `plan-wiki-setup` or an external maintenance step repairs or recreates `./.codex/plan-wiki/sync/current` as a live link to `~/.codex/planWiki/wiki`.
- If the runtime cannot follow the external vault through `./.codex/plan-wiki/sync/current`, stop and report that blocker instead of creating a copied fallback.
- `orchestrator`, `architect`, and `plan-review` consume `./.codex/plan-wiki/sync/current` directly and do not perform per-run refresh inside the planning workflow.
- Edits to the external `wiki/` root appear immediately through `./.codex/plan-wiki/sync/current` once the link exists.
- The workspace planning root is valid only when the link resolves to `~/.codex/planWiki/wiki` and exposes `registry.json`.
- If the workspace planning root is missing, stop and escalate instead of guessing.

## Responsibility split

- `plan-wiki-setup` repairs or bootstraps the external `~/.codex/planWiki` link and prepares the workspace planning root as a live link.
- External maintenance jobs may recreate `./.codex/plan-wiki/sync/current` without involving the planning hot path.
- Planning skills consume the resolved `plan_wiki_root` and must not bypass it with hardcoded external-path reads once the root is resolved.
