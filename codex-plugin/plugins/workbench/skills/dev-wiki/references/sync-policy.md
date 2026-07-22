# Dev Wiki Sync Policy

## Safe Operations

- Clone the configured repo when `{dev-wiki-root}/source` is missing.
- Verify the remote origin against config.
- Create missing files and directories.
- Run `git -C "$DEV_WIKI_ROOT/source" status --short`.
- Run `git -C "$DEV_WIKI_ROOT/source" pull --ff-only` only when the user asks to sync, when setup is explicitly repairing a clean behind clone, or when a freshness preflight is explicitly requested after `{dev-wiki-root}/config.json`, the source clone, and the configured project folder are verified.

## Session Start Refresh

The plugin's independent `SessionStart` hook is a narrow exception to the interactive skill workflow. On `startup` and `resume`, it attempts `git pull --ff-only` when `{dev-wiki-root}/source` already exists. A missing source clone is a silent no-op.

The hook does not create configuration, clone or bootstrap a repository, register a workspace, audit repository content, update wiki prose, or regenerate indexes. It does not require a current workspace mapping because it refreshes only the shared central clone.

## Operations Requiring Explicit Approval

- Commit
- Push
- Merge
- Rebase
- Reset
- Clean
- Stash
- Any repair that may hide or rewrite user changes

## Dirty Source Repo

During an interactive skill sync or repair, report dirty files before continuing and require approval for the next Git operation. The `SessionStart` refresh does not stash or rewrite dirty files; it lets Git's fast-forward safety checks decide. If the pull cannot proceed safely, the hook reports a warning and preserves the working tree and local branch.

## Remote Mismatch

If config says one remote and the source clone has another origin, stop and report both values. Do not rewrite the remote automatically.
