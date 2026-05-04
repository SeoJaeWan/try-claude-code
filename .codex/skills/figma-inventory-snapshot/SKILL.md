---
name: figma-inventory-snapshot
description: Capture discovery-first, shard-backed JSON inventory snapshots for arbitrary Figma files. Use when Codex needs file/page/section/frame/component/style/variable structure, component variant recipes, reusable asset candidates, extraction coverage, or implementation-ready Figma evidence without assuming any project-specific design-system names.
---

# Figma Inventory Snapshot

Create manifest-backed JSON inventory artifacts for any Figma file. This skill discovers the file's actual structure before extraction, preserves that observed structure in JSON, and verifies completion through manifest coverage rather than Markdown summaries or props-only component lists.

## Required Reading

Read these references in order whenever this skill runs:

1. [references/contracts.md](references/contracts.md) for input/output shape, artifact schema, freshness, and blocker contract.
2. [references/workflow.md](references/workflow.md) for bounded Figma read and snapshot writing steps.
3. [references/guardrails.md](references/guardrails.md) for non-negotiable source and inference rules.

## Controller Rules

- Discover first. Inventory file pages, top-level sections or frames, component sets, components, styles, variables or variable collections, reusable-looking nodes, naming patterns, and hierarchy before generating extraction shards.
- Do not hardcode page names, section names, component names, style families, variable collection names, or design-system categories. Caller-provided required paths are extra coverage constraints, not extraction categories.
- JSON is primary. Write `manifest.json`, `discovery.json`, `extraction-plan.json`, and shard JSON under structure-preserving folders before reporting success. Markdown is summary-only.
- Use Figma tree-capable MCP tools, normally `get_metadata`; use read-only `use_figma` only for bounded supplementation of known node ids, non-recursive direct-child shard discovery, or observed property gaps that metadata cannot expose.
- Do not use `use_figma` for recursive multi-root, full-page, full-section, full component-tree, full style, or full variable inventory.
- Keep each tool response well below the known 20 KB transport ceiling. Start with index or direct-child discovery for likely large structures, and never bulk-read high-cardinality component, style, or variable areas when smaller shards can be planned.
- If output is truncated, incomplete, invalid, or too close to the transport ceiling to trust, discard it and retry with a smaller names-only, direct-children-only, explicit node-id, component-variant, style-family, variable-collection, mode, or variable batch shard.
- Treat Figma tool output as authoritative only after it is written to JSON and referenced from `manifest.json`.
- Do not use Code Connect, component mapping, suggestion, or code-component inventory tools as proof of full Figma tree completeness.
- Do not perform one full-file tree read when discovery indexes, page reads, section reads, component-set reads, variable-collection reads, or child node shards can satisfy the request.
- Do not mark a component set complete from prop names alone. When component sets exist, extract variant controls, variants, valid combinations when observable, and each variant node's actual recipe as far as Figma tools expose it.
- Write artifacts under `./.codex/artifacts/figma-inventory/{task_slug}/`.
- Preserve source provenance: `fileKey`, discovered node ids, discovered names, schema version, generated time, shard source, truncation state, and per-shard status must appear in `manifest.json`.
- Report `complete` only when discovery coverage and extracted JSON coverage agree, every referenced JSON file parses, no required shard is missing, and no truncated or partial shard is being counted as complete.
- Before returning a terminal result, run the skill-local manifest validator when available: `python scripts/validate_snapshot_manifest.py {output_dir}` for complete snapshots, or add `--allow-partial` for partial or blocked artifact checks.
- Return a tool/data blocker with `needs_user_input: false` when required Figma data cannot be captured by available tools.
