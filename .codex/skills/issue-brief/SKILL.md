---
name: issue-brief
description: Jira issue briefing from Jira, Figma, and OpenAPI evidence. Use when the user gives a Jira issue URL/key, asks to summarize an issue before implementation, says "issue brief", "이슈 브리프", "Jira 일감 정리", "이 일감 정리해줘", or wants Codex to inspect Jira comments, linked Figma designs, and candidate Swagger/OpenAPI endpoints to identify required work, impact areas, open questions, and the next small implementation unit. This skill does not implement code, create plan files, run TDD, commit, or open PRs.
---

# issue-brief

## Purpose

Turn a Jira issue and its linked evidence into a concise implementation brief.
Use Jira as the source of truth, inspect linked Figma designs and candidate OpenAPI endpoints when present, and stop at a human-reviewable work breakdown.

## Core Rules

- Do NOT implement code.
- Do NOT create `plans/` artifacts.
- Do NOT run orchestrator, plan-maker, plan-review, or plan-tdd flows.
- Do NOT commit, push, open PRs, or modify Jira/Figma.
- Do NOT treat early comments as final when later comments contradict them.
- Do NOT invent requirements that are not supported by Jira, Figma, repository evidence, or explicit user input.
- If evidence is missing or inaccessible, ask for the missing Jira comment, Figma URL, screenshot, or copied text.

## Evidence Sources

Prefer live MCP evidence when available.

1. Jira / Atlassian
   - Use Atlassian/Jira MCP tools when exposed in the session.
   - If the tool names are not already available, search for Jira or Atlassian tools with `tool_search`.
   - Read the issue summary, description, status, linked/selected issue, labels, attachments, and comments.
   - If the user provides focused comment URLs, read those comments specifically and keep their comment IDs in the brief.

2. Figma
   - Extract every Figma URL from Jira description and comments.
   - Use Figma MCP read tools when available to inspect the target file/node/frame.
   - If only the general Figma execution tool is available, load the required Figma usage guidance first and run read-only inspection code only.
   - Never write to Figma from this skill.

3. Repository
   - Only inspect the repository when it helps map the issue to likely implementation areas.
   - Keep repository inspection lightweight: routes, screen/component names, API clients, state hooks, and tests.
   - Do not edit files.

4. OpenAPI / Swagger
   - Use an OpenAPI MCP tool when available; search for `openapi` tools with `tool_search` if needed.
   - Registered service hints:
     - `carplat-manager`: manager/admin APIs from `https://test-api-admin.carplat.co.kr/`
     - `carplat-web-app`: web/app APIs from `https://test-api.carplat.co.kr/`
     - `tms`: TMS APIs from `http://apis.preprod.turucar.com/tms/index.html`
   - Search endpoints using Jira/Figma domain words, screen names, feature names, and likely schema fields.
   - Refresh the relevant OpenAPI service cache before searching when API evidence is needed.
   - If the relevant service is unclear, refresh all registered services before searching.
   - If refresh fails but stale cache exists, continue with stale cache and explicitly mark the API evidence as stale.
   - Treat endpoint matches as candidates unless Jira, Figma, repo code, or user input confirms the exact API.
   - Include Swagger UI, OpenAPI spec, and endpoint candidate URLs so the user can open Swagger and manually try the request.
- Never call business API endpoints from this skill; read OpenAPI documents only.

## Workflow

### 1. Parse the Request

Identify:

- Jira issue key or URL
- selected/linked issue key from query parameters such as `selectedIssue=IF-545`
- focused Jira comment IDs such as `focusedCommentId=29621`
- Figma URLs, if the user already provided them
- user-stated intent or constraints

If the user provides both a parent issue and a selected issue, brief the selected issue as the implementation target while using the parent issue as context.

### 2. Collect Jira Evidence

Read the issue and comments. Classify evidence into:

- Planning / product requirement
- Design completed / design change
- Engineering note
- QA or bug report
- Decision
- Open question
- Outdated or superseded note

When comments conflict, prefer the latest explicit decision or the comment the user identified as design-complete/planning-complete. Mention the conflict instead of silently choosing.

### 3. Inspect Figma Evidence

For each Figma link:

- identify file, page, frame/node, and screen/component names
- capture what changed visually or behaviorally
- note design status if Jira says it is done
- map visible UI states: default, empty, loading, error, disabled, selected, expanded, permission-gated, etc.
- record implementation-relevant details only; do not reproduce the whole design spec

If the Figma link cannot be opened, keep the URL in the brief and mark it as blocked evidence.

### 4. Check Candidate APIs

When the issue may require API integration:

- choose likely services from the product surface: manager/admin, web/app, or TMS
- refresh the chosen OpenAPI service cache with `refresh_service`; refresh all services if the service cannot be inferred
- search OpenAPI endpoints by product terms, Korean labels, English identifiers, and schema fields
- inspect endpoint details only for strong candidates
- record method, path, request fields, response fields, and auth/security hints
- include `swaggerUrl`, `swaggerOperationUrl` when available, `specUrl`, and `endpointUrl`
- mark confidence as `candidate`, `likely`, or `confirmed`
- ask a backend/API question when no matching endpoint exists or multiple endpoints conflict

Do not block the brief if OpenAPI MCP is unavailable. State that API evidence was not checked.

### 5. Build the Work Breakdown

Translate evidence into small work units. Each unit must be narrow enough that the user can review it before moving to the next unit.

For every unit, include:

- Work unit title
- Evidence: Jira comment ID, issue field, Figma URL/node, or repo file
- Expected change
- Likely impact area: UI, frontend state, API integration, routing, validation, backend, DB, test, docs
- Candidate API if relevant: service, method, path, and confidence
- Acceptance check
- Unknowns or questions

Do not force the whole issue into one large plan. The output should help the user choose the next unit, not hand control to a long autonomous execution.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep code identifiers, issue keys, URLs, and exact product terms unchanged.

```markdown
**Issue Brief**

- Issue: `KEY-123` - <title>
- Context: <parent/selected issue relationship, status, and short goal>
- Evidence read: <Jira fields/comments, Figma links/nodes, repo areas if inspected>

**Confirmed Requirements**
- <requirement> (source: <comment id / field / Figma node>)

**Design Evidence**
- <screen/component>: <implementation-relevant design summary> (source: <Figma URL/node or Jira comment>)

**API Evidence**
- <service> <METHOD> `<path>`: <why it may be relevant>
  - Confidence: <candidate / likely / confirmed>
  - Swagger: <Swagger UI URL, preferably operation URL if available>
  - Spec: <OpenAPI YAML/JSON URL>
  - Endpoint candidate: <full endpoint URL candidate>
  - Request/Response: <core fields only>
  - Unknowns: <API questions or conflicts>

**Work Units**
1. <small unit title>
   - Change: <what should change>
   - Impact: <UI/state/API/routing/test/etc.>
   - API: <candidate endpoint or none>
   - Evidence: <source>
   - Check: <how user/dev verifies this unit>

**Open Questions**
- <question or missing evidence>

**Suggested Next Unit**
- <one recommended first unit and why>
```

If there is not enough evidence to produce work units, output a short blocked brief with the exact missing inputs.
