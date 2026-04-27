# Review Wiki Planning Root Contract

Use this contract whenever planning agents need a workspace-local planning root for the review wiki.

## Paths

- External source root: `~/.codex/reviewWiki/wiki`
- Workspace planning root: `./.codex/review-wiki/sync/current`
- Planning-root manifest: `./.codex/review-wiki/sync/current.manifest.json`

Use the platform-neutral preparation command from `references/platform-commands.md`:

- `node .codex/tools/stage-review-wiki.mjs`

The workspace planning root always resolves at `./.codex/review-wiki/sync/current`. It is prepared as a live directory link to the external `wiki/` root.

After refresh or repair, the planning root is `./.codex/review-wiki/sync/current` itself, so planning agents should find:

- `./.codex/review-wiki/sync/current/registry.json`
- `./.codex/review-wiki/sync/current/core/**`
- `./.codex/review-wiki/sync/current/patterns/**`
- `./.codex/review-wiki/sync/current/tags/**`
- `./.codex/review-wiki/sync/current/_meta/**`

The manifest lives next to the planning root so diagnostics do not modify the external source root.

`raw/` is not part of the planning root because the root points at `~/.codex/reviewWiki/wiki`. The planning root is read-only execution input, not the source of truth.

## Root resolution order

Resolve the planning `review_wiki_root` in this order:

1. `./.codex/review-wiki/sync/current`

If the workspace planning root is missing, stop and route to `review-wiki-setup` instead of falling back to direct external-path reads in planning skills.

## Freshness policy

- `review-wiki-setup` or an external maintenance step repairs or recreates `./.codex/review-wiki/sync/current` as a live link to `~/.codex/reviewWiki/wiki`.
- If the runtime cannot follow the external vault through `./.codex/review-wiki/sync/current`, stop and report that blocker instead of creating a copied fallback.
- `orchestrator`, `architect`, and `plan-review` consume `./.codex/review-wiki/sync/current` directly and do not perform per-run refresh inside the planning workflow.
- Edits to the external `wiki/` root appear immediately through `./.codex/review-wiki/sync/current` once the link exists.
- Planning skills may read `current.manifest.json` for diagnostics, but freshness checks are informational unless the user explicitly requests a stricter policy.
- `current.manifest.json` is valid for the active workspace only when its `destination_root` resolves to the current workspace planning root path.
- If the manifest is missing, unreadable, or its `destination_root` points at another repository, treat the planning root as stale or foreign and route to `review-wiki-setup` for refresh instead of assuming the link is current.
- If the workspace planning root is missing, stop and escalate instead of guessing.

## Responsibility split

- `review-wiki-setup` repairs or bootstraps the external `~/.codex/reviewWiki` link and prepares the workspace planning root as a live link.
- External maintenance jobs may recreate `./.codex/review-wiki/sync/current` without involving the planning hot path.
- Planning skills consume the resolved `review_wiki_root` and must not bypass it with hardcoded external-path reads once the root is resolved.
