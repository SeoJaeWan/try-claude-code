---
name: dev-wiki-lint
description: Scan and maintain a project dev wiki by refreshing generated frontmatter/link indexes, writing wiki health and normalization reports, checking project-scoped metadata, and applying only safe mechanical cleanup. Use when Codex needs to lint, inspect, refresh generated indexes, or find tag/term/link drift in `.codex/dev-wiki/source/{project}` without comparing the wiki against the full repository.
---

# Dev Wiki Lint

Maintain the dev wiki as an OKF-compatible, agent-readable project knowledge bundle. This skill is for wiki-internal health, not repo-vs-wiki auditing.

## Required Reading

Read [references/maintenance-pipeline.md](references/maintenance-pipeline.md) before scanning or editing.

## Workflow

1. Verify opt-in.
   - Read `./.codex/dev-wiki/config.json`.
   - If missing, stop and route to `dev-wiki-setup`.
   - Resolve the project root as `./.codex/dev-wiki/source/{project}`.

2. Refresh generated indexes.
   - Run `node .codex/tools/wiki-index.mjs --mode dev --root .codex/dev-wiki/source/{project}`.
   - Treat `{project}/generated/**` as derived output. Do not hand-edit it.

3. Inspect the health output.
   - Read `{project}/generated/wiki-health.md`.
   - Read `{project}/generated/normalize-proposals.md`.
   - Inspect source files only as needed to verify reported missing `type`, missing frontmatter, broken links, tag drift, one-off tags, or generated staleness.

4. Apply only safe mechanical cleanup.
   - Safe: generated refresh, duplicate frontmatter list entries, obvious whitespace around metadata values, and stale generated files.
   - Approval required: tag merges, term normalization, document move/delete, policy meaning changes, graph/prose conflict resolution, or project convention changes.

5. Report.
   - Summarize generated files changed, blocking health issues, cleanup applied, and cleanup proposals that need approval.
   - Run `git -C .codex/dev-wiki/source status --short`.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not edit plan wiki files.
- Do not compare the whole repository to wiki prose; use `dev-wiki-audit` for that.
- Do not edit `{project}/graph/**` except by running `dev-wiki-graph`.
- Do not create manual tag index pages. Tags are observed from document frontmatter and reported through generated indexes.
- Do not treat generated drift proposals as approved semantic changes.
