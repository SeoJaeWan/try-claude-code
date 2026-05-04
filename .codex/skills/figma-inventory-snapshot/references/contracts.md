# Figma Inventory Snapshot Contracts

## Purpose

Capture implementation-ready Figma inventory as discovery-first, shard-backed JSON artifacts with explicit provenance, coverage, freshness, truncation handling, and blocker state.

This skill does not assume a design-system structure. It records the file structure that Figma exposes, then plans extraction around that observed structure.

## Inputs

The controller should provide:

- `task_slug`
- `fileKey`
- optional `starting_nodes`: exact node ids and expected labels when a handoff already names roots
- optional `required_paths`: extra path coverage constraints for the current handoff
- optional `required_markers`: extra marker coverage constraints for the current handoff
- optional `scope`: defaults to `full_file_discovery`; narrower scopes must still run discovery inside that boundary
- optional `output_dir`, defaulting to `./.codex/artifacts/figma-inventory/{task_slug}/`

`starting_nodes`, `required_paths`, and `required_markers` constrain coverage only. They must not become hardcoded categories or replace discovery of actual pages, sections, frames, component sets, components, styles, variables, assets, naming patterns, and hierarchy.

## Authoritative Tools

- Figma tree metadata tools are authoritative for hierarchy, names, ids, node types, component set membership, component nodes, and parent/child structure.
- Figma style and variable metadata tools, when available, are authoritative for style ids, style names, variable collections, modes, variable ids, aliases, and values.
- Read-only Figma script inspection may supplement metadata only for bounded direct-child indexes, known node ids, or observed properties missing from metadata.

## Non-Authoritative Tools

Do not use these as full inventory proof:

- Code Connect mapping, suggestion, or context tools
- code component or Storybook listing tools
- `get_design_context` summaries without tree, style, and variable coverage
- old parity reports or package registries, unless the user explicitly asks to compare them against the snapshot

These sources may be recorded as secondary context, but they cannot close discovery or extraction coverage.

## Output Artifacts

Write all outputs under `output_dir`. JSON is primary:

- `manifest.json`: controller-facing manifest for status, provenance, coverage, shard state, and blocker state
- `discovery.json`: observed file structure, naming patterns, and extraction targets
- `extraction-plan.json`: generated shard plan based on discovery
- `nodes/{safe-node-id}.json`: page, section, frame, or node subtree shards
- `component-sets/{safe-node-id}.json`: component set controls, variants, valid combinations when observable, and variant recipe references or embedded recipes
- `components/{safe-node-id}.json`: standalone component shards when components are not covered by a component set shard
- `styles/{safe-style-id}.json`: style shards grouped by observed style structure
- `variables/{safe-collection-or-variable-id}.json`: variable collection, mode, or variable batch shards
- `assets/{safe-node-id}.json`: reusable asset candidate shards discovered from observed file structure
- `summary.md`: human-readable summary only; it cannot be the primary evidence artifact

Safe file names must preserve traceability by replacing characters unsafe for local paths, including `:` with `-`.

## Manifest Schema

`manifest.json` must include:

```json
{
  "schemaVersion": 2,
  "taskSlug": "example-task",
  "fileKey": "figma-file-key",
  "generatedAt": "ISO-8601 timestamp",
  "status": "complete",
  "primaryArtifacts": {
    "discovery": "discovery.json",
    "extractionPlan": "extraction-plan.json",
    "summary": "summary.md"
  },
  "discovery": {
    "status": "ok",
    "path": "discovery.json",
    "truncated": false,
    "counts": {
      "pages": 0,
      "topLevelNodes": 0,
      "componentSets": 0,
      "components": 0,
      "styles": 0,
      "variableCollections": 0,
      "variables": 0,
      "assetCandidates": 0
    },
    "incompleteReasons": []
  },
  "extractionPlan": {
    "status": "ok",
    "path": "extraction-plan.json",
    "strategySummary": [],
    "targetToolResponseBytes": 12000,
    "incompleteReasons": []
  },
  "shards": [
    {
      "shardId": "page-0-1",
      "kind": "page",
      "basis": "page",
      "sourceId": "0:1",
      "sourceName": "Observed page name",
      "sourcePath": ["Observed page name"],
      "parentShardId": null,
      "targetPath": "nodes/0-1.json",
      "status": "ok",
      "fidelity": "full",
      "tool": "get_metadata",
      "toolResponse": {
        "targetMaxBytes": 12000,
        "observedBytes": 8000,
        "truncated": false,
        "discarded": false
      },
      "coverageClaims": ["node:0:1"],
      "childShardIds": [],
      "incompleteReasons": []
    }
  ],
  "coverage": {
    "complete": true,
    "jsonParseValid": true,
    "truncatedResponsesAccepted": 0,
    "discovered": {
      "pages": [],
      "nodes": [],
      "componentSets": [],
      "components": [],
      "styles": [],
      "variableCollections": [],
      "variables": [],
      "assetCandidates": []
    },
    "extracted": {
      "pages": [],
      "nodes": [],
      "componentSets": [],
      "components": [],
      "styles": [],
      "variableCollections": [],
      "variables": [],
      "assetCandidates": []
    },
    "missing": {
      "pages": [],
      "nodes": [],
      "componentSets": [],
      "components": [],
      "styles": [],
      "variableCollections": [],
      "variables": [],
      "assetCandidates": [],
      "shards": []
    },
    "componentRecipesMissing": [],
    "invalidJsonFiles": [],
    "incompleteShards": [],
    "requiredPathsMissing": [],
    "requiredMarkersMissing": [],
    "incompleteReasons": []
  },
  "blockers": []
}
```

Allowed manifest `status` values:

- `complete`: discovery targets and extracted JSON coverage agree, every JSON file parses, no required coverage is missing, no incomplete shard is counted as complete, and no truncated response is accepted.
- `partial`: some reliable JSON shards were written, but discovered targets, component recipes, styles, variables, or assets remain missing or incomplete.
- `blocked`: required discovery or extraction data cannot be captured with available tools, permissions, response limits, or shard ids.

Allowed shard `status` values:

- `ok`: the shard snapshot is complete for its planned coverage claims
- `ok_by_child_shards`: the parent target is covered by child shard files listed in `childShardIds`
- `partial_index_only`: only ids, names, types, and paths are available; this cannot close full extraction coverage unless the plan explicitly scoped that shard to indexing
- `blocked_timeout`: the shard timed out
- `blocked_truncated`: the shard response was truncated, incomplete, invalid, or too large to trust after smaller retries were exhausted
- `blocked_oversize`: the shard is expected to exceed the response budget and no smaller child shard ids are available
- `blocked_needs_child_shards`: smaller child node ids are required before extraction can continue
- `blocked_tool_unavailable`: the required Figma tree, style, or variable data is not exposed by available tools
- `skipped_out_of_scope`: the shard was discovered but intentionally excluded by an explicit user-provided scope

Allowed `fidelity` values:

- `index`: ids, names, types, parent ids, and paths only
- `direct_children`: only immediate children of the target node are represented
- `full`: hierarchy contains all fields exposed by the authoritative tool within the planned shard
- `recipe`: component or variant node recipe with observed properties
- `properties`: non-tree style or variable properties
- `sharded`: the parent target is represented by child shard files

## Discovery Schema

`discovery.json` must preserve the structure that was actually found:

```json
{
  "schemaVersion": 2,
  "fileKey": "figma-file-key",
  "generatedAt": "ISO-8601 timestamp",
  "source": {
    "startingNodes": [],
    "scope": "full_file_discovery"
  },
  "pages": [],
  "topLevelNodes": [],
  "componentSets": [],
  "components": [],
  "styles": [],
  "variableCollections": [],
  "variables": [],
  "assetCandidates": [],
  "namingPatterns": [],
  "hierarchy": [],
  "discoveryShards": [],
  "incompleteReasons": []
}
```

Entries should use observed fields only:

- `id`, `name`, `type`, `path`, `parentId`, and `pageId` when available
- `childrenCount`, `componentSetId`, `componentPropertyDefinitions`, `variantProperties`, `styleType`, `variableCollectionId`, `modeIds`, or `remote` when available
- `observedProperties` for properties exposed by Figma that do not fit a fixed field
- `candidateReasons` for reusable asset candidates, based on observed Figma node type, component status, instance usage, export settings, naming repetition, or hierarchy repetition

Do not normalize observed structure into project-specific categories. Naming patterns are evidence, not taxonomy.

## Extraction Plan Schema

`extraction-plan.json` must be generated from `discovery.json`:

```json
{
  "schemaVersion": 2,
  "fileKey": "figma-file-key",
  "generatedAt": "ISO-8601 timestamp",
  "targetToolResponseBytes": 12000,
  "retryPolicy": {
    "discardTruncatedResponses": true,
    "splitInsteadOfRepeatingOversizeCalls": true
  },
  "shardStrategy": [],
  "shards": []
}
```

Shard basis must be selected from observed structure, such as:

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

The plan must prefer smaller shards before calling large targets. If discovery shows high-cardinality areas, plan an index shard first, then component-set, variant, style, variable-collection, mode, batch, or node subtree shards.

## Snapshot Schemas

Node shard JSON should include:

- `schemaVersion`
- `kind`
- `fileKey`
- `source`
- `root`
- `fidelity`
- `nodes`
- `observedProperties`
- `children`
- `incompleteReasons`

Component set shard JSON should include:

- `schemaVersion`
- `kind: "componentSet"`
- `componentSet`
- `controls` from observed component property definitions when available
- `variants`
- `validCombinations` when observable
- `variantRecipes`: each variant's actual node recipe or a reference to a node shard
- `observedProperties`
- `incompleteReasons`

A component set is not complete when it only contains prop names or variant labels. It must include variant recipe coverage when the Figma tools expose variant node ids. Missing recipes must be listed in `coverage.componentRecipesMissing` and the manifest cannot be `complete`.

Style shard JSON should include observed style ids, names, style types, descriptions, remote/local state, and exposed paint, text, effect, grid, or other style properties. Missing optional fields do not fail extraction; record only observed fields.

Variable shard JSON should include observed collection ids, collection names, modes, variable ids, names, resolved types, aliases, scopes, values by mode, and remote/local state when exposed. Large collections must be split by collection, mode, or variable batch before any response reaches the transport ceiling.

Recipe JSON must record present fields only. Use `observedProperties` for any exposed size, layout, fill, stroke, typography, effects, radius, constraints, slots, export settings, interactions, or binding data that does not fit the stable schema.

## Coverage Verification

Completion is manifest-driven:

- Every discovered page, planned top-level node shard, component set, standalone component, style, variable collection, variable, asset candidate, and required path or marker must be represented in extracted JSON or explicitly excluded by user-provided scope.
- Every `targetPath` referenced by `manifest.json` must exist and parse as JSON.
- `discovery.json` and `extraction-plan.json` must parse as JSON.
- `coverage.missing.*`, `coverage.componentRecipesMissing`, `coverage.invalidJsonFiles`, and `coverage.incompleteShards` must be empty for `status = "complete"`.
- `coverage.truncatedResponsesAccepted` must be `0` for `status = "complete"`.
- Any truncated, invalid, incomplete, or near-ceiling response must be discarded and cannot be cited as extracted coverage.
- A partial names-only or props-only result may be preserved as evidence, but it cannot close full inventory coverage.

The skill-local helper `scripts/validate_snapshot_manifest.py` must be used when available:

- `python scripts/validate_snapshot_manifest.py {output_dir}` for complete snapshots
- `python scripts/validate_snapshot_manifest.py {output_dir} --allow-partial` for partial or blocked snapshots

## Freshness

An existing manifest is reusable only when:

- `schemaVersion` is supported
- `fileKey` matches
- `discovery.status = "ok"`
- `extractionPlan.status = "ok"`
- every referenced JSON file exists and parses
- every discovered target required by the current scope is covered by an `ok` or `ok_by_child_shards` shard
- no required shard or coverage entry has `truncated = true`
- `coverage.complete = true`
- all `coverage.missing.*` lists are empty for the current scope
- `coverage.componentRecipesMissing` is empty when component sets exist and variant node ids were observable
- `requiredPathsMissing` and `requiredMarkersMissing` are empty for the current handoff
- the controller accepts its age for the current planning run

If any condition fails, refresh only the missing or stale discovery/shard data when possible.

## Terminal Results

On success:

```text
result = wrote_snapshot
task_slug = {task_slug}
status = complete
manifest_path = ./.codex/artifacts/figma-inventory/{task_slug}/manifest.json
written_paths = [...]
```

On reliable partial extraction:

```text
result = wrote_snapshot
task_slug = {task_slug}
status = partial
manifest_path = ./.codex/artifacts/figma-inventory/{task_slug}/manifest.json
missing = [...]
next_action = {specific smaller shard, tool, or permission action}
```

On missing tool/data:

```text
result = blocking_packet
task_slug = {task_slug}
needs_user_input = false
blocker_type = tool_data_blocker
blocker = {short reason}
required_data = [...]
next_action = {specific missing discovery, shard id, style, variable, or tool action}
```

Use `needs_user_input = true` only when the missing item is a user decision such as the intended file key, explicit scope exclusion, or ambiguous inventory boundary, not when Figma access, timeout, response truncation, or tool coverage failed.
