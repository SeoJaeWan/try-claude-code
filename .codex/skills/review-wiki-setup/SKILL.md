---
name: review-wiki-setup
description: Create or verify the `~/.codex/reviewWiki` link to the Obsidian review wiki vault, bootstrap the required `raw/` and `wiki/` structure, and seed the initial routing documents for `architect`. Use when the review wiki link is missing, broken, moved, or the vault needs first-time setup on Windows, macOS, or Linux.
---

# Review Wiki Setup

Use this skill to connect Codex to the Obsidian vault and create the minimum review wiki structure. Read [references/platform-commands.md](references/platform-commands.md) and [references/bootstrap-layout.md](references/bootstrap-layout.md) before editing the filesystem.

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
   - Create `raw/`, `wiki/`, and `wiki/_meta/` if they do not exist.
   - Seed `wiki/index.md` if missing.
   - Seed the initial planning documents if missing.
   - Preserve existing user content; do not overwrite populated files without explicit approval.

4. Verify the bootstrap.
   - Confirm the link resolves to the expected vault.
   - Confirm the required folders and routing documents exist.
   - Confirm `architect`, `ingest`, and `lint` can target the same root path.

## Guardrails

- Do not point `~/.codex/reviewWiki` at the wrong vault.
- Do not overwrite existing wiki documents just to match a new template.
- Do not scatter environment-specific absolute paths throughout other skills; the link is the stable interface.
- Do not skip verification after link creation.

## Reference

- Read [references/platform-commands.md](references/platform-commands.md) for Windows, macOS, and Linux link commands.
- Read [references/bootstrap-layout.md](references/bootstrap-layout.md) for the initial directory and document set.
