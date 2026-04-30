# Checkpointed Figma Collection

Use checkpointed collection for large or unstable Figma inventory work: multi-page files, many component sets, repeated quota pauses, or any frontier that expands past roughly 50 root or shard nodes.

## Directory Layout

Keep every large collection under a stable hash run:

```text
./.codex/artifacts/figma-inventory/{task_slug}/
  current.json
  runs/
    {collectionHash}/
      input.json
      queue.json
      batches/
        {batchHash}/
          batch.json
          snapshots/
            {safe-node-id}.json
          result.json
      snapshot-index.json
      manifest.json
      summary.md
```

`collectionHash` identifies the collection contract, not one execution attempt. Compute it from canonical JSON containing `schemaVersion`, collector rule version, `fileKey`, sorted root nodes, required paths, required markers, and accepted fidelity. Use `batchHash` or an attempt id for individual executions.

## Authority Model

- During collection, the durable authority is `queue.json` plus successfully parsed `batches/*/snapshots/*.json`.
- A batch worker may write only inside its own `batches/{batchHash}/` directory and may update `queue.json` only through the agreed queue transition.
- `manifest.json` is not an incremental progress log. Rebuild it from `snapshot-index.json` after scanning all batch snapshots.
- `current.json` may be updated only after the rebuilt manifest and summary pass validation.
- Batch success is not collection success. Treat a run as complete only after queue, snapshot, manifest, and coverage validation all pass.

## Queue States

Use these states in `queue.json`:

- `pending`: not yet attempted.
- `in_progress`: leased by the current batch.
- `done`: snapshot exists, parses, and records the expected node id.
- `needs_split`: the response was actually truncated, timed out, too large to trust, or transport-limited and requires child shards.
- `retryable`: quota, temporary tool failure, or batch budget stop; resume later without user input.
- `blocked`: repeated failure or missing child ids after the allowed split path.
- `skipped`: explicitly out of the current handoff scope.

An `in_progress` item must include a lease timestamp and batch id. If the batch does not finish, a later pass may return expired leases to `pending`.

## Snapshot Rules

Write one compact snapshot per successful `get_metadata` root or shard. Write to a temporary file first, parse it, then move it to its final path.

Each snapshot should include:

```json
{
  "schemaVersion": 1,
  "artifactType": "figma-node-snapshot",
  "fileKey": "figma-file-key",
  "collectionHash": "stable-contract-hash",
  "batchHash": "batch-hash",
  "capturedAt": "ISO-8601 timestamp",
  "source": {
    "tool": "figma.get_metadata",
    "nodeId": "16215:16462",
    "truncated": false
  },
  "rootNodeId": "16215:16462",
  "parentRootId": "16215:13715",
  "shardOf": "16215:13715",
  "actualName": "Icon/Normal/Template",
  "fidelity": "full",
  "tree": {
    "id": "16215:16462",
    "name": "Icon/Normal/Template",
    "type": "FRAME",
    "path": ["Icon", "Normal", "Template"],
    "children": []
  }
}
```

Snapshots preserve evidence only. Do not record Web/excluded/readiness decisions as snapshot facts.

## Split Rules

- Prefer one `get_metadata` call per requested root.
- Split only when the response is actually truncated, times out, exceeds the trusted transport size, or the tool reports an explicit transport limit.
- Do not split merely because a node has children.
- When splitting, preserve the parent root as `ok_by_shards` in the rebuilt manifest and connect child snapshots through `parentRootId` and `shardOf`.
- Stop expanding and return `blocking_packet` if child ids cannot be discovered by a bounded direct-children read.

## Rebuild And Validate

After a batch finishes or before handoff:

1. Scan every `batches/*/snapshots/*.json`.
2. Reject invalid JSON, wrong `fileKey`, wrong `collectionHash`, duplicate node ids without a deterministic resolution, and snapshots not represented in the queue.
3. Build `snapshot-index.json` with node id, snapshot path, parent/shard relation, root type/name, and derived marker summary.
4. Rebuild `manifest.json` from the index and the original `input.json`.
5. Rebuild `summary.md` from the manifest, queue, and blockers.
6. Update `current.json` only when the run is complete and validated.

Marker coverage is calculated during index or manifest rebuild, not independently inside each batch. Required markers seen in snapshots must match the manifest coverage summary.

## Terminal Results

Use `paused_retryable` when the queue is saved and more work remains:

```text
result = paused_retryable
task_slug = {task_slug}
collection_hash = {collectionHash}
queue_path = ./.codex/artifacts/figma-inventory/{task_slug}/runs/{collectionHash}/queue.json
done = {count}
pending = {count}
retryable = {count}
next_action = resume same collectionHash
```

Use `wrote_snapshot` only after the rebuilt manifest is complete for the requested handoff:

```text
result = wrote_snapshot
task_slug = {task_slug}
collection_hash = {collectionHash}
manifest_path = ./.codex/artifacts/figma-inventory/{task_slug}/runs/{collectionHash}/manifest.json
written_paths = [...]
```

Use `blocking_packet` only for non-user tool/data blockers that cannot be resumed without a smaller shard list or different available tool path.
