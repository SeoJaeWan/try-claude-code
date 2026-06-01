---
name: dev-wiki-graph
description: Generate or refresh a project dev wiki graph from repository facts: folders, files, imports, exports, symbols, tests, routes, scripts, dependencies, config files, image/font assets, env references, and external boundaries. Use when the user asks to build, update, refresh, inspect, or visualize a dev wiki project graph, or when project navigation should be easier than reading the whole file tree. Requires `.codex/dev-wiki/config.json` and a project folder prepared by `dev-wiki-setup`.
---

# Dev Wiki Graph

Create a useful project map, not a perfect static-analysis engine. The graph should help Codex and developers choose the right files faster before reading source code in detail.

The graph is facts-first. Do not add project-specific domains, layers, owners, or business labels to the skill code. If a project has subjective naming needs, keep that outside the generator or add it later as human-written wiki prose.

## Required Reading

Read these references before generating graph artifacts:

1. [references/graph-contract.md](references/graph-contract.md)
2. [references/analysis-guide.md](references/analysis-guide.md)

## Workflow

1. Verify opt-in.
   - Read `./.codex/dev-wiki/config.json`.
   - If it is missing, stop and route to `dev-wiki-setup`; do not infer a project name.
   - Resolve graph output as `./.codex/dev-wiki/source/{project}/graph`.

2. Generate the first-pass graph.
   - Run `node .codex/skills/dev-wiki-graph/scripts/generate-dev-wiki-graph.mjs` from the workspace root.
   - The script writes `overview.md`, `architecture-map.md`, `symbol-map.md`, `call-map.md`, `impact-map.md`, `work-routing.md`, `external-boundaries.md`, `quality-signals.md`, `graph.json`, and `graph.mmd`.
   - Pass `--project <name>` only when overriding the config intentionally.

3. Improve the generated map when useful.
   - The v3 generator indexes repository facts from code, prose, config, package manifests, hooks, skills, tests, routes, image assets, and font assets.
   - Read generated artifacts and nearby source files when the first pass is still too shallow.
   - Improve scanner exclusions or fact extraction when noisy files or missed factual relationships reduce navigation value.
   - Do not patch the generator with project-specific domain, layer, owner, product, or business rules.
   - Keep uncertainty short. Mark dynamic imports, generated files, framework conventions, and unresolved aliases as graph limits, not as classification failures.

4. Verify and report.
   - Run `npm run test:dev-wiki-graph` when the graph generator code changes.
   - Run `git -C .codex/dev-wiki/source status --short`.
   - Summarize graph files changed and notable blind spots.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not claim the call graph is complete.
- Do not let graph generation replace source reading for implementation decisions.
- Do not scan generated dependency folders such as `node_modules`, build outputs, or dev wiki source clones.
- Do not edit plan wiki files.
- Prefer concise maps that reveal observed entry points, file relationships, key symbols, tests, scripts, routes, config files, assets, and external boundaries over exhaustive symbol dumps.
