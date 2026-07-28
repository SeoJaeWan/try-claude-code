# Dev Wiki Sync Policy

## Main-Only Policy

- Operate only on local `main` tracking `origin/main`.
- Pull explicitly from `origin main`; do not rely on whichever branch happens to be checked out.
- Never inspect, check out, create, merge, rebase, update, or delete another branch as part of dev wiki work.
- Treat a non-`main` checkout, detached `HEAD`, or non-`origin/main` upstream as a blocking mismatch. Report it without switching branches automatically.

## Mandatory Freshness Preflight

Before the first command in an invocation that can change the source clone:

1. Verify config, workspace mapping, and project folder.
2. Verify config uses `"branch": "main"`.
3. Verify the source is the repository root, `origin` matches config, the worktree is clean, the current branch is `main`, and upstream is `origin/main`.
4. Run `node <skill-dir>/scripts/refresh-dev-wiki.mjs --dev-wiki-root "$DEV_WIKI_ROOT"`.
5. Continue only when local `main` is identical to `origin/main`.

Run this once before wiki prose edits, generated index refreshes, lint cleanup, or graph generation. Setup uses `stage-dev-wiki.mjs`, which performs the same refresh before creating or repairing files in an existing clone. A new setup clones `main` with single-branch scope.

## Safe Operations

- Clone the configured repo when `{dev-wiki-root}/source` is missing.
- Verify the remote origin against config.
- Create missing files and directories.
- Run `git -C "$DEV_WIKI_ROOT/source" status --short`.
- Run `git -C "$DEV_WIKI_ROOT/source" pull --ff-only origin main` as the required preflight before a source-changing workflow, or when the user explicitly asks to refresh.

## Session Start Refresh

The plugin's independent `SessionStart` hook is a narrow exception to the interactive skill workflow. On `startup` and `resume`, it attempts `git pull --ff-only origin main` only when `{dev-wiki-root}/source` already exists and is checked out on `main`. A missing source clone is a silent no-op. A different branch produces a warning and is left untouched.

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

During an interactive freshness preflight, report dirty files and stop before running pull or changing wiki files. Require the user to resolve the local changes; do not hide them with stash, reset, clean, or automatic commit. The `SessionStart` refresh does not stash or rewrite dirty files; it lets Git's fast-forward safety checks decide. If the pull cannot proceed safely, the hook reports a warning and preserves the working tree and local branch.

## Remote Mismatch

If config says one remote and the source clone has another origin, stop and report both values. Do not rewrite the remote automatically.
