# Dev Wiki Sync Policy

## Safe Operations

- Clone the configured repo when `{dev-wiki-root}/source` is missing.
- Verify the remote origin against config.
- Create missing files and directories.
- Run `git -C "$DEV_WIKI_ROOT/source" status --short`.
- Run `git -C "$DEV_WIKI_ROOT/source" pull --ff-only` only when the user asks to sync, when setup is explicitly repairing a clean behind clone, or when a freshness preflight is explicitly requested after `{dev-wiki-root}/config.json`, the source clone, and the configured project folder are verified.

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

If the dev wiki source repo is dirty, report the changed files before sync or repair. Continue only with non-destructive verification and missing-file bootstrap unless the user approves the next Git operation.

## Remote Mismatch

If config says one remote and the source clone has another origin, stop and report both values. Do not rewrite the remote automatically.
