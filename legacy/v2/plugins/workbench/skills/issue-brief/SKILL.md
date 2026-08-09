---
name: issue-brief
description: Explicit-invocation-only evidence briefing for Jira, Figma, QA reports, OpenAPI context, repository evidence, and user-provided product information. Invoke only as `$workbench:issue-brief`. Organize source material before decision or implementation without inventing a goal, choosing mandatory Work Units, or executing code.
---

# Issue Brief

Run this skill only when the user explicitly invokes `$workbench:issue-brief`. Normalize product and engineering evidence as either a standalone result or a source-evidence brief explicitly requested during `$workbench:brainstorm`.

## Role

- Organize Jira, Figma, QA, API, repository, and user-provided information.
- Separate confirmed facts, explicit requirements, unconfirmed assumptions, and missing evidence.
- Preserve the user's stated goal when one exists; do not invent a goal from symptoms or source material.
- Stop after the brief when the user asked only for a summary.
- Do not require the user to continue to `$workbench:brainstorm` or `$workbench:executor`.

Do NOT create a mandatory linear pipeline, number implementation Work Units by default, select an executor target, edit code, modify Jira/Figma, commit, push, or open a PR.

## Entry And Re-entry

Accept any of these entry points:

- Jira issue, comment, QA report, or pasted product context.
- Figma URL, screenshot description, or design decision.
- User-provided goal, concern, or request to organize a problem.
- New evidence supplied with an explicit `$workbench:issue-brief` invocation while `$workbench:brainstorm` is active.

When new evidence arrives during brainstorm, summarize only the new evidence and its impact on the current understanding. Do not restart the whole conversation or silently replace the brainstorm goal.

If the user asks for an API element or endpoint check, collect read-only OpenAPI document evidence when the relevant service is registered. This does not invoke `$workbench:openapi`. For endpoint execution, tell the user to invoke `$workbench:openapi`; this skill does not call business endpoints.

## Evidence Rules

Use the strongest available source in this order for product requirements: explicit user input, latest Jira decision or QA evidence, linked Figma design, repository behavior, and API documentation. Treat dev wiki as project context, not as a product requirement source.

### Jira And User Input

- Read the issue summary, description, relevant comments, status, attachments, and linked issue only when the user supplies or requests Jira evidence.
- Prefer the latest explicit decision when comments conflict, and report the conflict rather than silently choosing.
- Record user hypotheses and proposed fixes as unconfirmed until evidence supports them.
- Ask for missing material only when the requested brief cannot be useful without it.

### Figma

- Inspect the exact linked frame or node first.
- Capture only implementation-relevant states, visible copy, interaction intent, and changed regions.
- Do not scan an entire file when the linked node is sufficient.
- Never write to Figma from this skill.

### OpenAPI

- Use the registered OpenAPI service or the bundled read-only fallback when API evidence is explicitly needed.
- Mark endpoint matches as `candidate`, `likely`, or `confirmed`.
- Record method, path, core request/response fields, and useful Swagger/spec URLs.
- Never call business endpoints from this skill.

### Repository

- Inspect only enough routes, clients, components, schemas, and tests to locate the affected surface when that helps the brief.
- Do not turn repository observations into requirements without a supporting product source.

## Output

Use Korean for user-facing prose. Keep paths, field names, endpoints, issue keys, and URLs exact.

```markdown
**Issue Brief**

- Status: <context-only / goal-stated / blocked>
- Issue: <Jira key and title, or prompt-provided subject>
- Sources Read: <user prompt, Jira fields/comments, Figma nodes, OpenAPI, repository files>
- User Goal: <explicit goal, or "not provided">

**Confirmed Facts**
- <observable fact or explicit requirement> (source: <source>)

**Unconfirmed Assumptions**
- <hypothesis, suspected cause, inferred API, or proposed implementation> (status: unverified)

**Design Evidence**
- <screen/component/state and relevant design detail> (source: <Figma node or other source>)

**API Evidence**
- <service> <METHOD> `<path>`: <relevance>
  - Confidence: <candidate / likely / confirmed>
  - Request/Response: <core fields or "not inspected">
  - Links: <Swagger/spec/endpoint URLs when available>

**Constraints And Open Questions**
- <explicit constraint or missing evidence>

**Next Conversation**
- <"완료 목표와 조건을 논의하려면 `$workbench:brainstorm`을 호출할 수 있음" / a concise question / "없음">
```

Do not add `Work Units` or `Suggested Next Unit` unless the user explicitly asks for an implementation breakdown. Even then, present candidates as optional discussion material, not as a handoff contract.

## Completion

Finish after delivering the brief when the user asked only to organize information. If goal discovery is the next useful step, tell the user to invoke `$workbench:brainstorm`; do not invoke it automatically. Never invoke `$workbench:executor` or assume that a goal is complete.
