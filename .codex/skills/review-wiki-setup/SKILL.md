---
name: review-wiki-setup
description: Create or verify the `~/.codex/reviewWiki` link to the Obsidian review wiki vault, bootstrap the required `raw/` and `wiki/` structure, and maintain the workspace planning root at `./.codex/review-wiki/sync/current` in either snapshot mode or optional live-link mode. Use when the review wiki link is missing, broken, moved, the vault needs first-time setup, or the workspace planning root needs to be created, repaired, refreshed, or switched between sandbox-safe snapshot behavior and link-based behavior for planning agents.
---

# Review Wiki Setup

Use this skill to connect Codex to the Obsidian vault, create the minimum review wiki structure, and maintain the workspace planning root consumed by planning agents. Read [references/platform-commands.md](references/platform-commands.md), [references/bootstrap-layout.md](references/bootstrap-layout.md), and [references/staging-contract.md](references/staging-contract.md) before editing the filesystem.

## Workflow

1. Resolve the actual vault path.
   - Use the real Obsidian vault path for this machine.
   - Treat the actual vault path as environment-specific input.
   - The Codex-facing path is always `~/.codex/reviewWiki`.

2. Create or verify the `~/.codex/reviewWiki` link.
   - Use the platform-appropriate link command from the reference file.
   - If a broken link or wrong target already exists, fix that first.
   - Do not continue bootstrapping against the wrong root.

3. Bootstrap the vault structure.
   - Create `raw/`, `wiki/`, `wiki/core/`, `wiki/patterns/`, and `wiki/_meta/` if they do not exist.
   - Seed `wiki/registry.json` if missing.
   - Seed the core planning documents if missing.
   - Preserve existing user content; do not overwrite populated files without explicit approval.

4. Refresh or repair the workspace planning root when requested.
   - Run the platform-appropriate preparation command from `references/platform-commands.md` from the workspace root.
   - On Windows, use `stage-review-wiki.ps1`.
   - On macOS / Linux, use `stage-review-wiki.sh`.
   - Default to `snapshot` mode so planning agents can read a workspace-local copy even when sandboxing blocks external link targets.
   - Use `link` mode only when the runtime can safely read through a workspace link to the external `wiki/` root and the user wants immediate propagation of external edits.
   - After preparation, treat `./.codex/review-wiki/sync/current/` itself as the planning root that contains `registry.json`, `core/`, `patterns/`, and `_meta/`.
   - Write `./.codex/review-wiki/sync/current.manifest.json` next to the planning root with the source root, destination root, mode, optional link type, and preparation timestamp.
   - Treat the workspace planning root as read-only execution input; the source of truth remains `~/.codex/reviewWiki`.

5. Verify the bootstrap and planning root.
   - Confirm the link resolves to the expected vault.
   - Confirm the required folders, registry, and core documents exist.
   - Confirm `architect`, `plan-review`, and `orchestrator` can target the same workspace planning root path.
   - If the workspace planning root was refreshed, confirm `./.codex/review-wiki/sync/current/registry.json` exists and `./.codex/review-wiki/sync/current.manifest.json` records the expected mode.

## Guardrails

- Do not point `~/.codex/reviewWiki` at the wrong vault.
- Do not overwrite existing wiki documents just to match a new template.
- Do not scatter environment-specific absolute paths throughout other skills; the link is the stable interface.
- Do not treat the workspace planning root as the source of truth or edit the workspace path instead of the external wiki.
- Do not switch to `link` mode when the runtime sandbox cannot read external link targets through the workspace path.
- Do not write diagnostics into `./.codex/review-wiki/sync/current` when it is prepared in `link` mode.
- Do not write the workspace planning root outside the active workspace.
- Do not use the workspace planning root as a substitute for repairing a broken or missing `~/.codex/reviewWiki` link.
- Do not skip verification after link creation or planning-root refresh.

## Reference

- Read [references/platform-commands.md](references/platform-commands.md) for Windows, macOS, and Linux link and planning-root commands.
- Read [references/bootstrap-layout.md](references/bootstrap-layout.md) for the initial directory and document set.
- Read [references/staging-contract.md](references/staging-contract.md) for the workspace planning root contract and link rules.
