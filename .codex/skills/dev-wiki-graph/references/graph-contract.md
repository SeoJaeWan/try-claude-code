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
- `impact-map.md`
- `work-routing.md`
- `external-boundaries.md`
- `quality-signals.md`
- `graph.json`
- `graph.mmd`

## `graph.json` Minimum Shape

```json
{
  "schema_version": 2,
  "project": "try-claude-code",
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
- `symbol`
- `component`
- `hook`
- `type`
- `route`
- `test`
- `skill`
- `agent`
- `plugin`
- `domain`
- `layer`
- `owner`
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
- `uses_skill`
- `belongs_to_owner`
- `belongs_to_domain`
- `belongs_to_layer`
- `depends_on_external`
- `reads_env`

## Required Indexes

`graph.json.indexes` should include rough query material useful before implementation:

- `callers`: reverse call index keyed by symbol/file node id
- `callees`: forward call index keyed by symbol/file node id
- `imports_reverse`: reverse import index keyed by file node id
- `file_impact`: rough reverse-import impact radius keyed by file node id

These indexes are syntax/navigation aids, not complete semantic analysis.

## Work Routing

`work-routing.md` should map common user request categories to:

- trigger words or phrases
- first documents/files to read
- likely edit candidates
- likely verification commands or manual checks

Keep routing rough but actionable. It should answer "where should I start looking?" rather than guarantee exact ownership.

## Quality Signals

`quality-signals.md` should report:

- stale or missing indexed files
- unknown/shared classification ratio
- excluded vendor/generated/large files
- whether SKILL.md and hook configs were indexed
- warnings when generated graph quality is too low for navigation

## Confidence

Edges may include `confidence`:

- `direct`: observed from direct syntax or path convention
- `inferred`: likely based on naming, path, or local evidence
- `unknown`: known gap or unresolved target

Keep uncertainty concise.
