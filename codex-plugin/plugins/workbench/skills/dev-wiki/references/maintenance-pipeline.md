# Dev Wiki Maintenance Pipeline

Use the same maintenance shape as `plan-wiki-lint`, with project-specific checks.

## Pipeline

1. Verify the dev wiki source clone and project root.
2. Scan markdown frontmatter and links with `node <skill-dir>/scripts/wiki-index.mjs --mode dev --root "$DEV_WIKI_ROOT/source/<project>"`.
3. Refresh `{project}/generated/index.json`, `tag-index.md`, `link-graph.json`, `wiki-health.md`, and `normalize-proposals.md`.
4. Apply only safe mechanical cleanup.
5. Leave semantic cleanup as explicit proposals.
6. Report nested dev wiki git status.

## Project-Specific Checks

- Project documents should identify the project through frontmatter or `project.json`.
- `conventions/`, `architecture/`, and `workflows/` are policy/prose areas.
- `graph/` is generated repository evidence and is owned by `dev-wiki-graph`.
- Generated graph evidence must not be rewritten into mandatory policy unless the user confirms the rule.
- Missing `type` is a health issue, but not automatically a reason to invent policy.

## Generated Output Contract

Generated files live under `{project}/generated/` and are derived from current wiki files. They may be regenerated at any time and should not be used as the canonical source of a rule.
