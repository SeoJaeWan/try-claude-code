# Workbench Agent Instructions

## Dev Wiki Context
- When working in a target project through Workbench skills, first check whether the project has opted into the Workbench dev wiki.
- Resolve the dev wiki from `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`. Prefer an exact `workspaces.json` mapping; when no mapping exists, use an unambiguous `source/{workspace-basename}` folder whose `project.json` matches the folder name.
- If the project wiki exists, brainstorm and executor must use it as implementation context for project conventions, folder structure, architecture boundaries, workflow commands, testing patterns, generated file rules, and naming/routing guidance without requiring a separate `dev-wiki` request.
- Prefer relevant dev wiki documents under `conventions/`, `architecture/`, `workflows/`, and `graph/` before inventing or inferring project structure from scratch.
- Treat dev wiki as guidance, not product requirements. Jira, Figma, OpenAPI, repository source, and explicit user input remain the authoritative sources for task requirements.
- If dev wiki conflicts with current repository evidence, treat the wiki as possibly stale, follow repository evidence for the current change, and mention the conflict in the handoff.
- If no exact project wiki can be resolved, continue from repository evidence and local examples. Do not guess among ambiguous folders, bootstrap, or modify dev wiki as a side effect of ordinary work.

## Scope
- Keep dev wiki reads scoped to the active Goal Contract, current brainstorm decision, or requested report.
- Do not start a broad wiki audit, graph refresh, or documentation update unless the user explicitly asks for dev wiki maintenance.
