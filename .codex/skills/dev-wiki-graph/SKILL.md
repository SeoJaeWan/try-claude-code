---
name: dev-wiki-graph
description: Generate or refresh a project dev wiki graph that summarizes file structure, architecture layers, domain areas, key symbols, representative call flows, and external boundaries. Use when the user asks to build, update, refresh, inspect, or visualize a project graph for dev wiki, or when project navigation should be easier than reading the whole file tree. Requires `.codex/dev-wiki/config.json` and a project folder prepared by `dev-wiki-setup`.
---

# Dev Wiki Graph

Create a useful project map, not a perfect static-analysis engine. The graph should help Codex and developers choose the right files faster before reading source code in detail.

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
   - The v2 generator indexes code with TypeScript syntax AST, prose/config contracts, and project overlay routing.
   - Read generated artifacts and nearby source files when the first pass is still too shallow.
   - Add concise human judgment about domain meaning, layer intent, or important workflows only when the generated `work-routing.md` or `architecture-map.md` misses a project-specific boundary.
   - Keep uncertainty short. Mark obvious dynamic, generated, or framework-convention gaps without over-explaining them.

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
- Prefer concise maps that reveal entry points, domains, layers, key symbols, and representative flows over exhaustive symbol dumps.
