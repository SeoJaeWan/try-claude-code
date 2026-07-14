# Dev Wiki Staging Contract

## Paths

- Workspace config: `./.codex/dev-wiki/config.json`
- Source Git repository clone: `./.codex/dev-wiki/source`
- Obsidian vault root: `./.codex/dev-wiki/source`
- Project wiki root: `./.codex/dev-wiki/source/{project}`

`{project}` is the exact top-level folder name recorded in `config.json`.

## Config

Use this shape:

```json
{
  "repo": "https://github.com/SeoJaeWan/dev-wiki.git",
  "branch": "main",
  "project": "try-claude-code"
}
```

Missing config means the workspace has not opted in to dev wiki. Only `dev-wiki-setup` should create it.

## Root Resolution

Resolve in this order:

1. Read `./.codex/dev-wiki/config.json`.
2. Use `repo`, `branch`, and `project` from config unless explicit CLI flags override them during setup.
3. Treat `./.codex/dev-wiki/source/{project}` as the project wiki root.

Do not fall back to home-directory links, direct external-path reads, or automatic repo-name matching in non-setup skills.
