# Review Wiki Planning Root Contract

Use this contract whenever planning agents need a workspace-local planning root for the review wiki.

## Paths

- External source root: `~/.codex/reviewWiki/wiki`
- Workspace planning root: `./.codex/review-wiki/sync/current`
- Planning-root manifest: `./.codex/review-wiki/sync/current.manifest.json`

Use the platform-appropriate preparation command from `references/platform-commands.md`:

- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.ps1`
- macOS / Linux: `sh ./.codex/skills/review-wiki-setup/scripts/stage-review-wiki.sh`

The workspace planning root always resolves at `./.codex/review-wiki/sync/current`. It may be prepared in one of two modes:

- `snapshot`: copy the external `wiki/` contents into the workspace-local planning root
- `link`: create a live directory link to the external `wiki/` root

After refresh or repair, the planning root is `./.codex/review-wiki/sync/current` itself, so planning agents should find:

- `./.codex/review-wiki/sync/current/registry.json`
- `./.codex/review-wiki/sync/current/core/**`
- `./.codex/review-wiki/sync/current/patterns/**`
- `./.codex/review-wiki/sync/current/_meta/**`

The manifest lives next to the planning root so diagnostics do not modify the external source root when `link` mode is used.

`raw/` is not part of the planning root. In `snapshot` mode it is intentionally omitted, and in `link` mode the root points at `~/.codex/reviewWiki/wiki`. The planning root is read-only execution input, not the source of truth.

## Root resolution order

Resolve the planning `review_wiki_root` in this order:

1. `./.codex/review-wiki/sync/current`

If the workspace planning root is missing, stop and route to `review-wiki-setup` instead of falling back to direct external-path reads in planning skills.

## Freshness policy

- Default to `snapshot` mode when planning agents run in sandboxed environments that may block reads through external link targets.
- Use `link` mode only when the runtime can follow the external vault through `./.codex/review-wiki/sync/current` without bypassing sandbox policy.
- `review-wiki-setup` or an external maintenance step repairs or recreates `./.codex/review-wiki/sync/current` as needed.
- `orchestrator`, `architect`, and `plan-review` consume `./.codex/review-wiki/sync/current` directly and do not perform per-run refresh inside the planning workflow.
- In `snapshot` mode, refresh the workspace planning root after external `wiki/` edits when planning agents need the latest state.
- In `link` mode, edits to the external `wiki/` root appear immediately through `./.codex/review-wiki/sync/current` once the link exists.
- Planning skills may read `current.manifest.json` for diagnostics, but freshness checks are informational unless the user explicitly requests a stricter policy.
- If the workspace planning root is missing, stop and escalate instead of guessing.

## Responsibility split

- `review-wiki-setup` repairs or bootstraps the external `~/.codex/reviewWiki` link and can prepare the workspace planning root in either supported mode.
- External maintenance jobs may recreate `./.codex/review-wiki/sync/current` without involving the planning hot path.
- Planning skills consume the resolved `review_wiki_root` and must not bypass it with hardcoded external-path reads once the root is resolved.
