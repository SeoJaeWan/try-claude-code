# Plan Wiki Maintenance Checklist

Use the same scan/index/report pipeline as `dev-wiki-lint`, with shared-plan checks.

## Pipeline

1. Verify `.codex/plan-wiki/source/wiki/registry.json`.
2. Run `.codex/tools/wiki-index.mjs` with `--mode plan`.
3. Refresh `wiki/generated/index.json`, `tag-index.md`, `link-graph.json`, `wiki-health.md`, and `normalize-proposals.md`.
4. Inspect reported problems and only the source files needed to confirm them.
5. Apply safe mechanical cleanup.
6. Leave semantic cleanup as proposals.

## Registry Checks

The registry is a boot config, not a taxonomy catalog. Check:

- `version`
- `document_model`
- `source_precedence`
- `roots`
- `stage_core`
- generated output location when present

Do not require domain taxonomy, tag allowlists, adjacency rules, manual tag pages, or registered pattern lists.

## Source Checks

- Core documents should have `type` metadata or a migration finding.
- Pattern documents should identify their type and useful lookup attributes such as `stage`, `tags`, `risk`, `source`, `raw_sources`, or `derived_from`.
- Raw evidence should stay concise, redacted, and linked from promoted patterns when used.
- Feedback records should move through inbox/outcome folders when `plan-wiki-update` processes them.
- Shared policy should not encode one project's local fact as universal guidance.

## Generated Checks

- `wiki/generated/**` is derived output and may be regenerated.
- Tag, type, stage, risk, and link indexes come from frontmatter and markdown links.
- Similar tags or terms are cleanup proposals, not automatic semantic rewrites.
