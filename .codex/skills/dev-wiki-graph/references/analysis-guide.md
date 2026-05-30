# Dev Wiki Graph Analysis Guide

## First Pass

Use the script for a broad map:

```bash
node .codex/skills/dev-wiki-graph/scripts/generate-dev-wiki-graph.mjs
```

The script scans:

- JS/TS/MJS/CJS files with TypeScript syntax AST parsing, without type-checking
- `SKILL.md`, agent Markdown, hook config, plugin manifest, package manifest, and CI workflow files
- imports, exports, symbol declarations, direct call expressions, routes, tests, external boundary clues, and artifact/workflow routing rules

It also applies project profile overlay rules to infer domain, layer, and owner.

## Human Pass

After generation, improve the Markdown files when source context makes the map clearer:

- Check `quality-signals.md` first. If there are stale files, missing skill/hook nodes, or high unknown ratios, fix the generator/profile before hand-editing Markdown.
- Name domain areas only when project profile rules cannot express them yet.
- Clarify architecture layers and dependency direction when `architecture-map.md` is too broad.
- Add representative flows that matter for development when `work-routing.md` misses them.
- Remove noisy symbols by improving scanner exclusions before manually deleting rows.
- Mark generated code or framework conventions briefly when they affect trust.

## Scope

Prefer a useful map over exhaustive analysis:

- Include key entry points.
- Include important symbols and components.
- Include representative call flows.
- Include rough impact and work-routing maps.
- Include env, DB, auth, storage, and external API boundaries.
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
