---
name: llm-script
description: Explicit-invocation-only setup and status inspection for Workbench's collection-only script-source capture. Invoke only as `$workbench:llm-script`. Use setup to opt the current workspace into capture, or use status to inspect existing configuration. Do not analyze, aggregate, promote, or generate scripts; setup and status do not sync Git.
---

# LLM Script Capture

Run this skill only when the user explicitly invokes `$workbench:llm-script`. It has two modes:

- **status**: inspect the current workspace's capture configuration without changing it. This is the default when the user does not name a mode.
- **setup**: explicitly opt the current workspace into script-source capture and prepare the central collection clone.

This skill manages setup and status only. It does not inspect captured source for patterns, build summaries, choose automation candidates, promote code into scripts, or generate scripts.

The plugin's `PostToolUse` hook runs independently after matching shell tool calls. That automatic runtime capture is not an implicit invocation of this skill. Until `setup` registers a workspace, the hook must silently do nothing for that workspace.

The plugin also has an independent `SessionStart` hook. On `startup` and `resume`, it attempts `git pull --ff-only` only when the central LLM Script `source` clone already exists. A missing clone is a silent no-op. This hook does not create configuration, clone a repository, or opt in the current workspace.

## Common Paths

Resolve this skill directory from the loaded `SKILL.md` path and use its bundled scripts.

The default collection root is:

```text
${CODEX_HOME:-~/.codex}/workbench/llm-script
```

It contains configuration, workspace opt-in mappings, and a `source` clone of the collection repository. Do not create a project-local collection directory unless the user explicitly requests a different root.

Before operating, read `references/collection-contract.md`.

## Status

Use `status` unless the user explicitly asks to set up, enable, opt in, connect, or repair capture.

1. Resolve the current workspace root and the collection root.
2. Read `config.json` and `workspaces.json` if they exist. Missing files mean the workspace is not configured; do not create them in status mode.
3. Verify whether the current workspace has an enabled mapping and whether the configured `source` clone exists.
4. If the clone exists, run `git -C "<resolved-collection-root>/source" status --short` only to report its working-tree state.
5. Report configured/not configured, enabled/disabled, the mapped project name, collection root, clone availability, and Git working-tree state.

Do not read, count, categorize, summarize, deduplicate, or modify captured records during status.

## Setup

Enter setup mode only when the explicit `$workbench:llm-script` request also asks to set up, enable, opt in, connect, or repair capture.

Run the bundled staging script with an explicit workspace root:

```bash
node <skill-dir>/scripts/stage-llm-script.mjs --workspace-root "$PWD"
```

Pass `--project`, `--repo`, or `--branch` only when the user supplies or intentionally confirms an override. `--llm-script-root` is intended for isolated testing or an environment where `LLM_SCRIPT_ROOT` is persistently available to future hook processes; a one-off shell assignment does not redirect later hook calls. After staging:

1. Verify `config.json`, `workspaces.json`, and the `source` clone.
2. Confirm that the canonical current workspace is registered and capture-enabled.
3. Run `git -C "<resolved-collection-root>/source" status --short` and report collection-repository changes separately from workspace changes.

Setup must not pull, add, commit, push, merge, rebase, reset, clean, or stash the collection repository.

## Guardrails

- Treat `llm-script` as append-only collection evidence, not as a reusable script library.
- Collect detected commands and their entrypoint source snapshots only. Never add a reason, prompt, transcript, session log, environment dump, stdout, stderr, or execution result.
- Do not aggregate, rank, deduplicate, catalog, analyze, or promote records.
- Do not generate scripts from the records.
- Do not inspect imported dependencies recursively; capture only the detected entrypoint source.
- Do not opt in a workspace implicitly. A missing or disabled mapping means capture remains off.
- Do not edit or remove existing records as part of setup or status.
- Setup and status must not synchronize Git. The independent `SessionStart` hook may fast-forward an already-existing source clone; it never clones, opts in, stashes, resets, commits, or pushes.
- Treat hook capture as best-effort telemetry, not as a complete execution audit.
