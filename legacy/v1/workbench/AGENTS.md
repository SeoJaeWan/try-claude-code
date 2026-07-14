# Workbench Agent Instructions

## Dev Wiki Context
- When working in a target project through Workbench skills, first check whether the project has opted into the Workbench dev wiki.
- Resolve the dev wiki from `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`, using `config.json` and `workspaces.json` to map the current workspace to its project folder.
- If the project wiki exists, use it as implementation context for project conventions, folder structure, architecture boundaries, workflow commands, testing patterns, generated file rules, and naming/routing guidance.
- Prefer relevant dev wiki documents under `conventions/`, `architecture/`, `workflows/`, and `graph/` before inventing or inferring project structure from scratch.
- Treat dev wiki as guidance, not product requirements. Jira, Figma, OpenAPI, repository source, and explicit user input remain the authoritative sources for task requirements.
- If dev wiki conflicts with current repository evidence, treat the wiki as possibly stale, follow repository evidence for the current change, and mention the conflict in the handoff.
- If the project is not opted into dev wiki, continue from repository evidence and local examples. Do not bootstrap or modify dev wiki as a side effect of ordinary work.

## Scope
- Keep dev wiki reads scoped to the selected Work Unit or requested report.
- Do not start a broad wiki audit, graph refresh, or documentation update unless the user explicitly asks for dev wiki maintenance.
