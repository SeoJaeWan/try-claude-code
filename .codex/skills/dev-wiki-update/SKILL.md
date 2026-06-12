---
name: dev-wiki-update
description: Update a project-specific dev wiki from user-provided rules or observable repository facts, including conventions, folder structure, architecture notes, workflow commands, Git/commit conventions, release flows, and development constraints. Use when the user says to add, change, record, infer, refresh, or sync project knowledge into dev wiki, excluding graph artifacts handled by `dev-wiki-graph`; requires `.codex/dev-wiki/config.json` and the matching project folder prepared by `dev-wiki-setup`.
---

# Dev Wiki Update

Fold user-provided project rules and observable repository facts into the current project wiki. Keep the wiki as a current, human-readable development reference rather than an append-only log.

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

3. Inspect repository evidence when the user asks to infer, refresh, or sync project knowledge.
   - Read only evidence relevant to the target documents.
   - Common evidence includes `package.json`, config files, CI workflows, source roots, route folders, test files, API clients, env references, docs, and recent Git history.
   - Use Git history for observed commit message patterns, branch names, merge style, tags, and release hints when needed.
   - Do not update `{project}/graph/`; use `dev-wiki-graph` for graph artifacts.

4. Integrate the rule or observed fact.
   - Write in Korean-first prose. Keep English only for literal identifiers, paths, commands, package names, API names, schema keys, and user-quoted terms.
   - Convert user rules into durable guidance: scope, rule, reason, examples, and exclusions when needed.
   - Convert repository evidence into durable current-state guidance, and label uncertainty instead of pretending it is policy.
   - Distinguish confirmed rules, observed conventions, and items that need confirmation.
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
- Do not silently invent missing policy. If the rule depends on a project decision the user did not provide and local context cannot prove it, label it as an observed convention or ask before writing.
- Do not promote commit history, folder shape, or repeated code patterns into mandatory policy unless a config file, existing docs, or the user confirms that they are rules.
- Do not turn a one-off implementation note into a global project convention unless the user frames it as a rule.
- Do not duplicate the same rule across many files; choose one owner and link to it if necessary.
