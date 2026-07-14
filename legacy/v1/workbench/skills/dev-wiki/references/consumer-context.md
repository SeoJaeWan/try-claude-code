# Dev Wiki Consumer Context

## Purpose

Use `dev_wiki_root` as the project-specific development reference root after Workbench has verified and refreshed `{dev-wiki-root}/source`.

`plan_wiki_root` still owns planning policy, artifact contracts, review gates, and learned planning patterns. `dev_wiki_root` owns project-specific conventions, architecture notes, workflow commands, and graph navigation.

## Input

In orchestrated mode, consume only the controller-provided path:

```text
dev_wiki_root: ${CODEX_HOME:-~/.codex}/workbench/dev-wiki/source/{project}
```

Do not rediscover, create, clone, pull, repair, or rewrite the dev wiki source clone from a downstream planning role. `$dev-wiki` owns setup, freshness, and repair.

## Standard Documents

Read only the documents relevant to the current role and plan scope.

Common starting points:

- `README.md`
- `project.json`
- `conventions/folder-structure.md`
- `conventions/naming.md`
- `conventions/testing.md`
- `architecture/overview.md`
- `architecture/layers.md`
- `architecture/module-boundaries.md`
- `architecture/state.md`
- `architecture/external-boundaries.md`
- `workflows/commands.md`
- `workflows/test-and-quality.md`
- `graph/overview.md`
- `graph/architecture-map.md`
- `graph/symbol-map.md`
- `graph/call-map.md`
- `graph/external-boundaries.md`

## Precedence

For project-specific facts such as folder placement, module ownership, local commands, naming, tests, and graph navigation, use this precedence:

1. Current repo source, config, scripts, and existing tests
2. Dev wiki project-specific guidance under `dev_wiki_root`

For planning policy, use `plan_wiki_root`. Plan wiki owns plan artifact shape, planning workflow, review/TDD gate meaning, and learned planning patterns. Dev wiki must not redefine those shared planning contracts.

If dev wiki conflicts with current repo facts, treat the dev wiki as possibly stale. Do not silently plan from stale guidance; record the conflict as a planning note, review finding, or blocker depending on whether it changes execution topology or validation.

## Role Use

- Use dev wiki to identify project conventions, likely file placement, module boundaries, workflow commands, and graph entry points. Verify every committed source/test path against the repo.
- Use dev wiki testing and workflow docs to choose test owner placement and validation commands. Verify against actual test config and existing tests before writing.
- Use dev wiki to check whether implementation choices fit project conventions, module boundaries, folder structure, and workflow commands. Report conflicts instead of silently editing wiki files.
