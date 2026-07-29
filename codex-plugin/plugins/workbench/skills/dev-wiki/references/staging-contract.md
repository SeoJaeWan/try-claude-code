# Dev Wiki Staging Contract

## Paths

- Dev wiki root: `${CODEX_HOME:-~/.codex}/workbench/dev-wiki` by default, or `--dev-wiki-root <path>` when explicitly provided.
- Central config: `{dev-wiki-root}/config.json`
- Workspace mapping: `{dev-wiki-root}/workspaces.json`
- Source Git repository clone: `{dev-wiki-root}/source`
- Obsidian vault root: `{dev-wiki-root}/source`
- Project wiki root: `{dev-wiki-root}/source/{project}`

`{project}` is the top-level folder name recorded for the current workspace in `workspaces.json`, or the explicit `--project` value used during setup.

## Config

Use this shape:

```json
{
  "repo": "https://github.com/SeoJaeWan/dev-wiki.git",
  "branch": "main"
}
```

`branch` is a compatibility field with one valid value: `main`. It is not a user-selectable branch. Setup may normalize a stale config to `main` only after verifying that an existing source clone is already on clean `main`; it must never switch an existing clone automatically.

Use this workspace mapping shape:

```json
{
  "workspaces": {
    "/absolute/workspace/path": {
      "project": "try-claude-code",
      "updatedAt": "2026-06-30T00:00:00.000Z"
    }
  }
}
```

Missing config or missing workspace mapping means the workspace has not opted in to project-scoped dev-wiki setup and maintenance. Only setup should create or register it. This does not block a whole-bundle refresh of the existing central `source` clone, which does not resolve a project. A downstream consumer may still read an existing exact `source/{workspace-basename}` project folder when its `project.json` is unambiguous; that read does not register the workspace or change dev-wiki state.

## Root Resolution

For a whole-bundle refresh, resolve `{dev-wiki-root}`, read `config.json`, require `branch` to be `main`, and operate on `{dev-wiki-root}/source`. Do not read or require `workspaces.json`.

For project-scoped work, resolve in this order:

1. Resolve `{dev-wiki-root}` from `--dev-wiki-root` or `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`.
2. Read `{dev-wiki-root}/config.json`.
3. Read `{dev-wiki-root}/workspaces.json` and resolve the current workspace to `{project}`.
4. Use `repo` from config unless an explicit setup flag overrides it. Require `branch` to be `main`.
5. Treat `{dev-wiki-root}/source/{project}` as the project wiki root.

Before changing an existing source clone during setup, verify a clean worktree, matching `origin`, local `main`, and upstream `origin/main`, then run `git pull --ff-only origin main`. When cloning, use only `main`. Ignore all other local and remote branches.

For legacy projects only, existing `./.codex/dev-wiki/config.json` may be used as a fallback. Do not create new project-local `.codex/dev-wiki` directories by default.
