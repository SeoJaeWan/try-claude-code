---
name: issue-brief
description: Issue briefing from user-provided issue text, QA reports, Jira, Figma, repository context, and OpenAPI evidence. Use when the user gives a Jira issue URL/key, pastes enough issue context directly, asks to summarize an issue before implementation, says "issue brief", "이슈 브리프", "Jira 일감 정리", "이 일감 정리해줘", or wants Codex to identify confirmed facts, unconfirmed assumptions, required work, impact areas, open questions, and the next small implementation unit. This skill does not implement code, create plan files, run TDD, commit, or open PRs.
---

# issue-brief

## Purpose

Turn available issue evidence into a concise implementation brief.

The evidence may come from a Jira issue, but Jira is not required. A user prompt, pasted QA report, copied Slack/Notion text, screenshot description, reproduction note, or explicit product requirement can be the primary source when it contains enough context.

When Jira is provided, use it as a primary live source and inspect linked evidence. When Jira is not provided, treat the user's pasted content as the source of truth, separate confirmed facts from unconfirmed assumptions, and only ask for more input when the prompt is too thin to produce a useful brief.

## Core Rules

- Do NOT implement code.
- Do NOT commit, push, open PRs, or modify Jira/Figma.
- Do NOT require a Jira link when the user prompt already contains enough issue evidence.
- Do NOT treat early comments as final when later comments contradict them.
- Do NOT invent requirements that are not supported by Jira, Figma, repository evidence, or explicit user input.
- Do NOT treat a user-provided hypothesis, suspected cause, or proposed fix as confirmed fact until evidence supports it.
- Do NOT convert a symptom report directly into an implementation plan when the cause is unknown. Preserve observable symptoms and assumptions separately.
- If evidence is missing or inaccessible, ask for the missing Jira comment, Figma URL, screenshot, or copied text.

## Evidence Sources

Prefer live MCP evidence when available.

0. User-provided prompt / pasted issue evidence
   - Treat the current user prompt and any pasted text as first-class evidence.
   - Extract observable facts: reported symptom, expected behavior, actual behavior, reproduction steps, environment, affected screen/API, user role, data state, acceptance checks, and explicit constraints.
   - Extract user hypotheses separately from confirmed facts. Examples: "이벤트 전파 차단 아닐까", "API가 느린 것 같아", "HMR 문제일 수도".
   - Preserve source labels such as "user prompt", "pasted QA report", "copied Jira comment", "screenshot description", or "conversation context" when no external URL exists.
   - If the prompt contains enough context, proceed without asking for Jira.

1. Jira / Atlassian
   - Use Jira only when the user provides a Jira key/URL or explicitly asks to inspect Jira.
   - Use Atlassian/Jira MCP tools when exposed in the session.
   - If the tool names are not already available, search for Jira or Atlassian tools with `tool_search`.
   - Read the issue summary, description, status, linked/selected issue, labels, attachments, and comments.
   - If the user provides focused comment URLs, read those comments specifically and keep their comment IDs in the brief.

2. Figma
   - Extract every Figma URL from the user prompt, pasted evidence, Jira description, and comments.
   - Use Figma MCP read tools when available to inspect the target file/node/frame.
   - Keep Figma reads shallow by default: prefer the exact linked node, focused Jira comment, frame name, visible text, and component hierarchy over full-file traversal.
   - If multiple Figma links exist, inspect only the latest design-complete link or the user-identified link first; ask or summarize candidates instead of reading every large node deeply.
   - Do not request screenshots, full document trees, or exhaustive node JSON unless the issue cannot be understood without them.
   - Stop Figma inspection once requirements, changed UI regions, and key states are clear enough for a brief.
   - If only the general Figma execution tool is available, load the required Figma usage guidance first and run read-only inspection code only.
   - Never write to Figma from this skill.

3. Dev Wiki
   - Use dev wiki only when the workspace has opted in through the Workbench-owned root: `${CODEX_HOME:-~/.codex}/workbench/dev-wiki/config.json` plus a current workspace mapping in `workspaces.json`.
   - Resolve the project wiki root as `${CODEX_HOME:-~/.codex}/workbench/dev-wiki/source/{project}` from that mapping.
   - If the central config, workspace mapping, or project wiki folder is missing, treat dev wiki as not configured and continue without it.
   - Do not fall back to legacy project-local `.codex/dev-wiki` from this skill.
   - When configured, read only lightweight project context needed to map the issue to likely areas: relevant conventions, architecture boundaries, workflow/test commands, and graph navigation files.
   - Use dev wiki as project context, not as product requirement evidence. Jira, Figma, OpenAPI, repository source, and explicit user input remain the only sources for requirements.
   - If dev wiki conflicts with current repository evidence, treat the wiki as possibly stale and mention the conflict instead of planning from stale guidance.

4. Repository
   - Only inspect the repository when it helps map the issue to likely implementation areas.
   - Keep repository inspection lightweight: routes, screen/component names, API clients, state hooks, and tests.
   - Do not edit files.

5. OpenAPI / Swagger
   - Use the `openapi` skill behavior and OpenAPI MCP tools when available; search for `openapi` tools with `tool_search` if needed.
   - If OpenAPI MCP tools are not exposed in the current session, do not skip API evidence. Use the bundled CLI fallback:
     - Resolve the plugin root from this `SKILL.md` path.
     - Run `ruby <plugin-root>/tools/openapi-mcp.rb list-services`.
     - Run `ruby <plugin-root>/tools/openapi-mcp.rb refresh-service --service <service>` for the likely service.
     - Run `ruby <plugin-root>/tools/openapi-mcp.rb search-endpoints --service <service> --query "<terms>" --limit 5`.
     - Run `ruby <plugin-root>/tools/openapi-mcp.rb get-endpoint --service <service> --method <METHOD> --path <path>` for strong candidates.
   - Services are user-registered through `openapi`; do not assume built-in service IDs or hardcoded Swagger URLs.
   - If no OpenAPI services are registered, say API evidence could not be checked and suggest registering the relevant Swagger service with `openapi`.
   - Search endpoints using user-prompt terms, QA report labels, Jira/Figma domain words, screen names, feature names, and likely schema fields.
   - Refresh the relevant OpenAPI service cache before searching when API evidence is needed.
   - If the relevant service is unclear, refresh all registered services before searching.
   - If refresh fails but stale cache exists, continue with stale cache and explicitly mark the API evidence as stale.
   - Treat endpoint matches as candidates unless Jira, Figma, repo code, or user input confirms the exact API.
   - Include Swagger UI, OpenAPI spec, and endpoint candidate URLs so the user can open Swagger and manually try the request.
   - Never call business API endpoints from this skill; read OpenAPI documents only.

## Workflow

### 1. Parse the Request

Identify:

- Whether the prompt itself contains enough issue evidence to brief without Jira.
- Source type: Jira, pasted issue, QA report, user story, bug report, design note, API request, or mixed evidence.
- Jira issue key or URL, if present.
- selected/linked issue key from query parameters such as `selectedIssue=IF-545`, if present.
- focused Jira comment IDs such as `focusedCommentId=29621`, if present.
- Figma URLs, if the user already provided them
- OpenAPI/Swagger URLs, endpoint names, method/path hints, if present
- Observable symptom, expected behavior, actual behavior, reproduction steps, environment, and acceptance checks if present
- User hypotheses, suspected causes, and proposed fixes as unconfirmed assumptions unless externally confirmed
- user-stated intent or constraints

If the user provides both a parent issue and a selected issue, brief the selected issue as the implementation target while using the parent issue as context.

If the prompt is sufficiently detailed and no Jira link is present, continue from the prompt. Do not ask for Jira merely because the skill is named issue-brief.

### 2. Collect Prompt Evidence

When the user provides issue details directly:

- Classify each statement into:
  - Confirmed fact: directly stated requirement, observed symptom, acceptance check, or explicit constraint
  - Unconfirmed assumption: suspected cause, inferred implementation path, likely API, guessed design intent, or user hypothesis
  - Missing evidence: absent reproduction step, unclear expected behavior, missing screenshot/design/API detail, or unknown runtime environment
- For bug reports, capture:
  - reported symptom
  - expected behavior
  - actual behavior
  - reproduction steps or missing reproduction data
  - affected environment such as dev/prod, browser, viewport, role, auth state, feature flag, or data state
  - whether the issue is deterministic or flaky
- If the cause is unknown, do not invent the cause. Put suspected causes under **Unconfirmed Assumptions** and make the next step a diagnostic `brainstorm` or a small reproduction/regression unit when actionable.

### 3. Collect Jira Evidence

When Jira is provided, read the issue and comments. Classify evidence into:

- Planning / product requirement
- Design completed / design change
- Engineering note
- QA or bug report
- Decision
- Open question
- Outdated or superseded note

When comments conflict, prefer the latest explicit decision or the comment the user identified as design-complete/planning-complete. Mention the conflict instead of silently choosing.

### 4. Inspect Figma Evidence

For each Figma link:

- identify file, page, frame/node, and screen/component names
- read the smallest exact node that can answer the issue; avoid scanning unrelated pages or sibling frames
- capture what changed visually or behaviorally
- note design status if Jira says it is done
- map visible UI states: default, empty, loading, error, disabled, selected, expanded, permission-gated, etc.
- record implementation-relevant details only; do not reproduce the whole design spec

If the Figma link cannot be opened, keep the URL in the brief and mark it as blocked evidence.

### 5. Check Candidate APIs

When the issue may require API integration:

- choose likely services from the product surface: manager/admin, web/app, or TMS
- inspect registered OpenAPI services first and choose from the user's local registry
- refresh the chosen OpenAPI service cache with `refresh_service` or the CLI `refresh-service`; refresh all services if the service cannot be inferred
- search OpenAPI endpoints by product terms, Korean labels, English identifiers, and schema fields using MCP or CLI fallback
- inspect endpoint details only for strong candidates
- record method, path, request fields, response fields, and auth/security hints
- include `swaggerDocumentUrl` when available so the user can open the right Swagger group directly; also include `swaggerOperationUrl`, `specUrl`, and `endpointUrl`
- mark confidence as `candidate`, `likely`, or `confirmed`
- ask a backend/API question when no matching endpoint exists or multiple endpoints conflict

Do not block the brief if OpenAPI MCP is unavailable. State that API evidence was not checked.

### 6. Read Project Context

When dev wiki is configured for the current workspace:

- read only the documents that help place the work: relevant `conventions/`, `architecture/`, `workflows/`, and `graph/` entries
- use `graph/overview.md` as navigation when available, then read only the specific graph files needed for the issue
- use dev wiki to improve impact areas, test placement, validation commands, and likely implementation paths
- do not turn dev wiki observations into Jira requirements or numbered Work Units by themselves

When dev wiki is not configured, continue without it and rely on repository evidence when implementation mapping is useful.

### 7. Build the Work Breakdown

Translate evidence into small, actionable work units. Each unit must be something the user or implementer can directly change, implement, verify in UI, wire to an API, or test.

Keep non-actionable investigation out of Work Units:

- Do NOT create work units whose only action is "확인", "확정", "검토", "문의", "파악", or "요구사항 정리".
- A diagnostic/reproduction work unit is allowed only when it produces a concrete artifact or check, such as a repro script, regression test, interaction capture, log/probe plan, or verified runtime matrix. Do not number vague investigation as a Work Unit.
- Put missing API contracts, unclear requirements, backend questions, absent Figma nodes, and blocked evidence in **API Evidence** or **Open Questions** instead.
- If an issue is blocked by missing API/design information, say so in **Open Questions** and make **Suggested Next Unit** a short recommendation to resolve the blocker, but do not number that blocker as a Work Unit.
- If there are no implementable units yet, write `- 현재 확정된 구현 단위 없음` under **Work Units** and explain the blocker in **Open Questions**.

For every unit, include:

- Work unit title
- Evidence: user prompt, pasted report, Jira comment ID, issue field, Figma URL/node, repo file, or OpenAPI candidate
- Expected change
- Likely impact area: UI, frontend state, API integration, routing, validation, backend, DB, test, docs
- Candidate API if relevant: service, method, path, and confidence
- Acceptance check
- Unknowns or questions

Do not force the whole issue into one large plan. The output should help the user choose the next implementable unit, not hand control to a long autonomous execution.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep code identifiers, issue keys, URLs, and exact product terms unchanged.

```markdown
**Issue Brief**

- Issue: <`KEY-123` - title, or "Prompt-provided issue" / "QA report" / short user-provided title>
- Context: <parent/selected issue relationship, prompt summary, status if known, and short goal>
- Evidence read: <user prompt/pasted text, Jira fields/comments, Figma links/nodes, OpenAPI candidates, dev wiki context if configured, repo areas if inspected>

**Confirmed Facts**
- <observable fact / explicit requirement / reported symptom> (source: <prompt / pasted report / comment id / field / Figma node>)

**Unconfirmed Assumptions**
- <suspected cause / inferred implementation path / user hypothesis> (status: unverified, suggested check if obvious)

**Confirmed Requirements**
- <requirement> (source: <prompt / pasted report / comment id / field / Figma node>)

**Bug / Reproduction Evidence**
- Symptom: <reported symptom, or "not a bug report">
- Expected: <expected behavior, if known>
- Actual: <actual behavior, if known>
- Reproduction: <steps / partial clues / missing>
- Runtime Context: <dev/prod/browser/viewport/role/auth/data state, or unknown>
- Determinism: <deterministic / flaky / unknown>

**Design Evidence**
- <screen/component>: <implementation-relevant design summary> (source: <Figma URL/node, prompt, pasted report, or Jira comment>)

**API Evidence**
- <service> <METHOD> `<path>`: <why it may be relevant>
  - Confidence: <candidate / likely / confirmed>
  - Swagger: <Swagger document URL, preferably `swaggerDocumentUrl`; include operation URL only when useful>
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

Only include implementation/test/QA units here. Do not include requirement confirmation, backend questions, API discovery, or design lookup as numbered work units.

**Open Questions**
- <question or missing evidence>

**Suggested Next Unit**
- <one recommended first unit and why>
```

If there is not enough evidence to produce work units, output a short blocked brief with the exact missing inputs.
