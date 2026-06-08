---
name: plan-wiki-setup
description: Create, verify, bootstrap, or safely synchronize the project-local `.codex/plan-wiki/source` clone of the shared GitHub plan wiki repository, including repair routing when orchestrator fast-forward pull preflight fails because the source clone is dirty, conflicted, behind, diverged, or remote-mismatched. Use when the plan wiki source clone is missing, broken, moved, empty, needs first-time structure setup, or needs plan-wiki sync/repair before planning agents can consume `.codex/plan-wiki/source/wiki`.
---

# Plan Wiki Setup

Use this skill to connect a workspace to the shared plan wiki Git repository, safely synchronize the source clone when orchestration preflight cannot fast-forward, and verify the planning root consumed by planning agents. Read [references/platform-commands.md](references/platform-commands.md), [references/bootstrap-layout.md](references/bootstrap-layout.md), [references/staging-contract.md](references/staging-contract.md), and [references/sync-repair.md](references/sync-repair.md) before editing the filesystem.

## Workflow

1. Resolve the project-local source repo.
   - The Codex-facing source path is always `./.codex/plan-wiki/source`.
   - Read the shared repo and branch from `./.codex/plan-wiki/config.json`.
   - Do not use home-directory links or machine-specific absolute paths as the stable interface.

2. Clone or verify the source repo.
   - Run `node .codex/tools/stage-plan-wiki.mjs` from the workspace root.
   - If `./.codex/plan-wiki/source` is missing, the tool clones the configured GitHub repo.
   - If it exists, verify it is the expected Git repo and remote.
   - If the repo is dirty, report that before running maintenance that may overwrite or conflict with local changes.

3. Bootstrap the source repo structure when explicitly needed.
   - Create `raw/`, `wiki/`, `wiki/core/`, `wiki/patterns/`, `wiki/tags/`, `wiki/_meta/`, `feedback/`, `feedback/inbox/`, `feedback/applied/`, `feedback/rejected/`, `feedback/needs-decision/`, `feedback/stale/`, and `history/` if they do not exist.
   - Seed `wiki/registry.json` if missing.
   - Seed the required core planning documents if missing.
   - Preserve existing user content; do not overwrite populated files without explicit approval.

4. Verify the planning root.
   - Treat `./.codex/plan-wiki/source/wiki` as the planning root.
   - Confirm `./.codex/plan-wiki/source/wiki/registry.json` exists.
   - Confirm `core/`, `patterns/`, `tags/`, and `_meta/` exist under the planning root.
   - Confirm `plan-maker`, `plan-review`, and `orchestrator` can target the same planning root path.

5. Run sync/repair when requested or when orchestrator fast-forward preflight failed.
   - Follow [references/sync-repair.md](references/sync-repair.md).
   - Classify the source repo state as `clean-current`, `clean-behind`, `clean-diverged`, `dirty`, `conflicted`, or `remote-mismatch`.
   - For `clean-current`, verify the planning root and report ready.
   - For `clean-behind`, receive remote changes with `git pull --ff-only`.
   - For `clean-diverged`, do not rebase by default; use a non-destructive merge only after explicit user approval.
   - For `dirty` or `conflicted`, report the exact files and safe next options before any merge, rebase, reset, or stash.
   - For `remote-mismatch`, stop and report the configured remote and actual remote before any Git repair.
   - After any successful sync, verify `./.codex/plan-wiki/source/wiki/registry.json` still exists.

6. Report Git sync state.
   - After setup or bootstrap writes, run `git status --short` inside `./.codex/plan-wiki/source`.
   - Follow [references/platform-commands.md](references/platform-commands.md) Git Sync rules after writes and before any plan wiki commit.
   - For setup/bootstrap, the current operation includes only files changed by setup, bootstrap, or approved sync/repair.
   - The commit target is the plan wiki source repo, not the current project repo.

## Guardrails

- Do not recreate legacy sync-link directories; planning agents read `./.codex/plan-wiki/source/wiki` directly.
- Do not point planning skills at `raw/`, `feedback/`, or `history/`; those are source-maintenance roots.
- Do not overwrite existing wiki documents just to match a new template.
- Do not scatter environment-specific absolute paths throughout other skills.
- Do not continue if the source repo remote does not match `./.codex/plan-wiki/config.json`.
- Do not skip verification after clone or bootstrap.
- Do not merge, rebase, reset, clean, or stash a dirty plan wiki source repo without explicit user approval.
- Do not push plan wiki sync/repair results unless the user explicitly approves a push.

## Reference

- Read [references/platform-commands.md](references/platform-commands.md) for the platform-neutral Node setup command and Git sync commands.
- Read [references/bootstrap-layout.md](references/bootstrap-layout.md) for the initial directory and document set.
- Read [references/staging-contract.md](references/staging-contract.md) for the planning root contract.
- Read [references/history-model.md](references/history-model.md) when setup, lint, ingest, or feedback operations need the shared operation history schema.
- Read [references/sync-repair.md](references/sync-repair.md) for the safe receive/merge repair unit used after orchestrator fast-forward preflight failure.
