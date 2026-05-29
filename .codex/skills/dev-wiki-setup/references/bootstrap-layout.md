# Dev Wiki Bootstrap Layout

## Source Root

Create these source-level entries when missing:

- `.obsidian/`
- `_meta/`
- `README.md`
- `_meta/projects.json`
- `_meta/schema.md`

Do not create `history/`; Git commits are the history.

## Project Root

Create this project structure when missing:

```text
{project}/
  README.md
  project.json
  conventions/
    README.md
    coding.md
    naming.md
    folder-structure.md
    testing.md
  architecture/
    README.md
    overview.md
    layers.md
    module-boundaries.md
    state.md
    external-boundaries.md
  workflows/
    README.md
    local-dev.md
    commands.md
    test-and-quality.md
  graph/
    README.md
```

Optional files such as `conventions/ui.md`, `conventions/api.md`, `conventions/data.md`, and `workflows/release.md` should be created lazily when the project needs them.

## Obsidian Defaults

Seed minimal `.obsidian` JSON files when missing:

- `app.json`
- `appearance.json`
- `core-plugins.json`
- `graph.json`

Keep the vault root at the dev wiki source root so Obsidian can show relationships across project folders and `_meta`.

## Content Rule

Default project documents are placeholders for current project knowledge. They should invite updates but not pretend to know rules that have not been recorded yet.
