---
name: figma-inventory-snapshot
description: Capture bounded, controller-verified Figma node tree inventory snapshots as local evidence artifacts, including adaptive shard planning for large Figma links when parallel agents are explicitly requested and allowed. Use when Codex needs a full or partial Figma hierarchy, component-set list, variant names, Resource/* entries, platform markers, or other Figma inventory evidence for planning input, parity realignment, design-system registry classification, or artifact handoff; especially when full-file reads may timeout or Code Connect permissions are insufficient.
---

# Figma Inventory Snapshot

Create compact, manifest-backed Figma inventory artifacts. This skill captures tree evidence only; it does not classify components, revise plans, or infer missing families.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for input/output shape, artifact schema, freshness, and blocker contract.
2. [references/workflow.md](references/workflow.md) for bounded Figma read and snapshot writing steps.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable source and inference rules.
4. [references/parallel-orchestration.md](references/parallel-orchestration.md) when the input is a broad Figma link, the target may exceed one bounded response, or the user requests multi-agent shard capture.

## Controller Rules

- Use Figma tree-capable MCP tools, normally `get_metadata`; use read-only `use_figma` only for bounded supplementation of known node ids or non-recursive direct-child shard discovery.
- Do not use `use_figma` for recursive multi-root, full-page, full-section, or full component-tree inventory.
- Keep each tool response well below the known 20 KB transport ceiling; if output is truncated or too large to trust, discard it and retry with a smaller names-only, direct-children-only, or explicit node-id shard.
- For broad Figma links, first perform bounded discovery and write an adaptive `shard-plan.json`; do not start from fixed semantic shard names unless the user provided those exact scopes.
- When parallel agents are used, give each worker exactly one disjoint shard output directory and merge results only from the controller.
- Treat Figma tool output as authoritative only after it is written to `snapshots/*.json` and referenced from `manifest.json`.
- Do not use Code Connect, component mapping, suggestion, or code-component inventory tools as proof of full Figma tree completeness.
- Do not perform one full-file tree read when scoped root reads, page reads, or section reads can satisfy the request.
- Write artifacts under `./.codex/artifacts/figma-inventory/{task_slug}/`.
- Preserve source provenance: `fileKey`, root node ids, root names, schema version, generated time, and per-root status must appear in `manifest.json`.
- Return a tool/data blocker with `needs_user_input: false` when required Figma data cannot be captured by available tools.
