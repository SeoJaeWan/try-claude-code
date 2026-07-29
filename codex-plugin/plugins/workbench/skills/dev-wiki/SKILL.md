---
name: dev-wiki
description: Explicit-invocation-only management for the Workbench-owned Dev Wiki source bundle and its project folders. Invoke only as `$workbench:dev-wiki`; treat an unqualified request to refresh, sync, pull, or get the latest Dev Wiki as a whole-bundle source-repository refresh, and use setup, audit, content update, lint, or graph only for an explicit project scope. Default to `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`. Do not edit plan wiki files.
---

# Dev Wiki

Run this skill only when the user explicitly invokes `$workbench:dev-wiki`. Use it as the single entry point for whole-bundle source freshness and project-specific dev wiki work. After invocation, infer the refresh, setup, audit, update, lint, graph, or maintenance mode from the request and continue in small, reviewable steps.

Dev Wiki is one central Git/Obsidian source bundle at `${CODEX_HOME:-~/.codex}/workbench/dev-wiki/source`. It contains project folders that store project-specific development conventions, architecture notes, workflows, and graph artifacts. Treat an unqualified reference to Dev Wiki itself as this whole bundle, not as the current workspace's project folder. Dev Wiki is separate from plan wiki, which stores shared planning knowledge.

By default, dev wiki data lives outside the project workspace at `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`. Do not create a project-local `.codex/dev-wiki` for new setups unless the user explicitly asks for a legacy/local layout.

## Source Policy

- Use only the local `main` branch tracking `origin/main`. Do not inspect, check out, create, merge, or update another dev wiki branch.
- A bundle-level refresh operates on `{dev-wiki-root}/source` as one Git repository. It does not read or require `workspaces.json`, a current project mapping, or project opt-in.
- Before the first operation that can change `{dev-wiki-root}/source`, run the freshness preflight once for the current invocation:
  `node <skill-dir>/scripts/refresh-dev-wiki.mjs --dev-wiki-root "$DEV_WIKI_ROOT"`.
- Treat generated index refreshes, lint cleanup, graph generation, and wiki prose edits as source changes that require the preflight.
- In setup mode, `stage-dev-wiki.mjs` owns this preflight: it clones only `main` when source is missing and fast-forwards `main` before creating or repairing files when source exists.
- If the source is dirty, the branch or upstream is not `main`/`origin/main`, the remote differs from config, the pull cannot fast-forward, or local commits remain after pull, stop and report the exact condition. Do not switch branches, stash, merge, rebase, reset, clean, or rewrite the remote automatically.

## Mode Routing

Choose one primary mode:

- **refresh**: the user asks to refresh, update, sync, pull, or get the latest Dev Wiki itself without naming a project document or repository comparison. This includes requests such as "Dev Wiki 최신화해줘", "저장소에서부터 받아와", and "Dev Wiki 전체를 갱신해줘". Refresh the central source bundle only; do not infer the current project, require opt-in, regenerate project artifacts, or edit wiki prose.
- **setup**: the project should opt in to dev wiki, the Workbench dev wiki root is missing or stale, the source clone is missing, or the user asks to create, connect, bootstrap, verify, or repair dev wiki.
- **audit**: the user asks whether the wiki matches the repository, wants stale or missing documentation found, or asks for a repo-vs-wiki consistency check.
- **update**: the user gives an explicit rule, convention, architecture note, workflow, command, or development constraint and asks to record, change, or update dev wiki.
- **lint**: the user asks for wiki health, generated indexes, frontmatter, links, tags, metadata, normalization proposals, or maintenance without comparing the whole repository.
- **graph**: the user asks to build, refresh, inspect, or visualize the project graph, or asks for navigation maps from repository facts.

Route by the object the user names, not merely by the verb:

- "Dev Wiki 최신화해줘" means refresh the whole source bundle.
- "현재 코드랑 프로젝트 위키를 비교해줘" means audit the current project.
- "이 규칙을 프로젝트 위키에 기록해줘" means update the explicitly targeted project.
- A broad question such as "프로젝트 dev wiki 봐줘" means lint plus a brief project opt-in check.

## Common Setup

1. Work from the current workspace root.
2. Resolve this skill directory from the loaded `SKILL.md` path. Use bundled scripts from `scripts/`.
3. Resolve `DEV_WIKI_ROOT="${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki"` unless the user provides a different root.
4. For refresh mode, read `$DEV_WIKI_ROOT/config.json`, require `"branch": "main"`, and treat `$DEV_WIKI_ROOT/source` as the complete Dev Wiki bundle. Do not read or require `workspaces.json`.
5. For project-scoped audit, update, lint, or graph mode, read `$DEV_WIKI_ROOT/config.json` and `$DEV_WIKI_ROOT/workspaces.json`.
6. If config or workspace mapping is missing for a project-scoped mode:
   - For explicit setup requests, run setup.
   - For other requests, stop and tell the user the project has not opted in yet.
7. Require `config.json` to use `"branch": "main"`; route a missing or different branch to setup repair.
8. Resolve and verify the project wiki root as `$DEV_WIKI_ROOT/source/{project}` only for project-scoped modes.
9. Before any source-changing command in a non-setup mode, run `refresh-dev-wiki.mjs`. Do not continue unless it succeeds.
10. Use legacy `.codex/dev-wiki` only as a fallback for existing projects; do not create it for new setups.
11. Do not edit `.codex/plan-wiki/**` or any plan wiki files.
12. Do not commit, push, merge, rebase, reset, clean, or stash the dev wiki source repo unless the user explicitly asks.

Run bundled scripts with an explicit workspace root so they work from an installed plugin cache:

```bash
DEV_WIKI_ROOT="${CODEX_HOME:-$HOME/.codex}/workbench/dev-wiki"
node <skill-dir>/scripts/refresh-dev-wiki.mjs --dev-wiki-root "$DEV_WIKI_ROOT"
node <skill-dir>/scripts/stage-dev-wiki.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"
node <skill-dir>/scripts/wiki-index.mjs --mode dev --root "$DEV_WIKI_ROOT/source/<project>"
node <skill-dir>/scripts/generate-dev-wiki-graph.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"
```

## Mode Workflows

### refresh

Before refreshing, read `references/sync-policy.md`.

Workflow:

1. Resolve the central Dev Wiki root and read `config.json`.
2. Require the configured branch to be `main`. Do not resolve the current workspace, read `workspaces.json`, or check project opt-in.
3. Record the current source `HEAD`, then run:
   `node <skill-dir>/scripts/refresh-dev-wiki.mjs --dev-wiki-root "$DEV_WIKI_ROOT"`.
4. Verify `$DEV_WIKI_ROOT/source` is clean on local `main` tracking `origin/main` and that local `HEAD` equals `origin/main`.
5. Report whether the whole source bundle advanced and show the before/after commit IDs. Do not refresh indexes, generate graphs, or edit project wiki files.
6. If config or the source clone is missing, report that central setup is required. Do not create a workspace mapping unless the user explicitly asks to set up a project.

### setup

Before writing, read:

- `references/staging-contract.md`
- `references/bootstrap-layout.md`
- `references/sync-policy.md`

Workflow:

1. Run `node <skill-dir>/scripts/stage-dev-wiki.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"`.
2. Pass `--project <name>` only when the user provides or confirms the project folder name.
3. Use `--repo` only when overriding the configured remote intentionally. The branch is fixed to `main`; do not pass another branch.
4. Verify `$DEV_WIKI_ROOT/source` and the configured project folder.
5. Run `git -C "$DEV_WIKI_ROOT/source" status --short` and report dev wiki repo changes separately from the workspace repo.

### audit

Before comparing, read `references/audit-contract.md`.

Workflow:

1. Verify opt-in and project root.
2. Run the source freshness preflight.
3. Refresh generated indexes:
   `node <skill-dir>/scripts/wiki-index.mjs --mode dev --root "$DEV_WIKI_ROOT/source/<project>"`.
4. Read `<project>/generated/wiki-health.md`.
5. Inspect only repository evidence needed for the requested audit scope: package manifests, scripts, configs, CI, source roots, tests, env references, routes, API clients, and recent Git changes.
6. Compare `project.json`, `conventions/`, `architecture/`, `workflows/`, and graph freshness.
7. Report findings first. Apply corrections only when the user asked for the specific update or explicitly approves the correction.

### update

Before editing wiki prose, read:

- `references/update-contract.md`
- `references/document-targets.md`

Workflow:

1. Verify opt-in and project root.
2. Run the source freshness preflight before reading the documents to edit.
3. Read the relevant existing documents under `conventions/`, `architecture/`, or `workflows/`.
4. Inspect narrow repository evidence only when needed to place or reconcile the user-provided rule.
5. Write Korean-first prose. Keep English for literal identifiers, paths, commands, packages, APIs, schema keys, and quoted terms.
6. Integrate durable guidance: scope, rule, reason, examples, and exclusions when useful.
7. Replace stale or conflicting text instead of stacking contradictory bullets.
8. Refresh indexes with `wiki-index.mjs`.
9. Read `generated/wiki-health.md` and `generated/normalize-proposals.md`; apply only safe mechanical cleanup.
10. Run `git -C "$DEV_WIKI_ROOT/source" status --short` and summarize changed wiki files.

### lint

Before scanning, read `references/maintenance-pipeline.md`.

Workflow:

1. Verify opt-in and project root.
2. Run the source freshness preflight.
3. Refresh generated indexes with `wiki-index.mjs`.
4. Read `generated/wiki-health.md` and `generated/normalize-proposals.md`.
5. Inspect source files only as needed to verify reported missing type, missing frontmatter, broken links, tag drift, one-off tags, or generated staleness.
6. Apply only safe mechanical cleanup: generated refresh, duplicate frontmatter list entries, obvious whitespace around metadata values, and stale generated files.
7. Ask before tag merges, term normalization, document moves/deletes, policy meaning changes, graph/prose conflict resolution, or convention changes.

### graph

Before generating graph artifacts, read:

- `references/graph-contract.md`
- `references/analysis-guide.md`

Workflow:

1. Verify opt-in and project root.
2. Run the source freshness preflight.
3. Run `node <skill-dir>/scripts/generate-dev-wiki-graph.mjs --workspace-root "$PWD" --dev-wiki-root "$DEV_WIKI_ROOT"`.
4. Pass `--project <name>` only when intentionally overriding config.
5. Read generated graph artifacts when needed and improve scanner logic only for factual extraction or noise reduction.
6. Do not add project-specific domain, layer, owner, product, or business classifications to the generator.
7. Refresh indexes with `wiki-index.mjs` after graph output changes.
8. Run `git -C "$DEV_WIKI_ROOT/source" status --short`.

## Guardrails

- Do not make a project use dev wiki implicitly. Missing central config or workspace mapping means not opted in for project-scoped setup and maintenance unless the user asked to set it up.
- Do not gate whole-bundle refresh on the current workspace mapping. Project opt-in and central source freshness are independent.
- Do not reinterpret an unqualified Dev Wiki refresh as a repository-vs-project-wiki audit or project content update.
- This opt-in gate controls dev-wiki setup and maintenance. Explicitly invoked consumers such as `$workbench:brainstorm` and `$workbench:executor` may read an existing unambiguous `source/{workspace-basename}` project folder without changing opt-in state, according to the Workbench consumer contract.
- Do not overwrite whole wiki documents with generated summaries.
- Do not create `history/` directories; Git commits are the change history.
- Do not create manual tag index pages; generated indexes own tag and link indexes.
- Do not edit `{project}/graph/**` outside graph mode.
- Do not turn observed repository patterns into mandatory conventions without user confirmation.
- Do not silently invent policy. Ask when the rule depends on a project decision that local evidence cannot prove.
- Do not duplicate one rule across many files; choose one owner and link to it when useful.
- Ignore non-`main` remote branches. Their existence does not authorize checkout, comparison, merge, deletion, or maintenance.
