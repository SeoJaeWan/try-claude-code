# Figma Inventory Snapshot Workflow

## Step 1. Normalize Inputs

- Confirm `task_slug`, `fileKey`, and at least one `root_nodes` entry.
- Normalize node ids for Figma MCP calls, converting URL `node-id=1-2` to `1:2` when needed.
- Resolve `output_dir` to `./.codex/artifacts/figma-inventory/{task_slug}/` unless the controller provided another literal path.
- Create a safe snapshot file name by replacing `:` with `-`.
- Select checkpointed collection when the frontier is large, a prior queue exists, quota may pause the work, or root/shard count grows beyond roughly 50 nodes. Use [checkpointed-collection.md](checkpointed-collection.md) in that mode.

## Step 2. Check Existing Manifest Or Run

- If `manifest.json` exists, evaluate freshness using `contracts.md`.
- Reuse fresh roots and capture only missing/stale roots.
- Do not reuse a manifest with missing required paths unless the current handoff explicitly does not require those paths.
- If `current.json` points to a checkpointed run, evaluate `runs/{collectionHash}/input.json`, `queue.json`, `snapshot-index.json`, and `manifest.json` using `contracts.md`.
- If a checkpointed run is incomplete but reusable, resume its queue instead of starting a new collection.
- If stale `in_progress` queue leases exist, return them to `pending` before selecting the next batch.

## Step 3. Capture Bounded Tree Shards Or Batch

- Prefer one MCP `get_metadata` call per provided root node.
- If a root is too large or times out, capture child sections/pages separately when their node ids are available.
- If child ids are not available, use read-only `use_figma` only to fetch a non-recursive, names-only direct-children index for that one root; then return to `get_metadata` for the child shards.
- If child ids are still unavailable after the bounded direct-children attempt, return a `tool_data_blocker` naming the root that needs a smaller controller-provided shard list.
- Do not retry the same oversized full-root call repeatedly.
- Do not use `use_figma` for recursive descendant inventory, multi-root traversal, full-page traversal, or full component-tree traversal.
- Keep tool responses well below the known 20 KB transport ceiling. If output is truncated, incomplete, or close to the transport limit, discard that result and retry with smaller names-only, direct-children-only, or explicit node-id shards.
- Do not switch to Code Connect tools after a tree read fails.
- In checkpointed mode, lease only a bounded batch from `queue.json`, commonly 10-30 nodes. Save a snapshot immediately after each successful node.
- In checkpointed mode, stop with `paused_retryable` rather than `blocking_packet` when the only issue is quota, temporary tool failure, or batch budget.

## Step 4. Build Compact Snapshots

For each successful shard:

- Preserve each node's `id`, `name`, `type`, and `path`.
- Include children recursively, but omit geometry unless the handoff requires it.
- In flat mode, add simple markers derived from names and node types:
  - `Resource` when a path segment contains `Resource`
  - `iOS`, `Android`, `Web` when a name or path segment contains the platform marker
  - `component-set` for component set or symbol-set style nodes when exposed by metadata
  - `variant` when names contain property assignments such as `State=Pressed`
- Keep marker derivation conservative; do not invent missing platform or resource families.
- In checkpointed mode, snapshots store tree evidence and provenance. Marker coverage is recalculated during `snapshot-index.json` and manifest rebuild so every batch uses one rule set.
- Write snapshots to a temporary file, parse the result, then move it into the final `snapshots/` path.

## Step 5. Rebuild Or Write Manifest And Summary

- Write or update each `snapshots/{safe-node-id}.json`.
- Write `manifest.json` with root status, coverage, fidelity, truncation state, shard provenance, and incomplete reasons.
- Do not return success for any Figma result that was only observed in chat or tool output; every successful root or shard must be fixed as a snapshot file and referenced from `manifest.json`.
- Write `summary.md` with:
  - source `fileKey`
  - root nodes read
  - required paths and marker coverage
  - incomplete roots or shard failures
  - exact next action when blocked
- In checkpointed mode, scan all batch snapshots, build `snapshot-index.json`, then rebuild `manifest.json` and `summary.md`. Do not incrementally edit `manifest.json` as each batch runs.
- In checkpointed mode, record parent roots covered by child snapshots as `ok_by_shards` with explicit shard paths.
- Fail validation if a batch snapshot exists but is not indexed, if an indexed path is missing, or if marker coverage in the manifest disagrees with the rebuilt index.

## Step 6. Return Terminal Result

- Return `result = wrote_snapshot` when the manifest satisfies current coverage.
- Return `wrote_snapshot` only after `manifest.json`, `summary.md`, and every referenced snapshot file exist on disk.
- Return `result = paused_retryable` when checkpointed collection saved progress but more `pending` or `retryable` queue entries remain.
- Return `result = blocking_packet` with `needs_user_input = false` when the tool path, permission, timeout, or shard list is insufficient.
- Return `needs_user_input = true` only when the user must choose or provide root nodes, required paths, or intended inventory scope.
