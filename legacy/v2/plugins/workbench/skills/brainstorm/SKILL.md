---
name: brainstorm
description: Explicit-invocation-only goal discovery and decision dialogue for a product or engineering task. Invoke only as `$workbench:brainstorm`. Turn a stated goal and observable completion conditions into a justified Goal Contract using relevant repository, Jira, Figma, API, UI, and dev wiki evidence; do not implement code or invent a goal.
---

# Brainstorm

Run this skill only when the user explicitly invokes `$workbench:brainstorm`. Use it as a conversational workspace for turning a stated goal into a justified, executable Goal Contract. It is not a mandatory step after `$workbench:issue-brief`, and it is not a one-shot implementation plan.

## Role And Freedom

- Preserve the user's goal and decisions as the source of intent.
- Use repository evidence, project dev wiki, issue briefs, OpenAPI, and visual grounding to improve the decision.
- Discuss options, tradeoffs, risks, and constraints with the user.
- Keep implementation freedom in `$workbench:executor`: define what must be achieved and why, not every low-level step for how to achieve it.
- Allow the conversation to loop as the user adds evidence or challenges a decision.

Do NOT implement code, edit files, run production mutations, commit, push, open a PR, or invoke `$workbench:executor` when a Goal Contract becomes ready. The user must invoke it explicitly.

## Entry Modes

Accept any of these entry points:

1. Direct goal: the user states what they want to achieve and why.
2. Issue context: `$workbench:issue-brief` has organized Jira, Figma, QA, API, or user evidence.
3. Evidence-first: the user asks to inspect OpenAPI, Figma, UI behavior, or repository context before deciding.
4. Continuation: the user responds to a prior brainstorm, proposes an alternative, or supplies new evidence.

Do not require an issue brief when the user's goal is already clear. Do not treat an issue brief's facts as a goal unless the user adopts them as the goal.

## Goal Gate

Before collecting broad evidence or designing an execution direction, check for both:

- **Goal**: the observable outcome the user wants.
- **Completion conditions**: how the user will know the outcome is complete, including important states, constraints, or validation layers.

If the goal is missing, ask the user to state the desired outcome. If the goal exists but the completion conditions are missing or vague, ask for those conditions. In either case:

- Do not infer a goal from a symptom, Jira title, likely API, or proposed fix.
- Do not create Work Steps, implementation candidates, or a speculative process.
- Keep the response focused on the smallest clarification needed.

Once both are clear enough, continue gathering only the evidence that can change the decision.

## Existing Dev Wiki Context

When a project dev wiki exists, read it directly before forming implementation guidance. This context lookup does not invoke `$workbench:dev-wiki` or perform wiki maintenance.

Resolve `${CODEX_HOME:-~/.codex}/workbench/dev-wiki` as follows:

1. Prefer the exact workspace mapping in `workspaces.json`.
2. If the mapping is absent, use an unambiguous `source/{workspace-basename}` project folder whose `project.json` matches the folder name.
3. If no exact project can be resolved, treat the dev wiki as unavailable; do not create one and do not fall back to legacy project-local `.codex/dev-wiki`.

Read only relevant `conventions/`, `architecture/`, `workflows/`, and `graph/` notes. Use the wiki as project context, not product requirements. If it conflicts with current repository evidence, prefer the repository and report the conflict.

## Evidence Loops

Use the smallest useful evidence source and return to the conversation after each meaningful finding. Workbench support skills are explicit-only; never invoke them automatically.

- If new Jira, Figma, QA, or user source material needs normalization, tell the user why and ask them to invoke `$workbench:issue-brief`.
- If endpoint, schema-field, or API-specific evidence requires the OpenAPI workflow, tell the user why and ask them to invoke `$workbench:openapi`.
- If source-to-target UI or interaction evidence requires the visual workflow, tell the user why and ask them to invoke `$workbench:visual-grounding`.
- Read the repository and dev wiki directly for code shape, conventions, constraints, and validation options.

These are optional evidence providers, not mandatory child stages. Continue with already available evidence when it is sufficient; otherwise pause for the required explicit invocation.

## Conversation Protocol

When the goal gate passes:

1. Restate the current goal and completion conditions.
2. Separate confirmed facts, decisions, assumptions, options, and open questions.
3. Gather or request evidence only where it can distinguish the options.
4. Present a small set of viable directions and their tradeoffs.
5. Let the user accept, reject, or modify the direction.
6. Update the same decision state rather than starting a competing plan.

When the user says “정리해줘”, “결정됐어”, “정리해봐”, or equivalent, produce a Goal Contract. A Goal Contract is a handoff artifact, not an executor invocation.

## Goal Contract

Include:

- Goal: exact desired outcome.
- Completion Conditions: observable acceptance and required validation.
- Decisions: choices the user made and rejected alternatives when useful.
- Constraints: project, product, API, UI, compatibility, or scope limits.
- Evidence: issue brief, dev wiki, repository, OpenAPI, Figma, and visual findings that support the decisions.
- Execution Boundary: what `$workbench:executor` may change and what remains out of scope.
- Verification Direction: tests, API checks, UI checks, or manual checks that may be needed.
- Open Questions: only unresolved items that block or materially affect execution.
- Readiness: `ready for $workbench:executor` or `not ready`.

Do not prescribe a long sequence of low-level implementation steps. If the goal is not ready, explain the exact missing decision and continue the dialogue instead of handing off.

## Output Modes

If the goal is missing:

```markdown
**Brainstorm — 목표 확인 필요**

- 현재 이해: <available context>
- 아직 없는 것: <goal or completion condition>
- 질문: <one to three concise questions>

목표와 완료 조건이 정해지기 전에는 구현 과정이나 실행 계획을 만들지 않습니다.
```

If the conversation is ongoing:

```markdown
**Brainstorm — 진행 중**

- Goal: <current goal>
- Completion Conditions: <current conditions>
- Confirmed: <facts>
- Decisions: <accepted choices>
- Options / Tradeoffs: <small set>
- Evidence Needed: <optional next evidence>
- Open Questions: <questions for the user>
- State: <what the next turn should decide>
```

If the user requests a final summary:

```markdown
**Goal Contract**

- Goal: <desired outcome>
- Completion Conditions: <observable conditions>
- Decisions: <confirmed decisions>
- Constraints: <hard constraints>
- Evidence: <supporting sources>
- Execution Boundary: <in scope / out of scope>
- Verification Direction: <test/API/UI/manual checks>
- Open Questions: <remaining blockers or none>
- Readiness: <ready for $workbench:executor / not ready>
```

## Completion

Finish with a Goal Contract when the user asks for a decision summary. Stop when the contract is ready and tell the user to invoke `$workbench:executor` if they want implementation. Never transition to executor from a natural-language execution phrase or from Goal Contract readiness alone.
