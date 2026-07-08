---
name: brainstorm
description: Pre-implementation or pre-diagnosis review for one selected work unit. Use when the user says brainstorm, "브레인스토밍", "1번 작업할게", "이 작업 어떻게 하면 될까", or selects a Work Unit from an issue brief and wants Codex to inspect the current code, dev wiki, API/design evidence, risks, diagnostic hypotheses, and completion checks before implementation. This skill does not implement code, create plan files, run TDD, commit, or open PRs.
---

# Brainstorm

Use this skill after `issue-brief` or any equivalent work breakdown, when the user chooses one small unit and wants to understand how to approach it before editing code.

The goal is not to make a large plan. The goal is to help the user understand how one work unit unfolds: current code shape, dev wiki conventions, goal-oriented work phases, implementation or diagnostic notes, risks, and checks.

For normal low-uncertainty work, keep the brainstorm lightweight. For unknown-cause bugs, the first useful output is often a diagnostic plan, not a fix plan. Preserve the difference between confirmed facts, unconfirmed assumptions, and hypotheses that still need measurement.

When an issue brief, prior brainstorm, test brief, executor result, or user-provided work breakdown exists, show where the selected unit sits in the larger workflow. Keep this as a short progress marker, not a new plan for all units.

## Core Rules

- Do NOT implement code.
- Do NOT edit files, commit, push, open PRs, or modify Jira/Figma.
- Do NOT turn the selected unit into a long autonomous plan.
- Do NOT include unrelated units from the original issue unless they affect the selected unit.
- Do NOT treat missing API/design/code evidence as an implementation step. Put it in risks or open questions.
- Do NOT treat a reported symptom or user-provided suspected cause as the root cause until it has a falsifying/confirming check.
- Do NOT plan production code edits for an unknown-cause bug before defining how to reproduce or measure it, unless the root cause is already confirmed by evidence.
- Keep the result scoped to one reviewable unit. If the selected unit is too broad, split it into smaller candidate units and recommend the first one.
- Keep **Work Steps** goal-oriented and sequential. They should describe the phases needed to complete this unit, not fixed commands, QA checklists, or a full project plan.

## Inputs

Identify:

- The selected work unit number, title, or pasted Work Unit block.
- Any available issue brief content, especially Confirmed Requirements, Design Evidence, API Evidence, Open Questions, and Suggested Next Unit.
- Any issue brief **Confirmed Facts**, **Unconfirmed Assumptions**, reported symptoms, reproduction clues, runtime environment, and user hypotheses.
- Any prior workflow state: completed issue brief, previous brainstorm/test brief, executor result, branch report, or user statement about what is already done.
- Jira issue key, Figma URL, Swagger URL, endpoint, or repo path included by the user.
- User constraints such as "첫 번째 작업만", "UI만", "API 연동은 제외", or "검수 기준만".

If the user only says "1번 작업할게" and the selected unit is not visible in the conversation, ask for the issue brief or the specific Work Unit text.

## Evidence Gathering

Gather only enough evidence to reason about the selected unit.

### Dev Wiki

- Use the `dev-wiki` skill behavior when relevant, but keep the interaction lightweight.
- Resolve the project dev wiki root from `${CODEX_HOME:-~/.codex}/workbench/dev-wiki` and the current workspace mapping.
- Treat missing central config, missing workspace mapping, or a missing project wiki folder as "dev wiki not configured" for this workspace. Do not fall back to legacy project-local `.codex/dev-wiki` as a consumer.
- Read relevant dev wiki documents only: conventions, architecture, workflow commands, test/quality notes, and graph files that affect the selected unit.
- If dev wiki is not configured or has no relevant notes, say so briefly and continue from repository evidence.

### Repository

- Inspect likely implementation areas for the selected unit only.
- Prefer `rg`, `rg --files`, package scripts, routes, API clients, components, hooks, stores, schemas, and nearby tests.
- Read enough code to understand existing patterns, naming, state ownership, API client shape, validation, and test placement.
- Do not perform a full repo audit.

### API / Design

- Use API and design evidence already present in the issue brief first.
- OpenAPI evidence should be treated as candidate/likely/confirmed according to the issue brief or direct source.
- Re-check OpenAPI only when the selected unit depends on a specific endpoint and the existing evidence is insufficient.
- Re-check Figma only when the selected unit depends on missing visual state or interaction detail; keep reads shallow and node-specific.

### Unknown-Cause Bugs

When the selected unit is a bug whose cause is not confirmed:

- Identify observable symptoms before possible causes.
- Keep user hypotheses as hypotheses, not implementation facts.
- Build a small hypothesis set. Prefer 2-5 plausible causes rather than one favored explanation.
- Attach a falsification or confirmation check to each hypothesis.
- Prefer the cheapest useful check first: `rg`/static read, DOM or event stack inspection, focused script, repeated run, runtime matrix, then temporary source probes only when external observation is insufficient.
- Include cheap user questions before expensive instrumentation when the reporter is available and the answer would separate hypotheses.
- Include a measurement-tool check when the symptom depends on automation, coordinates, screenshots, timers, network mocks, or a flaky repro.
- For flaky behavior, define how to measure frequency, such as repeated runs before and after the fix.
- Include relevant runtime modes when they could change behavior: dev/prod, StrictMode, HMR/fresh start, viewport, auth/data state, feature flag, browser, or mobile/webview.
- Do not turn broad "확인/검토" into Work Steps. Each diagnostic step should produce a concrete observation, artifact, or decision.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep code identifiers, paths, URLs, issue keys, field names, and commands exact.

```markdown
**Brainstorm**

- Target Unit: <selected unit number/title>
- Goal: <what this unit should finish>
- Out of Scope: <nearby things intentionally not included>

**Progress Context**
- Current Stage: <where this brainstorm sits in the larger workflow, e.g. "after issue brief, before test-brief/executor">
- Already Done: <confirmed prior work/evidence, or "not provided">
- This Brainstorm Decides: <the specific decision or readiness check for the selected unit>
- Next Step: <likely next handoff such as test-brief, executor, more evidence, or split unit>
- Still Out of Scope: <other work units or follow-up areas not handled here>

**Current Context**
- Dev Wiki: <relevant conventions or "not configured / no relevant note">
- Code: <likely files/modules/components/hooks/API clients/tests>
- Evidence: <prompt/Jira/Figma/OpenAPI/repo facts that matter for this unit>

**Diagnostic Plan**
- Mode: <Normal / Diagnostic>
- Symptom: <observable symptom, or "not applicable">
- Known Facts: <facts already confirmed by issue brief/repo evidence>
- Unconfirmed Assumptions: <suspected causes or implementation guesses still unverified>
- Hypotheses: <numbered hypotheses with the cheapest falsification/confirmation check for each, or "not applicable">
- Ask First: <cheap user/reporter questions before instrumentation, or "not applicable">
- Parallel Checks: <independent checks that can run in parallel, or "none">
- Switch Trigger: <why this unit needs diagnostic mode, or "not applicable">
- Return Condition: <what fact lets executor return to implementation mode, or "not applicable">
- Measurement Risk: <how the test/repro itself could be wrong, or "low">
- Runtime Matrix: <dev/prod/browser/viewport/auth/data modes that matter, or "not applicable">
- Completion Condition: <what observation proves diagnosis is complete enough to fix>

**Implementation Notes**
- <specific approach note based on existing code and conventions>
- <state/API/field/component/test placement note>

**Work Steps**
1. <goal of the first phase and why it comes first>
2. <goal of the next phase, based on what the previous phase reveals>
3. <goal of the next implementation phase>

**Risks**
- <risk and why it matters>
- <missing evidence or dependency, if any>

**Checks**
- <manual verification>
- <test/lint/typecheck command or focused test target, if known>
- <regression check>
- <diagnostic/reproduction check when the unit is an unknown-cause bug>
```

## Work Unit Discipline

For selected units:

- Include **Progress Context** when there is any visible broader workflow context. If no broader context is available, keep it to `Current Stage: standalone brainstorm` and do not invent completed work.
- Keep **Progress Context** to 3-5 bullets. It should orient the user, not summarize the whole issue brief or become a project timeline.
- Keep UI, state, API, validation, and tests as separate concerns unless the selected unit naturally owns all of them.
- If the unit is blocked by API/design uncertainty, say what is blocked and make the first **Work Steps** item the smallest unblock action, but do not invent implementation details.
- If the unit is an unknown-cause bug, make the first **Work Steps** item a concrete reproduction or measurement step unless reproduction is already confirmed.
- If the unit is low-risk and the cause/work surface is already clear, do not inflate it into a diagnostic plan. Mark `Mode: Normal` and keep Work Steps short.
- If the unit is already implemented or partially implemented, frame the output around verification, cleanup, and regression checks.
- If the current workspace does not contain the relevant product code, state that clearly and base the output on available evidence only.
- Use 3-5 Work Steps by default. More than 5 means the selected unit is probably too large and should be split.
- Each Work Step should represent a goal or decision point, not a raw command.
- Do not include generic final verification steps such as `npm run type-check`, `npm run lint`, or manual QA in **Work Steps**; put those in **Checks**.
- Prefer steps that depend on the previous result. Example: "타입 계약 생성" -> "생성된 타입 차이 해석" -> "API wrapper 전환 범위 결정" -> "필드명 영향 반영".
- Do not put vague steps like "요구사항 검토" unless that is the only safe unblock goal.
- For diagnostic units, avoid vague steps like "원인 파악". Prefer steps like "pointer event trace로 `pointercancel` 발생 여부를 기각한다" or "dev/prod matrix로 실행 모드 차이를 분리한다".
- For diagnostic units, include the condition for returning to normal implementation. Diagnosis should end once it has produced the fact needed for a scoped fix.

## Quality Bar

A good brainstorm answer should let the user say, "좋아, 이제 이 파일부터 보면 되겠다."

It should be specific enough to start work, but small enough that the user remains in control.
