# Dev Wiki Graph Contract

## Purpose

The graph is a navigation map for development. It should reduce first-pass file-tree reading and point Codex toward observed folders, files, module relationships, tests, scripts, routes, config files, image/font assets, and external boundaries.

It is not a complete runtime model.

The graph deliberately avoids compiler and language-parser dependencies. It does not claim symbol-level ownership, function-call relationships, type correctness, or complete syntax validation.

Module relationships are limited to literal specifiers in static imports, re-exports, `require(...)`, and dynamic `import(...)`. Ignore source-looking text in JSX and template literals, but scan JavaScript expressions embedded in JSX `{...}` and template `${...}`. Enable JSX boundary scanning for `.js`, `.mjs`, `.cjs`, `.jsx`, and `.tsx`; keep it disabled for `.ts`, `.mts`, and `.cts` so TypeScript generic syntax remains code. Do not infer computed module paths.

The graph is facts-first. It records observed repository structure and static relationships. It does not assign subjective `domain`, `layer`, or `owner` classifications.

## Required Outputs

Write these files under `{project}/graph/`:

- `overview.md`
- `architecture-map.md`
- `symbol-map.md`
- `call-map.md`
- `impact-map.md`
- `work-routing.md`
- `external-boundaries.md`
- `quality-signals.md`
- `graph.json`
- `graph.mmd`

## `graph.json` Minimum Shape

```json
{
  "schema_version": 3,
  "project": "example-project",
  "generated_at": "2026-05-29T00:00:00.000Z",
  "source_commit": "abc123",
  "source_dirty": false,
  "source_status_count": 0,
  "nodes": [],
  "edges": [],
  "indexes": {},
  "work_routing": [],
  "metrics": {},
  "quality": {},
  "notes": []
}
```

## Node Kinds

Use these kinds when applicable:

- `folder`
- `file`
- `hook`
- `route`
- `test`
- `script`
- `dependency`
- `config`
- `workflow`
- `asset`
- `skill`
- `agent`
- `plugin`
- `external`

## Edge Kinds

Use these edge kinds when applicable:

- `contains`
- `imports`
- `exports`
- `defines`
- `defines_script`
- `declares_dependency`
- `references`
- `handles_route`
- `tests`
- `uses_skill`
- `depends_on_external`
- `reads_env`

## Required Indexes

`graph.json.indexes` should include rough query material useful before implementation:

- `imports_reverse`: reverse import index keyed by file node id
- `tests_reverse`: reverse test index keyed by source file node id
- `file_impact`: rough reverse-import impact radius keyed by file node id

`callers` and `callees` may remain as empty compatibility fields for existing consumers. They must not be presented as analyzed call data.

These indexes are navigation aids, not complete semantic analysis.

## Work Routing

`work-routing.md` should map observed repository facts to starting points:

- discovered docs and project instruction files
- package scripts that look like verification commands
- test files and their import targets
- route files
- config files
- skills, hooks, plugins, workflows, and other explicit tool contracts

Keep routing factual. It should answer "what exists, and where should I start looking?" rather than guarantee ownership or business meaning.

## Quality Signals

`quality-signals.md` should report:

- stale or missing indexed files
- excluded vendor/generated/large files
- resolved and unresolved local imports
- dynamic imports, unresolved module references, and the absence of full parser diagnostics
- indexed package scripts, routes, tests, skills, hooks, workflows, config files, env references, and external package references
- indexed image and font assets by file path, extension, and size; do not read binary asset contents
- warnings when observed facts are incomplete because of scanner limits

## Confidence

Edges may include `confidence`:

- `direct`: observed from direct syntax or path convention
- `inferred`: likely based on naming, path, or local evidence
- `unknown`: known gap or unresolved target

Keep uncertainty concise.
