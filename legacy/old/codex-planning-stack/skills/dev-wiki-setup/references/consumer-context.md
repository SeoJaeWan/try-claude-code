# Dev Wiki Consumer Context

## Purpose

Use `dev_wiki_root` as the project-local development reference root after orchestrator has verified and refreshed `.codex/dev-wiki/source`.

`plan_wiki_root` still owns planning policy, artifact contracts, review gates, and learned planning patterns. `dev_wiki_root` owns project-specific conventions, architecture notes, workflow commands, and graph navigation.

## Input

In orchestrated mode, consume only the controller-provided path:

```text
dev_wiki_root: .codex/dev-wiki/source/{project}
```

Do not rediscover, create, clone, pull, repair, or rewrite the dev wiki source clone from a planning role. Orchestrator owns freshness. `dev-wiki-setup` owns setup and repair.

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

- `plan-maker`: use dev wiki to identify project conventions, likely file placement, module boundaries, workflow commands, and graph entry points before locking topology. Verify every committed source/test path against the repo.
- `plan-tdd`: use dev wiki testing and workflow docs to choose test owner placement and validation commands. Verify against actual test config and existing tests before writing.
- `plan-review`: use dev wiki to check whether the plan and TDD report fit project conventions, module boundaries, folder structure, and workflow commands. Report conflicts instead of editing wiki files.
