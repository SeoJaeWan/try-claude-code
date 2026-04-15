# Review Wiki Staging Contract

Use this contract whenever planning agents need a workspace-local copy of the review wiki.

## Paths

- External source root: `~/.codex/reviewWiki/wiki`
- Workspace cache root: `./.codex/cache/review-wiki/current`
- Stage manifest: `./.codex/cache/review-wiki/current/staged.json`

Use the platform-appropriate staging command from `references/platform-commands.md`:

- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.ps1`
- macOS / Linux: `sh ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.sh`

The cache copies the `wiki/` subtree only. It is read-only execution input, not the source of truth.

## Root resolution order

Resolve `review_wiki_root` in this order:

1. `./.codex/cache/review-wiki/current`
2. `~/.codex/reviewWiki/wiki`

When the cache exists, planning agents should consume it instead of hardcoding the external root.

## Freshness policy

- `orchestrator` must refresh the cache exactly once at the start of every orchestration run when the external source root is readable.
- Treat that refreshed cache as the fixed planning snapshot for the rest of the same orchestration run.
- Do not refresh the cache again inside the same orchestration run unless the user explicitly asks to reload the review wiki and restart planning from that newer snapshot.
- Direct `architect` and `plan-review` runs may use an existing cache without refreshing it.
- If the external source root is permission-blocked or temporarily unreadable but the cache exists, continue with the cache and mention the fallback in the handoff or review note.
- If both the external source root and the cache are unavailable, stop and escalate instead of guessing.

## Responsibility split

- `review-wiki-setup` repairs or bootstraps the external `~/.codex/reviewWiki` link and directory structure.
- `scripts/stage-review-wiki.ps1` and `scripts/stage-review-wiki.sh` copy the external `wiki/` subtree into the workspace cache.
- Planning skills consume the resolved `review_wiki_root` and must not bypass it with hardcoded external-path reads once the root is resolved.
