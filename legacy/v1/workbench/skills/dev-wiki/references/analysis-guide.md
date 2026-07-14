# Dev Wiki Graph Analysis Guide

## First Pass

Use the script for a broad map:

```bash
DEV_WIKI_ROOT="${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki"
node <skill-dir>/scripts/generate-dev-wiki-graph.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"
```

The script scans:

- JS/TS/MJS/CJS/CTS/MTS files with TypeScript syntax AST parsing, without type-checking
- Markdown, package manifests, hook config, plugin manifests, workflow files, common config files, image assets, and font assets
- imports, exports, symbol declarations, direct call expressions, routes, tests, package scripts, dependency declarations, env references, URL references, and external package references

## Human Pass

After generation, improve the Markdown files when source context makes the map clearer:

- Check `quality-signals.md` first. If there are stale files, noisy generated files, parse diagnostics, or unresolved local imports, fix scanner exclusions or fact extraction before hand-editing Markdown.
- Do not add project-specific domain, layer, owner, product, or business rules to the generator.
- Clarify dependency direction only from observed imports, tests, scripts, routes, config files, or explicit source docs.
- Add human-written wiki prose outside the generator when a team wants subjective names for areas.
- Remove noisy symbols by improving scanner exclusions before manually deleting rows.
- Mark generated code or framework conventions briefly when they affect trust.

## Scope

Prefer a useful map over exhaustive analysis:

- Include key entry points.
- Include important symbols and components.
- Include representative call flows.
- Include rough impact and fact-based starting point maps.
- Include env, DB, auth, storage, and external API boundaries.
- Include image and font assets as inventory facts. SVG files may be read as text; binary image/font contents should not be read.
- Keep generated artifacts short enough to read before implementation.

## Common Blind Spots

Do not over-explain these, but note them when they matter:

- Dynamic imports
- Callback props
- Event bus or pub/sub
- Dependency injection
- Framework file conventions
- Generated code
- Barrel exports
- Path aliases
- Runtime env and deployment config
