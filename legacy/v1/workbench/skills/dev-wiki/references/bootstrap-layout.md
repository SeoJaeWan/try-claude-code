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
    folder-structure.md
    naming.md
    testing.md
    api.md
    ui.md
    rule-application.md
  architecture/
    README.md
    overview.md
    layers.md
    module-boundaries.md
    state.md
    external-boundaries.md
  workflows/
    README.md
    commands.md
    local-dev.md
    test-and-quality.md
    git.md
    release.md
  graph/
    README.md
  generated/
    .gitkeep
```

Use these standard file names for every project. If a project has no applicable rule yet, keep the file with placeholder prose such as "아직 기록된 규칙이 없습니다." or "해당 없음".

Project-specific extra documents may be added when needed, but they must not replace the standard file names above.

## Obsidian Defaults

Seed minimal `.obsidian` JSON files when missing:

- `app.json`
- `appearance.json`
- `core-plugins.json`
- `graph.json`

Keep the vault root at the dev wiki source root so Obsidian can show relationships across project folders and `_meta`.

## Content Rule

Default project documents are placeholders for current project knowledge. They should invite updates but not pretend to know rules that have not been recorded yet.

## Generated Output

`generated/` is owned by `dev-wiki-lint` and stores derived indexes, link graphs, health reports, and normalization proposals. Do not hand-edit generated files or create manual tag indexes beside them.
