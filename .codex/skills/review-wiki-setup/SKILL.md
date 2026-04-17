---
name: review-wiki-setup
description: Create or verify the `~/.codex/reviewWiki` link to the Obsidian review wiki vault, bootstrap the required `raw/` and `wiki/` structure, and stage a workspace-local planning cache. Use when the review wiki link is missing, broken, moved, the vault needs first-time setup on Windows, macOS, or Linux, or planning agents need a repo-local cache because they cannot read the external vault directly.
---

# Review Wiki Setup

Use this skill to connect Codex to the Obsidian vault, create the minimum review wiki structure, and stage a workspace-local planning cache when needed. Read [references/platform-commands.md](references/platform-commands.md), [references/bootstrap-layout.md](references/bootstrap-layout.md), and [references/staging-contract.md](references/staging-contract.md) before editing the filesystem.

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

4. Stage the planning cache when requested or when planning agents cannot read the external vault directly.
   - Run the platform-appropriate staging command from `references/platform-commands.md` from the workspace root.
   - On Windows, use `stage-review-wiki.ps1`.
   - On macOS / Linux, use `stage-review-wiki.sh`.
   - Copy the contents of the external `wiki/` root into `./.codex/cache/review-wiki/current/`.
   - After staging, treat `./.codex/cache/review-wiki/current/` itself as the planning root that contains `registry.json`, `core/`, `patterns/`, and `_meta/`.
   - Write `staged.json` with the source root, destination root, and staging timestamp.
   - Treat the staged cache as read-only execution input; the source of truth remains `~/.codex/reviewWiki`.

5. Verify the bootstrap and staging.
   - Confirm the link resolves to the expected vault.
   - Confirm the required folders, registry, and core documents exist.
   - Confirm `architect`, `ingest`, and `lint` can target the same root path.
   - If a workspace cache was staged, confirm `./.codex/cache/review-wiki/current/registry.json` exists and matches the staging contract.

## Guardrails

- Do not point `~/.codex/reviewWiki` at the wrong vault.
- Do not overwrite existing wiki documents just to match a new template.
- Do not scatter environment-specific absolute paths throughout other skills; the link is the stable interface.
- Do not treat the staged cache as the source of truth or edit the cache instead of the external wiki.
- Do not write the staged cache outside the active workspace.
- Do not use staging as a substitute for repairing a broken or missing link.
- Do not skip verification after link creation or staging.

## Reference

- Read [references/platform-commands.md](references/platform-commands.md) for Windows, macOS, and Linux link commands.
- Read [references/bootstrap-layout.md](references/bootstrap-layout.md) for the initial directory and document set.
- Read [references/staging-contract.md](references/staging-contract.md) for the planning-cache path contract and staging rules.
