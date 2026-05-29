---
name: dev-wiki-update
description: Update a project-specific dev wiki with user-provided project rules, conventions, folder-structure guidance, architecture notes, workflow commands, or development constraints. Use when the user says to add, change, record, or sync a project rule into dev wiki; requires `.codex/dev-wiki/config.json` and the matching project folder prepared by `dev-wiki-setup`.
---

# Dev Wiki Update

Fold user-provided project rules into the current project wiki. Keep the wiki as a current, human-readable development reference rather than an append-only log.

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
   - Create a new document only when no existing document can own the rule cleanly.

3. Integrate the rule.
   - Write in Korean-first prose. Keep English only for literal identifiers, paths, commands, package names, API names, schema keys, and user-quoted terms.
   - Convert the user rule into durable guidance: scope, rule, reason, examples, and exclusions when needed.
   - Replace stale or conflicting text instead of stacking contradictory bullets.
   - Use Obsidian wikilinks for direct project-wiki relationships when helpful.

4. Verify and report.
   - Run `git -C .codex/dev-wiki/source status --short`.
   - Summarize changed dev wiki files and unresolved decisions.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not write update history files; Git diff and commit messages are the record.
- Do not edit plan wiki files.
- Do not silently invent missing policy. If the rule depends on a project decision the user did not provide and local context cannot prove it, ask before writing.
- Do not turn a one-off implementation note into a global project convention unless the user frames it as a rule.
- Do not duplicate the same rule across many files; choose one owner and link to it if necessary.
