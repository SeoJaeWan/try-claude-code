# Plan Wiki Setup Commands

## Path Contract

- Source Git repository clone: `./.codex/plan-wiki/source`
- Planning root: `./.codex/plan-wiki/source/wiki`
- Config file: `./.codex/plan-wiki/config.json`

The same workspace-local paths are used on macOS, Windows, and Linux. Platform-specific absolute paths are not part of the plan wiki contract.

## Setup

Prepare or verify the source clone:

```text
node .codex/tools/stage-plan-wiki.mjs
```

The command reads `./.codex/plan-wiki/config.json`, clones the configured GitHub repo into `./.codex/plan-wiki/source` when missing, verifies the remote when present, and checks the required plan wiki structure.

Use an explicit source root only for migration or diagnostics:

```text
node .codex/tools/stage-plan-wiki.mjs --source-root <path>
```

## Verification

After setup:

- confirm `./.codex/plan-wiki/source/.git` exists
- confirm `./.codex/plan-wiki/source/wiki/registry.json` exists
- confirm `./.codex/plan-wiki/source/wiki/core/`, `patterns/`, `generated/`, and `_meta/` exist
- confirm `./.codex/plan-wiki/source/raw/`, `feedback/`, and `history/` exist

## Git Sync

Plan wiki maintenance skills write to the nested source repo. Before committing, inspect the plan wiki source repo state and keep the commit boundary limited to the current operation.
This section is the source of truth for plan wiki source repo Git safety; other plan-wiki skills should link here instead of duplicating the full policy.

- Commit only plan wiki files created, modified, deleted, or moved by the current operation.
- Do not include unrelated dirty files already present in `./.codex/plan-wiki/source`.
- Keep current-project repo changes and plan wiki source repo changes in separate commits.
- After setup or maintenance writes, run `git -C .codex/plan-wiki/source status --short` and report the changed plan wiki files.
- Report the files included in the plan wiki commit before committing.
- Push only after explicit user approval.

## Sync/Repair After Fast-Forward Failure

When orchestration preflight cannot run `git -C .codex/plan-wiki/source pull --ff-only`, inspect and classify the nested repo before receiving upstream changes:

```text
git -C .codex/plan-wiki/source status --short --branch
git -C .codex/plan-wiki/source fetch origin
git -C .codex/plan-wiki/source log --oneline --decorate --left-right HEAD...origin/main
```

- If the worktree is clean and only behind, run `git -C .codex/plan-wiki/source pull --ff-only`.
- If the worktree is clean and diverged, ask for explicit approval before running `git -C .codex/plan-wiki/source merge --no-ff origin/main`.
- If the worktree is dirty or conflicted, do not merge or rebase. Report the exact files and ask whether to commit, stash, discard selected files, or pause.
- Do not push sync/repair results without explicit user approval.

Read `references/sync-repair.md` for the full state classification and completion report.
