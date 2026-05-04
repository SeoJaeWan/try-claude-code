# Figma Inventory Snapshot Workflow

## Step 1. Normalize Inputs

- Confirm `task_slug`, `fileKey`, and at least one `root_nodes` entry.
- Normalize node ids for Figma MCP calls, converting URL `node-id=1-2` to `1:2` when needed.
- Resolve `output_dir` to `./.codex/artifacts/figma-inventory/{task_slug}/` unless the controller provided another literal path.
- Create a safe snapshot file name by replacing `:` with `-`.

## Step 2. Check Existing Manifest

- If `manifest.json` exists, evaluate freshness using `contracts.md`.
- Reuse fresh roots and capture only missing/stale roots.
- Do not reuse a manifest with missing required paths unless the current handoff explicitly does not require those paths.

## Step 3. Capture Bounded Tree Shards

- Prefer one MCP `get_metadata` call per provided root node.
- If a root is too large or times out, capture child sections/pages separately when their node ids are available.
- If child ids are not available, use read-only `use_figma` only to fetch a non-recursive, names-only direct-children index for that one root; then return to `get_metadata` for the child shards.
- If child ids are still unavailable after the bounded direct-children attempt, return a `tool_data_blocker` naming the root that needs a smaller controller-provided shard list.
- Do not retry the same oversized full-root call repeatedly.
- Do not use `use_figma` for recursive descendant inventory, multi-root traversal, full-page traversal, or full component-tree traversal.
- Keep tool responses well below the known 20 KB transport ceiling. If output is truncated, incomplete, or close to the transport limit, discard that result and retry with smaller names-only, direct-children-only, or explicit node-id shards.
- Do not switch to Code Connect tools after a tree read fails.

## Step 4. Build Compact Snapshots

For each successful shard:

- Preserve each node's `id`, `name`, `type`, and `path`.
- Include children recursively, but omit geometry unless the handoff requires it.
- Add simple markers derived from names and node types:
  - `Resource` when a path segment contains `Resource`
  - `iOS`, `Android`, `Web` when a name or path segment contains the platform marker
  - `component-set` for component set or symbol-set style nodes when exposed by metadata
  - `variant` when names contain property assignments such as `State=Pressed`
- Keep marker derivation conservative; do not invent missing platform or resource families.

## Step 5. Write Manifest and Summary

- Write or update each `snapshots/{safe-node-id}.json`.
- Write `manifest.json` with root status, coverage, fidelity, truncation state, shard provenance, and incomplete reasons.
- Do not return success for any Figma result that was only observed in chat or tool output; every successful root or shard must be fixed as a snapshot file and referenced from `manifest.json`.
- Write `summary.md` with:
  - source `fileKey`
  - root nodes read
  - required paths and marker coverage
  - incomplete roots or shard failures
  - exact next action when blocked

## Step 6. Return Terminal Result

- Return `result = wrote_snapshot` when the manifest satisfies current coverage.
- Return `wrote_snapshot` only after `manifest.json`, `summary.md`, and every referenced snapshot file exist on disk.
- Return `result = blocking_packet` with `needs_user_input = false` when the tool path, permission, timeout, or shard list is insufficient.
- Return `needs_user_input = true` only when the user must choose or provide root nodes, required paths, or intended inventory scope.
