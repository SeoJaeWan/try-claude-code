---
name: dev-wiki
description: Explicit-invocation-only management for a project dev wiki. Invoke only as `$workbench:dev-wiki`, then route setup, audit, update, lint, graph, and maintenance work through this single skill in the Workbench-owned dev wiki root, defaulting to `${CODEX_HOME:-~/.codex}/workbench/dev-wiki/source/{project}`. Do not edit plan wiki files.
---

# Dev Wiki

Run this skill only when the user explicitly invokes `$workbench:dev-wiki`. Use it as the single entry point for project-specific dev wiki work. After invocation, infer the setup, audit, update, lint, graph, or maintenance mode from the request and continue in small, reviewable steps.

Dev wiki stores project-specific development conventions, architecture notes, workflows, and graph artifacts. It is separate from plan wiki, which stores shared planning knowledge.

By default, dev wiki data lives outside the project workspace at `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`. Do not create a project-local `.codex/dev-wiki` for new setups unless the user explicitly asks for a legacy/local layout.

## Mode Routing

Choose one primary mode:

- **setup**: the project should opt in to dev wiki, the Workbench dev wiki root is missing or stale, the source clone is missing, or the user asks to create, connect, bootstrap, verify, or repair dev wiki.
- **audit**: the user asks whether the wiki matches the repository, wants stale or missing documentation found, or asks for a repo-vs-wiki consistency check.
- **update**: the user gives an explicit rule, convention, architecture note, workflow, command, or development constraint and asks to record, change, or update dev wiki.
- **lint**: the user asks for wiki health, generated indexes, frontmatter, links, tags, metadata, normalization proposals, or maintenance without comparing the whole repository.
- **graph**: the user asks to build, refresh, inspect, or visualize the project graph, or asks for navigation maps from repository facts.
- **sync**: deprecated wording. Route broad sync requests to audit first; apply updates only after explicit user approval or a direct update request.

If the user asks a broad question like "dev wiki 봐줘", start with lint plus a brief opt-in check. If the user asks "현재 코드랑 비교해줘", use audit. If the user asks "이 규칙 기록해줘", use update.

## Common Setup

1. Work from the current workspace root.
2. Resolve this skill directory from the loaded `SKILL.md` path. Use bundled scripts from `scripts/`.
3. Resolve `DEV_WIKI_ROOT="${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki"` unless the user provides a different root.
4. Read `$DEV_WIKI_ROOT/config.json` and `$DEV_WIKI_ROOT/workspaces.json` before any non-setup mode.
5. If config or workspace mapping is missing:
   - For explicit setup requests, run setup.
   - For other requests, stop and tell the user the project has not opted in yet.
6. Resolve the project wiki root as `$DEV_WIKI_ROOT/source/{project}`.
7. Use legacy `.codex/dev-wiki` only as a fallback for existing projects; do not create it for new setups.
8. Do not edit `.codex/plan-wiki/**` or any plan wiki files.
9. Do not commit, push, merge, rebase, reset, clean, or stash the dev wiki source repo unless the user explicitly asks.

Run bundled scripts with an explicit workspace root so they work from an installed plugin cache:

```bash
DEV_WIKI_ROOT="${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki"
node <skill-dir>/scripts/stage-dev-wiki.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"
node <skill-dir>/scripts/wiki-index.mjs --mode dev --root "$DEV_WIKI_ROOT/source/<project>"
node <skill-dir>/scripts/generate-dev-wiki-graph.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"
```

## Mode Workflows

### setup

Before writing, read:

- `references/staging-contract.md`
- `references/bootstrap-layout.md`
- `references/sync-policy.md`

Workflow:

1. Run `node <skill-dir>/scripts/stage-dev-wiki.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"`.
2. Pass `--project <name>` only when the user provides or confirms the project folder name.
3. Use `--repo` and `--branch` only when overriding defaults intentionally.
4. Verify `$DEV_WIKI_ROOT/source` and the configured project folder.
5. Run `git -C "$DEV_WIKI_ROOT/source" status --short` and report dev wiki repo changes separately from the workspace repo.

### audit

Before comparing, read `references/audit-contract.md`.

Workflow:

1. Verify opt-in and project root.
2. Refresh generated indexes:
   `node <skill-dir>/scripts/wiki-index.mjs --mode dev --root "$DEV_WIKI_ROOT/source/<project>"`.
3. Read `<project>/generated/wiki-health.md`.
4. Inspect only repository evidence needed for the requested audit scope: package manifests, scripts, configs, CI, source roots, tests, env references, routes, API clients, and recent Git changes.
5. Compare `project.json`, `conventions/`, `architecture/`, `workflows/`, and graph freshness.
6. Report findings first. Apply corrections only when the user asked for the specific update or explicitly approves the correction.

### update

Before editing wiki prose, read:

- `references/update-contract.md`
- `references/document-targets.md`

Workflow:

1. Verify opt-in and project root.
2. Read the relevant existing documents under `conventions/`, `architecture/`, or `workflows/`.
3. Inspect narrow repository evidence only when needed to place or reconcile the user-provided rule.
4. Write Korean-first prose. Keep English for literal identifiers, paths, commands, packages, APIs, schema keys, and quoted terms.
5. Integrate durable guidance: scope, rule, reason, examples, and exclusions when useful.
6. Replace stale or conflicting text instead of stacking contradictory bullets.
7. Refresh indexes with `wiki-index.mjs`.
8. Read `generated/wiki-health.md` and `generated/normalize-proposals.md`; apply only safe mechanical cleanup.
9. Run `git -C "$DEV_WIKI_ROOT/source" status --short` and summarize changed wiki files.

### lint

Before scanning, read `references/maintenance-pipeline.md`.

Workflow:

1. Verify opt-in and project root.
2. Refresh generated indexes with `wiki-index.mjs`.
3. Read `generated/wiki-health.md` and `generated/normalize-proposals.md`.
4. Inspect source files only as needed to verify reported missing type, missing frontmatter, broken links, tag drift, one-off tags, or generated staleness.
5. Apply only safe mechanical cleanup: generated refresh, duplicate frontmatter list entries, obvious whitespace around metadata values, and stale generated files.
6. Ask before tag merges, term normalization, document moves/deletes, policy meaning changes, graph/prose conflict resolution, or convention changes.

### graph

Before generating graph artifacts, read:

- `references/graph-contract.md`
- `references/analysis-guide.md`

Workflow:

1. Verify opt-in and project root.
2. Run `node <skill-dir>/scripts/generate-dev-wiki-graph.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"`.
3. Pass `--project <name>` only when intentionally overriding config.
4. Read generated graph artifacts when needed and improve scanner logic only for factual extraction or noise reduction.
5. Do not add project-specific domain, layer, owner, product, or business classifications to the generator.
6. Refresh indexes with `wiki-index.mjs` after graph output changes.
7. Run `git -C "$DEV_WIKI_ROOT/source" status --short`.

## Guardrails

- Do not make a project use dev wiki implicitly. Missing central config or workspace mapping means not opted in unless the user asked to set it up.
- This opt-in gate controls dev-wiki setup and maintenance. Explicitly invoked consumers such as `$workbench:brainstorm` and `$workbench:executor` may read an existing unambiguous `source/{workspace-basename}` project folder without changing opt-in state, according to the Workbench consumer contract.
- Do not overwrite whole wiki documents with generated summaries.
- Do not create `history/` directories; Git commits are the change history.
- Do not create manual tag index pages; generated indexes own tag and link indexes.
- Do not edit `{project}/graph/**` outside graph mode.
- Do not turn observed repository patterns into mandatory conventions without user confirmation.
- Do not silently invent policy. Ask when the rule depends on a project decision that local evidence cannot prove.
- Do not duplicate one rule across many files; choose one owner and link to it when useful.
