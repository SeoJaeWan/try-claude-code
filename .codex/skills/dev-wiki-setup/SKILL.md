---
name: dev-wiki-setup
description: Create, verify, bootstrap, or safely synchronize the project-local `.codex/dev-wiki/source` clone of the private `SeoJaeWan/dev-wiki` repository, including Obsidian vault defaults and a top-level project folder. Use when a project should opt in to dev wiki, when `.codex/dev-wiki/config.json` is missing or stale, when the dev wiki source clone is missing or remote-mismatched, or before `dev-wiki-update` and `dev-wiki-graph` need a verified project wiki root.
---

# Dev Wiki Setup

Prepare the project-local dev wiki clone and the project folder inside it. The dev wiki is independent from the plan wiki: plan wiki stores shared planning rules, while dev wiki stores project-specific development conventions, architecture notes, workflows, and graph artifacts.

## Required Reading

Read these references before editing the filesystem:

1. [references/staging-contract.md](references/staging-contract.md)
2. [references/bootstrap-layout.md](references/bootstrap-layout.md)
3. [references/sync-policy.md](references/sync-policy.md)

## Workflow

1. Resolve the workspace-local config.
   - The stable config path is `./.codex/dev-wiki/config.json`.
   - If the config is missing and the user did not ask to set up dev wiki, treat the project as not opted in.
   - If this skill was invoked to opt in, create or update the config through `scripts/stage-dev-wiki.mjs`.

2. Prepare the source clone.
   - Run `node .codex/skills/dev-wiki-setup/scripts/stage-dev-wiki.mjs` from the workspace root.
   - Use `--project <name>` when the project folder name must be explicit.
   - Use `--repo https://github.com/SeoJaeWan/dev-wiki.git` and `--branch main` only when overriding config or defaults.
   - The script clones or verifies `./.codex/dev-wiki/source`.

3. Bootstrap the dev wiki vault.
   - Ensure `.obsidian/`, `_meta/`, and the configured project folder exist.
   - Ensure the project has `README.md`, `project.json`, `conventions/`, `architecture/`, `workflows/`, `graph/`, and `generated/`.
   - Create missing default documents only when absent. Do not overwrite populated documents.

4. Verify the nested repo state.
   - Run `git -C .codex/dev-wiki/source status --short`.
   - Report any dirty files in the dev wiki repo separately from the current project repo.
   - Commit and push only after explicit user approval.

## Guardrails

- Do not make projects use dev wiki implicitly. Missing `.codex/dev-wiki/config.json` means dev wiki is not enabled.
- Do not create a `history/` directory. Git commits are the change history.
- Do not create manual tag index directories. Tags and links are derived by `dev-wiki-lint` into `{project}/generated/`.
- Do not merge, rebase, reset, clean, stash, or push the dev wiki source repo without explicit user approval.
- Do not store machine-specific absolute paths in config or wiki documents.
- Do not point downstream skills at `plan-wiki`; this setup prepares only `dev-wiki`.
- Preserve existing user-authored wiki content.
