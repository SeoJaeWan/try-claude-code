# Figma Inventory Snapshot Workflow

## Step 1. Normalize Inputs

- Confirm `task_slug` and `fileKey`.
- Normalize node ids for Figma MCP calls, converting URL `node-id=1-2` to `1:2` when needed.
- Treat `starting_nodes`, `required_paths`, and `required_markers` as coverage constraints only. Do not treat them as design-system categories.
- Resolve `output_dir` to `./.codex/artifacts/figma-inventory/{task_slug}/` unless the controller provided another literal path.
- Create safe artifact names by replacing unsafe path characters, including `:` with `-`.
- Set a conservative per-call response budget below the known 20 KB transport ceiling. Use `12000` bytes as the default target unless the environment proves a lower limit is needed.

## Step 2. Check Existing Manifest

- If `manifest.json` exists, evaluate freshness using `contracts.md`.
- Reuse only fresh discovery and shard files whose JSON parses and whose manifest entries are still covered by the current scope.
- Do not reuse a manifest with missing discovered targets, missing component recipes, missing variables, missing styles, invalid JSON, accepted truncation, or stale required path coverage.
- Refresh only stale or missing discovery/shard artifacts when possible.

## Step 3. Run Discovery Before Extraction

Discovery must identify the file's actual structure before any full extraction plan is finalized.

Capture, as available from Figma tools:

- file pages
- top-level sections and frames per page
- component sets
- components
- styles
- variables and variable collections
- reusable asset candidates
- naming patterns and hierarchy patterns

Discovery should start with the smallest reliable index:

- Prefer file/page metadata or direct-child page indexes over a full-file recursive read.
- For each page, capture direct children first when recursive page output may exceed the response budget.
- For component-heavy pages, capture component set and component indexes before recipe extraction.
- For variables, capture collection indexes before collection values; capture modes or variable batches when a collection is large.
- For styles, capture style indexes before detailed style properties when style count is high.

Write `discovery.json` only from non-truncated, trusted responses. If discovery itself is incomplete, write the reliable parts, record missing targets and incomplete reasons, and keep manifest status `partial` or `blocked`.

## Step 4. Generate Extraction Plan From Discovery

Build `extraction-plan.json` from `discovery.json`. The plan's shard basis must follow the observed Figma structure, not predefined category names.

Use shard bases such as:

- page
- top-level section
- top-level frame
- component set
- component variant
- standalone component
- style family or style id
- variable collection
- variable mode
- variable batch
- reusable asset candidate
- node subtree

Choose shard boundaries conservatively:

- If a page has many children, plan top-level section/frame shards instead of one page subtree.
- If a section/frame is large, plan direct-child indexes first and then node subtree shards.
- If a component set is large, plan one set index plus per-variant recipe shards.
- If variable collection output is large, plan collection index plus mode shards or variable batches.
- If style output is large, plan style kind, style family, or style-id shards.
- If a tool response is likely to approach the response ceiling, plan smaller shards before making the call.

Do not repeatedly retry the same oversized full target. Split the target after the first oversize, timeout, truncation, invalid JSON, or near-ceiling response.

## Step 5. Execute Shards With Truncation Defense

For every shard:

- Keep the tool response below the target budget.
- Treat explicit truncation, abruptly ended JSON/text, missing expected closing structure, invalid JSON, incomplete child lists, timeout, or a response near the transport ceiling as untrusted.
- Discard untrusted responses. Do not write them as successful shard JSON.
- Retry with a smaller shard: direct children only, names-only index, explicit child node id, component variant id, style id, variable collection, variable mode, or variable batch.
- If smaller child ids are unavailable, record `blocked_needs_child_shards` or `blocked_tool_unavailable` in the manifest.
- Do not switch to Code Connect, summaries, or stale reports to close coverage after a Figma tree/style/variable read fails.

This rule is specifically meant to avoid the common failure where a large variable collection, style group, component section, or component set is truncated around the MCP transport ceiling and then mistakenly reported as complete.

## Step 6. Build JSON Snapshots

For node shards:

- Preserve each node's observed `id`, `name`, `type`, `path`, `parentId`, `pageId`, and children when available.
- Include `observedProperties` for fields exposed by the tool, such as size, layout, fill, stroke, typography, effects, radius, constraints, slots, export settings, interactions, bindings, or plugin data.
- Omit fields that are not present. Missing optional properties are not failures.

For component sets:

- Capture component set id, name, path, component property definitions or controls when available.
- Capture variant ids, names, variant property values, and valid combinations when observable.
- Extract each variant node's actual recipe when variant node ids are available.
- Store variant recipes inline or as referenced node/component shard paths.
- Do not mark a component set complete from prop lists, control names, or variant labels alone.

For standalone components:

- Capture the component node recipe when exposed.
- Preserve component metadata and observed properties.

For styles:

- Preserve style ids, names, style types, descriptions, local/remote state, and exposed paint, text, effect, grid, or other style properties.
- Shard by observed style grouping, style type, or style id when needed.

For variables:

- Preserve collection ids, collection names, modes, variable ids, names, resolved types, aliases, scopes, values by mode, and local/remote state when exposed.
- Shard large collections by collection, mode, or variable batch.

For reusable asset candidates:

- Record why the node is a candidate using observed evidence only, such as component status, instance usage, export settings, repeated naming, repeated hierarchy, or placement in a reusable-looking subtree.
- Do not convert candidate reasons into fixed categories.

## Step 7. Verify Coverage

After writing JSON files:

- Parse `manifest.json`, `discovery.json`, `extraction-plan.json`, and every referenced shard JSON file with an available JSON parser.
- Compare `discovery.json` targets with extracted shard coverage.
- List missing pages, nodes, component sets, components, styles, variable collections, variables, asset candidates, required paths, and required markers in `manifest.coverage.missing` or the matching coverage field.
- List component sets whose variant node ids were known but whose variant recipes were not extracted in `manifest.coverage.componentRecipesMissing`.
- List invalid JSON files in `manifest.coverage.invalidJsonFiles`.
- List partial, blocked, truncated, or oversize shards in `manifest.coverage.incompleteShards`.
- Set `manifest.status = "complete"` only when all coverage lists required for the current scope are empty, all JSON parses, and `truncatedResponsesAccepted = 0`.
- Set `manifest.status = "partial"` when reliable JSON exists but coverage is incomplete.
- Set `manifest.status = "blocked"` when required data cannot be captured without new tool access, smaller node ids, permissions, or user scope decisions.
- Run `python scripts/validate_snapshot_manifest.py {output_dir}` before reporting `complete`.
- For `partial` or `blocked` artifacts, run `python scripts/validate_snapshot_manifest.py {output_dir} --allow-partial` to verify parseability and manifest consistency without claiming completion.

## Step 8. Write Summary

Write `summary.md` as secondary human-readable output. Include:

- source `fileKey`
- discovered structure counts and notable hierarchy patterns
- shard strategy used
- JSON schema and folder layout used
- coverage result and missing targets
- component recipe coverage and limits
- exact next action when partial or blocked

Do not hide missing coverage in `summary.md`; the manifest must carry the authoritative missing, partial, and blocker state.

## Step 9. Return Terminal Result

- Return `result = wrote_snapshot` with `status = complete` only after `manifest.json`, `discovery.json`, `extraction-plan.json`, `summary.md`, and every referenced shard JSON file exist on disk and pass coverage verification.
- Return `result = wrote_snapshot` with `status = partial` when reliable JSON artifacts were written but coverage is incomplete.
- Return `result = blocking_packet` with `needs_user_input = false` when the tool path, permission, timeout, response limit, or shard list is insufficient.
- Return `needs_user_input = true` only when the user must choose or provide a file key, explicit scope exclusion, or intended inventory boundary.
