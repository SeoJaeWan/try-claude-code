# Dev Wiki Graph Contract

## Purpose

The graph is a navigation map for development. It should reduce first-pass file-tree reading and point Codex toward likely entry points, layers, domains, symbols, calls, and external boundaries.

It is not a complete runtime model.

## Required Outputs

Write these files under `{project}/graph/`:

- `overview.md`
- `architecture-map.md`
- `symbol-map.md`
- `call-map.md`
- `external-boundaries.md`
- `graph.json`
- `graph.mmd`

## `graph.json` Minimum Shape

```json
{
  "schema_version": 1,
  "project": "try-claude-code",
  "generated_at": "2026-05-29T00:00:00.000Z",
  "source_commit": "abc123",
  "nodes": [],
  "edges": [],
  "metrics": {},
  "notes": []
}
```

## Node Kinds

Use these kinds when applicable:

- `folder`
- `file`
- `symbol`
- `component`
- `hook`
- `type`
- `route`
- `test`
- `domain`
- `layer`
- `external`

## Edge Kinds

Use these edge kinds when applicable:

- `contains`
- `imports`
- `exports`
- `defines`
- `references`
- `calls`
- `renders`
- `uses_hook`
- `handles_route`
- `tests`
- `belongs_to_domain`
- `belongs_to_layer`
- `depends_on_external`
- `reads_env`

## Confidence

Edges may include `confidence`:

- `direct`: observed from direct syntax or path convention
- `inferred`: likely based on naming, path, or local evidence
- `unknown`: known gap or unresolved target

Keep uncertainty concise.
