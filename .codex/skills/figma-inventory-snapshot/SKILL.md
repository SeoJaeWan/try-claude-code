---
name: figma-inventory-snapshot
description: Capture bounded, controller-verified Figma node tree inventory snapshots before planning or classification consumes Figma inventory. Use when Codex needs a full or partial Figma hierarchy, component-set list, variant names, Resource/* entries, platform markers, or other Figma inventory evidence for architect planning, parity realignment, design-system registry classification, or downstream handoff artifacts; especially when full-file reads may timeout or Code Connect permissions are insufficient.
---

# Figma Inventory Snapshot

Create compact, manifest-backed Figma inventory artifacts that downstream planning skills can treat as authoritative input. This skill captures tree evidence only; it does not classify components, revise plans, or infer missing families.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for input/output shape, artifact schema, freshness, and blocker contract.
2. [references/workflow.md](references/workflow.md) for bounded Figma read and snapshot writing steps.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable source and inference rules.

## Controller Rules

- Use Figma tree-capable MCP tools, normally `get_metadata`; use read-only `use_figma` only for bounded supplementation of known node ids or non-recursive direct-child shard discovery.
- Do not use `use_figma` for recursive multi-root, full-page, full-section, or full component-tree inventory.
- Keep each tool response well below the known 20 KB transport ceiling; if output is truncated or too large to trust, discard it and retry with a smaller names-only, direct-children-only, or explicit node-id shard.
- Treat Figma tool output as authoritative only after it is written to `snapshots/*.json` and referenced from `manifest.json`.
- Do not use Code Connect, component mapping, suggestion, or code-component inventory tools as proof of full Figma tree completeness.
- Do not perform one full-file tree read when scoped root reads, page reads, or section reads can satisfy the request.
- Write artifacts under `./.codex/artifacts/figma-inventory/{task_slug}/`.
- Preserve source provenance: `fileKey`, root node ids, root names, schema version, generated time, and per-root status must appear in `manifest.json`.
- Return a tool/data blocker with `needs_user_input: false` when required Figma data cannot be captured by available tools.
