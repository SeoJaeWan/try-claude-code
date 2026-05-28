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
- confirm `./.codex/plan-wiki/source/wiki/core/`, `patterns/`, `tags/`, and `_meta/` exist
- confirm `./.codex/plan-wiki/source/raw/`, `feedback/`, and `history/` exist

## Git Sync

Plan wiki maintenance skills write to the nested source repo. Before committing, inspect the plan wiki source repo state and keep the commit boundary limited to the current operation.

- Commit only plan wiki files created, modified, deleted, or moved by the current operation.
- Do not include unrelated dirty files already present in `./.codex/plan-wiki/source`.
- Keep current-project repo changes and plan wiki source repo changes in separate commits.
- Report the files included in the plan wiki commit before committing.
- Push only after explicit user approval.
