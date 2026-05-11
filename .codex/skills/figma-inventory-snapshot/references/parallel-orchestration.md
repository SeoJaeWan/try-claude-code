# Parallel Orchestration

Use this reference when a Figma URL or root may be too large for one bounded read, or when the user explicitly asks for multi-agent capture. This mode is topology-driven: discover the file shape first, then create shards from actual Figma nodes.

## Discovery First

- Parse the Figma URL into `fileKey` and optional `nodeId`.
- Use a bounded names-only or direct-children discovery pass for the provided node or page.
- Do not measure size by recursively reading the whole file, page, section, or component tree.
- Estimate shard size from direct child count, node type, component-set markers, prior truncation, timeout behavior, and required path coverage.
- If the target is clearly small, run the normal single-controller workflow instead of spawning workers.

## Shard Plan

Write `shard-plan.json` under `./.codex/artifacts/figma-inventory/{task_slug}/` before worker execution.

Required shape:

```json
{
  "schemaVersion": 1,
  "taskSlug": "example-task",
  "fileKey": "figma-file-key",
  "sourceUrl": "https://www.figma.com/design/...",
  "generatedAt": "ISO-8601 timestamp",
  "discovery": {
    "rootNodeId": "1:2",
    "rootName": "Design System",
    "method": "direct_children",
    "truncated": false
  },
  "shards": [
    {
      "shardId": "16222-137704",
      "rootNodeId": "16222:137704",
      "expectedName": "2 Element",
      "outputDir": ".codex/artifacts/figma-inventory/example-task/shards/16222-137704",
      "reason": "large direct child selected from discovery",
      "requiredPaths": [],
      "requiredMarkers": []
    }
  ]
}
```

Rules:

- Derive `shardId` from the node id, with an optional short safe name suffix only for readability.
- Do not use a hard-coded semantic shard list for broad links.
- Split the largest uncertain nodes first.
- Prefer explicit child node ids over broad parent roots.
- Keep each shard small enough that its worker can finish with one bounded `get_metadata` call or a small second-level shard plan.

## Worker Contract

When the current runtime policy permits subagents and the user requested parallel work, spawn one worker per shard or per small batch of independent shards. Otherwise execute the shard list sequentially in the controller.

Each worker must:

- Use this skill with only its assigned `fileKey`, `root_nodes`, `required_paths`, `required_markers`, and `output_dir`.
- Write only inside its assigned `outputDir`.
- Produce its own `manifest.json`, `summary.md`, and `snapshots/*.json`.
- Return `wrote_snapshot` or a `blocking_packet`.
- Never edit the parent `manifest.json`, parent `summary.md`, `shard-plan.json`, or sibling shard directories.

Use prompts shaped like:

```text
Use $figma-inventory-snapshot to capture this single Figma shard.
fileKey: {fileKey}
root_nodes: [{ nodeId: "{rootNodeId}", expectedName: "{expectedName}" }]
required_paths: [...]
required_markers: [...]
output_dir: ./.codex/artifacts/figma-inventory/{task_slug}/shards/{shardId}
Do not read sibling roots and do not edit the parent manifest.
```

## Controller Merge

After workers finish:

- Read `shard-plan.json` and each shard `manifest.json`.
- Verify every shard has the same `fileKey`, supported schema, no truncation, and complete required coverage.
- Copy no raw MCP output into the parent manifest.
- Write the parent `manifest.json` and `summary.md` only after validation.
- Mark a parent root as `ok_by_shards` only when every required shard is `ok` or `ok_by_shards` and every referenced snapshot file exists.

Parent manifest shard entries should include worker provenance:

```json
{
  "shardId": "16222-137704",
  "rootNodeId": "16222:137704",
  "manifestPath": "shards/16222-137704/manifest.json",
  "status": "ok",
  "coverageComplete": true,
  "truncated": false
}
```

## Retry And Blocking

- If a shard is `blocked_truncated` or `blocked_timeout`, create a smaller child shard plan for that shard only.
- If a shard is `blocked_needs_child_shards`, run one bounded direct-children discovery pass for that shard root, then retry child shards.
- Do not rerun completed sibling shards.
- Return a parent `blocking_packet` with `needs_user_input: false` when Figma access, timeout, truncation, or shard data prevents complete capture.
