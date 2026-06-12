---
name: dev-wiki-sync
description: Synchronize a project dev wiki with the current repository by inspecting every standard non-graph wiki document and observable project evidence. Use when the user asks to sync, refresh, audit, fill, reconcile, or compare dev wiki against the real project. Updates `README.md`, `project.json`, `conventions/`, `architecture/`, and `workflows/`; excludes graph artifacts owned by `dev-wiki-graph`. Requires `.codex/dev-wiki/config.json` and the matching project folder prepared by `dev-wiki-setup`.
---

# Dev Wiki Sync

Synchronize the project dev wiki with current repository facts. This skill is for schema-wide repository-vs-wiki refreshes; use `dev-wiki-update` when the user only gives an explicit rule to record.

## Required Reading

Read these references before editing wiki files:

1. [references/sync-contract.md](references/sync-contract.md)
2. [references/evidence-targets.md](references/evidence-targets.md)

## Workflow

1. Verify opt-in.
   - Read `./.codex/dev-wiki/config.json`.
   - If missing, stop and route to `dev-wiki-setup`.
   - Resolve project root as `./.codex/dev-wiki/source/{project}`.

2. Inspect schema and current wiki.
   - Read `./.codex/dev-wiki/source/_meta/schema.md`.
   - Inspect every standard non-graph target: project root docs, `conventions/`, `architecture/`, and `workflows/`.
   - Treat untracked standard documents as valid sync targets.
   - Exclude `{project}/graph/`; report graph changes but do not edit them.

3. Gather repository evidence.
   - Read only evidence needed to update standard targets.
   - Common evidence includes package manifests, config, CI workflows, folder structure, source roots, tests, API clients, env references, docs, and recent Git history.
   - Prefer current source, config, scripts, and tests over stale wiki prose.

4. Sync wiki content.
   - Write Korean-first prose. Keep English for literal identifiers, paths, commands, package names, API names, schema keys, and exact user terms.
   - For each standard non-graph document, update it from evidence or record `해당 없음`, `추정`, or `확인 필요`.
   - Do not leave a schema-owned document empty merely because evidence is incomplete.
   - Do not promote observed patterns into mandatory rules unless user docs, config, or tooling proves enforcement.

5. Verify and report.
   - Run `git -C .codex/dev-wiki/source status --short`.
   - Report updated files, evidence level, skipped standard files with evidence checked, excluded graph files, confirmation-needed items, and verification status.
   - List every `확인 필요` item separately so the user can confirm or correct it in a follow-up.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not edit plan wiki files.
- Do not edit `{project}/graph/`; graph files are owned by `dev-wiki-graph`.
- Do not write update history files; Git diff and commit messages are the record.
- Do not silently invent mandatory policy. Use `관찰된 관례`, `추정`, or `확인 필요` when enforcement is not proven.
- Do not skip `architecture/`, `workflows/`, `ui.md`, `rule-application.md`, or untracked standard files during a normal sync.
- Do not overwrite populated docs wholesale; reconcile sections and preserve useful human-written guidance.
