# Dev Wiki Graph Analysis Guide

## First Pass

Use the script for a broad map:

```bash
node .codex/skills/dev-wiki-graph/scripts/generate-dev-wiki-graph.mjs
```

The script scans common source files, imports, exports, symbol declarations, direct calls, routes, tests, and external boundary clues.

## Human Pass

After generation, improve the Markdown files when source context makes the map clearer:

- Name domain areas that the script can only infer from folders.
- Clarify architecture layers and dependency direction.
- Add representative flows that matter for development.
- Remove noisy symbols that do not help navigation.
- Mark generated code or framework conventions briefly when they affect trust.

## Scope

Prefer a useful map over exhaustive analysis:

- Include key entry points.
- Include important symbols and components.
- Include representative call flows.
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
