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

Missing config or missing workspace mapping means the workspace has not opted in to dev-wiki setup and maintenance. Only setup should create or register it. A downstream consumer may still read an existing exact `source/{workspace-basename}` project folder when its `project.json` is unambiguous; that read does not register the workspace or change dev-wiki state.

## Root Resolution

Resolve in this order:

1. Resolve `{dev-wiki-root}` from `--dev-wiki-root` or `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`.
2. Read `{dev-wiki-root}/config.json`.
3. Read `{dev-wiki-root}/workspaces.json` and resolve the current workspace to `{project}`.
4. Use `repo` and `branch` from config unless explicit CLI flags override them during setup.
5. Treat `{dev-wiki-root}/source/{project}` as the project wiki root.

For legacy projects only, existing `./.codex/dev-wiki/config.json` may be used as a fallback. Do not create new project-local `.codex/dev-wiki` directories by default.
