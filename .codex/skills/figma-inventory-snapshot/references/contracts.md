# Figma Inventory Snapshot Contracts

## Purpose

Capture Figma node hierarchy evidence as bounded local artifacts so `orchestrator` and `architect` can avoid large direct Figma reads, Code Connect permission traps, and invented classifications.

## Inputs

The controller should provide:

- `task_slug`
- `fileKey`
- `root_nodes`: exact node ids and expected labels when known
- optional `required_paths`: family paths or markers that must be represented
- optional `required_markers`: examples include `Resource`, `iOS`, `Android`, `component-set`, `variant`
- `output_dir`, defaulting to `./.codex/artifacts/figma-inventory/{task_slug}/`

## Authoritative Tools

- Figma tree metadata tools are authoritative for hierarchy, names, ids, node types, and parent/child structure.
- Read-only Figma script inspection may supplement metadata when a required property is not present in metadata output.

## Non-Authoritative Tools

Do not use these as full inventory proof:

- Code Connect mapping, suggestion, or context tools
- code component or Storybook listing tools
- `get_design_context` summaries without tree coverage
- old parity reports or package registries, unless the user explicitly asks to compare them against the snapshot

These sources may be recorded as secondary context, but they cannot close required tree coverage.

## Output Artifacts

Write all outputs under `output_dir`:

- `manifest.json`: one controller-facing manifest for freshness and coverage
- `summary.md`: human-readable source, coverage, and blocker summary
- `snapshots/{safe-node-id}.json`: one compact snapshot per root or shard

`manifest.json` must include:

```json
{
  "schemaVersion": 1,
  "taskSlug": "example-task",
  "fileKey": "figma-file-key",
  "generatedAt": "ISO-8601 timestamp",
  "roots": [
    {
      "nodeId": "16222:137704",
      "expectedName": "2 Element",
      "actualName": "2 Element",
      "snapshotPath": "snapshots/16222-137704.json",
      "status": "ok",
      "fidelity": "full",
      "truncated": false,
      "coverageComplete": true,
      "parentRootId": null,
      "shards": [],
      "incompleteReasons": []
    }
  ],
  "coverage": {
    "requiredRootsRead": true,
    "requiredPaths": [],
    "requiredPathsSeen": [],
    "requiredPathsMissing": [],
    "requiredMarkersSeen": [],
    "truncated": false,
    "coverageComplete": true,
    "incompleteReasons": []
  }
}
```

Allowed root `status` values:

- `ok`: the root snapshot is complete for the current handoff
- `ok_by_shards`: the parent root is covered by child snapshot files listed in `shards`
- `partial_names_only`: only names/path coverage is available; reusable only when the current handoff explicitly accepts names-only coverage for that root or path
- `blocked_timeout`: a required root or shard timed out
- `blocked_truncated`: a required root or shard response was truncated or too large to trust
- `blocked_needs_child_shards`: smaller controller-provided child node ids are required

Allowed `fidelity` values:

- `full`: hierarchy contains the required node fields for the handoff
- `names_only`: hierarchy is intentionally limited to ids, names, types, and paths
- `direct_children`: only the immediate children of the target node are represented
- `sharded`: the parent root is represented by child snapshot files

Each snapshot JSON should include compact nodes with:

- `id`
- `name`
- `type`
- `path`
- `children`
- optional `markers`

Keep raw large MCP responses out of the manifest. Store compact, downstream-usable data only unless a blocker requires a small error excerpt.
Do not store or depend on truncated tool output. A truncated result must produce `blocked_truncated` or a smaller retry before success.

## Freshness

An existing manifest is reusable only when:

- `schemaVersion` is supported
- `fileKey` matches
- every required root node is present with `status = "ok"` or `status = "ok_by_shards"`; `status = "partial_names_only"` is reusable only for roots or paths where the current handoff explicitly accepts names-only coverage
- every sharded required root has all listed shard snapshot files on disk
- no required root or coverage entry has `truncated = true`
- required coverage has `coverageComplete = true`
- `requiredPathsMissing` is empty for paths required by the current handoff
- `requiredMarkersSeen` satisfies the current handoff
- the controller accepts its age for the current planning run

If any condition fails, refresh only the missing or stale root/shard when possible.

## Terminal Results

On success:

```text
result = wrote_snapshot
task_slug = {task_slug}
manifest_path = ./.codex/artifacts/figma-inventory/{task_slug}/manifest.json
written_paths = [...]
```

On missing tool/data:

```text
result = blocking_packet
task_slug = {task_slug}
needs_user_input = false
blocker_type = tool_data_blocker
blocker = {short reason}
required_data = [...]
next_action = {specific missing root/path/tool action}
```

Use `needs_user_input = true` only when the missing item is a user decision such as the intended root node list, not when Figma access, timeout, or tool coverage failed.
