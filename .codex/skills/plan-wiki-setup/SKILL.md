---
name: plan-wiki-setup
description: Create or verify the `~/.codex/planWiki` link to the Obsidian plan wiki vault, bootstrap the required `raw/` and `wiki/` structure, and maintain the workspace planning root at `./.codex/plan-wiki/sync/current` as a live link to the external `wiki/` root for planning agents. Use when the plan wiki link is missing, broken, moved, the vault needs first-time setup, or the workspace planning root needs to be created, repaired, or refreshed.
---

# Plan Wiki Setup

Use this skill to connect Codex to the Obsidian vault, create the minimum plan wiki structure, and maintain the workspace planning root consumed by planning agents. Read [references/platform-commands.md](references/platform-commands.md), [references/bootstrap-layout.md](references/bootstrap-layout.md), and [references/staging-contract.md](references/staging-contract.md) before editing the filesystem.

## Workflow

1. Resolve the actual vault path.
   - Use the real Obsidian vault path for this machine.
   - Treat the actual vault path as environment-specific input.
   - The Codex-facing path is always `~/.codex/planWiki`.

2. Create or verify the `~/.codex/planWiki` link.
   - Use the platform-appropriate link command from the reference file.
   - If a broken link or wrong target already exists, fix that first.
   - Do not continue bootstrapping against the wrong root.

3. Bootstrap the vault structure.
   - Create `raw/`, `wiki/`, `wiki/core/`, `wiki/patterns/`, `wiki/tags/`, `wiki/_meta/`, `feedback/`, `feedback/inbox/`, `feedback/applied/`, `feedback/rejected/`, `feedback/needs-decision/`, `feedback/stale/`, and `history/` if they do not exist.
   - Seed `wiki/registry.json` if missing.
   - Seed the core planning documents if missing.
   - Preserve existing user content; do not overwrite populated files without explicit approval.

4. Refresh or repair the workspace planning root when requested.
   - Run the platform-neutral preparation command from `references/platform-commands.md` from the workspace root.
   - Use `node .codex/tools/stage-plan-wiki.mjs` on Windows, macOS, and Linux.
   - Prepare `./.codex/plan-wiki/sync/current` as a live link to the external `wiki/` root.
   - If the runtime cannot safely read through a workspace link to the external `wiki/` root, stop and report that blocker instead of creating a copied fallback.
   - After preparation, treat `./.codex/plan-wiki/sync/current/` itself as the planning root that contains `registry.json`, `core/`, `patterns/`, `tags/`, and `_meta/`.
   - Treat the workspace planning root as read-only execution input; the source of truth remains `~/.codex/planWiki`.

5. Verify the bootstrap and planning root.
   - Confirm the link resolves to the expected vault.
   - Confirm the required folders, registry, and core documents exist.
   - Confirm `architect`, `plan-review`, and `orchestrator` can target the same workspace planning root path.
   - If the workspace planning root was refreshed, confirm `./.codex/plan-wiki/sync/current/registry.json` exists.
   - Confirm the workspace planning root link resolves to `~/.codex/planWiki/wiki`.

## Guardrails

- Do not point `~/.codex/planWiki` at the wrong vault.
- Do not overwrite existing wiki documents just to match a new template.
- Do not scatter environment-specific absolute paths throughout other skills; the link is the stable interface.
- Do not treat the workspace planning root as the source of truth or edit the workspace path instead of the external wiki.
- Do not create or preserve a copied fallback for `./.codex/plan-wiki/sync/current`; this planning root is link-only.
- Do not continue if the runtime cannot read external link targets through the workspace path.
- Do not write diagnostics into `./.codex/plan-wiki/sync/current` when it is prepared in `link` mode.
- Do not write the workspace planning root outside the active workspace.
- Do not use the workspace planning root as a substitute for repairing a broken or missing `~/.codex/planWiki` link.
- Do not skip verification after link creation or planning-root refresh.

## Reference

- Read [references/platform-commands.md](references/platform-commands.md) for the platform-neutral Node staging command and optional first-time vault link commands.
- Read [references/bootstrap-layout.md](references/bootstrap-layout.md) for the initial directory and document set.
- Read [references/staging-contract.md](references/staging-contract.md) for the workspace planning root contract and link rules.
