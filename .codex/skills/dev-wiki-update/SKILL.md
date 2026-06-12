---
name: dev-wiki-update
description: Update a project-specific dev wiki from explicit user-provided rules, conventions, architecture notes, workflow commands, or development constraints. Use when the user says to add, change, record, or update a specific rule or note into dev wiki. Do not use for full repository-vs-wiki synchronization; use `dev-wiki-sync` for project-wide sync, and `dev-wiki-graph` for graph artifacts. Requires `.codex/dev-wiki/config.json` and the matching project folder prepared by `dev-wiki-setup`.
---

# Dev Wiki Update

Fold explicit user-provided project rules into the current project wiki. Keep the wiki as a current, human-readable development reference rather than an append-only log.

## Required Reading

Read these references before editing wiki files:

1. [references/update-contract.md](references/update-contract.md)
2. [references/document-targets.md](references/document-targets.md)

## Workflow

1. Verify opt-in.
   - Read `./.codex/dev-wiki/config.json`.
   - If it is missing, stop and route to `dev-wiki-setup`; do not infer a project name.
   - Resolve the project root as `./.codex/dev-wiki/source/{project}`.

2. Inspect current wiki content.
   - Read the relevant target documents under `conventions/`, `architecture/`, or `workflows/`.
   - Prefer updating an existing document and section when the rule belongs there.
   - Use the standard document names from `./.codex/dev-wiki/source/_meta/schema.md` when present.
   - Create a new document only when no standard document can own the rule cleanly.

3. Inspect narrow supporting evidence only when needed.
   - Use repository files only to place or reconcile the user-provided rule.
   - Do not perform a full schema-wide repository sync; route that work to `dev-wiki-sync`.
   - Do not update `{project}/graph/`; use `dev-wiki-graph` for graph artifacts.

4. Integrate the explicit rule.
   - Write in Korean-first prose. Keep English only for literal identifiers, paths, commands, package names, API names, schema keys, and user-quoted terms.
   - Convert user rules into durable guidance: scope, rule, reason, examples, and exclusions when needed.
   - Replace stale or conflicting text instead of stacking contradictory bullets.
   - Use Obsidian wikilinks for direct project-wiki relationships when helpful.

5. Verify and report.
   - Run `git -C .codex/dev-wiki/source status --short`.
   - Summarize changed dev wiki files and unresolved decisions.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not write update history files; Git diff and commit messages are the record.
- Do not edit plan wiki files.
- Do not edit `{project}/graph/`; graph files are owned by `dev-wiki-graph`.
- Do not infer or refresh unrelated standard documents during `dev-wiki-update`; use `dev-wiki-sync` for that.
- Do not silently invent missing policy. If the rule depends on a project decision the user did not provide and local context cannot prove it, ask before writing.
- Do not turn a one-off implementation note into a global project convention unless the user frames it as a rule.
- Do not duplicate the same rule across many files; choose one owner and link to it if necessary.
