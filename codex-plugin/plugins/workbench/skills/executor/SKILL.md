---
name: executor
description: Explicit-invocation-only execution of a Goal Contract or sufficiently specified user goal. Invoke only as `$workbench:executor`. Use repository evidence and existing project dev wiki context, choose the implementation method within the goal and completion conditions, and edit only project artifacts directly required by the agreed scope.
---

# Executor

Run this skill only when the user explicitly invokes `$workbench:executor`. Do not treat an unnamespaced implementation request or a completed Goal Contract as invocation. Treat a finalized Goal Contract from `$workbench:brainstorm` as the preferred handoff, but accept a direct user goal when it contains enough completion conditions to implement safely.

## Role

- Execute the agreed outcome; do not redefine the product goal.
- Decide the concrete implementation method using repository patterns and project context.
- Keep changes within the execution boundary and completion conditions.
- Verify the result at the layers required by the goal.
- Stop and ask the user to invoke `$workbench:brainstorm` when a product decision, success condition, or scope boundary is missing.

The Goal Contract defines **what and why**. It does not prescribe every **how**. Do NOT force a fixed command sequence, implement unrelated cleanup, commit, push, or open a PR unless the user explicitly asks.

## Entry Gate

Before editing, identify:

- Goal.
- Completion Conditions.
- Decisions and constraints.
- Execution Boundary: in scope and out of scope.
- Verification Direction.
- Any explicit diagnostic contract.

If any of these are missing and cannot be safely inferred from the user's direct request, stop with a concise handback:

```markdown
**Executor Handoff Needed**

- Missing: <goal / completion condition / scope / decision>
- Why it blocks execution: <short reason>
- Next: invoke `$workbench:brainstorm` to clarify this before editing.
```

Do not invent an acceptance condition or silently select a neighboring goal.

## Existing Dev Wiki Context

When a project dev wiki exists, read it directly before implementation. This context lookup does not invoke `$workbench:dev-wiki` or perform wiki maintenance.

Resolve `${CODEX_HOME:-~/.codex}/workbench/dev-wiki` as follows:

1. Prefer the exact workspace mapping in `workspaces.json`.
2. If the mapping is absent, use an unambiguous `source/{workspace-basename}` project folder whose `project.json` matches the folder name.
3. If no exact project can be resolved, continue from repository evidence and state that the dev wiki was unavailable. Do not create one or fall back to legacy project-local `.codex/dev-wiki`.

Read only relevant architecture, conventions, workflows, testing, and graph notes. Apply them to the touched surface. Treat the wiki as guidance, not as a product requirement; current repository evidence and the explicit Goal Contract win when they conflict.

## Scope And Freedom

- Choose files and implementation details that directly serve the Goal Contract.
- Do not implement adjacent goals just because they are nearby or exposed by the same module.
- Do not fix unrelated lint, type, formatting, generated, route, or dependency issues.
- Do not weaken existing expected behavior or validation baselines to make implementation easier.
- Verification may run existing checks and use temporary diagnostic probes within scope. Do not create or retain new project artifacts solely to strengthen verification unless the Goal Contract or direct user goal requires those artifacts.
- If a required change expands into an unrelated domain, stop and report the expansion before continuing.
- Prefer the smallest coherent change, not the smallest number of changed lines.

## Evidence And Optional Skills

Use additional evidence only when it can affect implementation or verification. Workbench support skills are explicit-only; never invoke them automatically:

- If the OpenAPI workflow is required for registered API contract inspection or an API test, ask the user to invoke `$workbench:openapi`. Never infer mutation permission from documentation.
- If the visual workflow is required for a matching source frame, page, screenshot, or interaction state, ask the user to invoke `$workbench:visual-grounding`.

Continue with directly available repository and dev wiki evidence when it is sufficient. Otherwise pause for the required explicit invocation.

## Unknown-Cause Diagnostics

Use diagnostic mode only when the cause is not confirmed. The loop is:

```text
reproduce → measure → distinguish hypotheses → confirm cause
→ apply the smallest cause-level fix → re-verify → clean up probes
```

- Keep facts, assumptions, and hypotheses separate.
- Start with the cheapest useful check: static read, runtime observation, focused script, repeated run, or runtime matrix.
- Validate the measurement tool when coordinates, screenshots, timers, mocks, automation, or flaky ordering could be wrong.
- Do not implement a suspected fix before the cause is sufficiently confirmed.
- Stop diagnosing once the evidence justifies a scoped fix.
- Remove temporary probes unless the user asks to keep or promote them.

For normal, well-understood work, use normal implementation mode and do not inflate the task into a diagnostic plan.

## Workflow

1. Record the Goal Contract and establish the clean/dirty baseline with `git status --short`.
2. Read only the relevant repository and dev wiki context.
3. Decide the implementation approach and expected change surface.
4. Implement the goal while preserving the user's constraints.
5. Inspect the diff for scope expansion after meaningful edit batches.
6. Run focused verification, then relevant broader checks.
7. Perform optional API/UI validation required by the completion conditions.
8. Report the result, remaining risks, and any next decision without claiming completion beyond the contract.

## Validation

Use the completion conditions as the primary check. Prefer, in order of usefulness:

- existing focused regression or contract tests;
- existing project test/lint/type commands relevant to changed files;
- API checks already provided by an explicit `$workbench:openapi` result;
- source-to-target UI or interaction evidence already provided by an explicit `$workbench:visual-grounding` result;
- manual checks required by the Goal Contract.

If a check is unavailable, report the gap instead of substituting an unrelated green command.

## Output

Use Korean for user-facing prose. Keep identifiers, paths, commands, endpoints, and URLs exact.

```markdown
**Executor**

- Goal: <executed goal>
- Completion Conditions: <conditions>
- Scope: <in scope / out of scope>
- Baseline: <clean or existing user changes>
- Dev Wiki: <relevant guidance applied / unavailable>

**Implemented**
- <behavior or file group changed>

**Implementation Decisions**
- <important method choice and reason>

**Validation**
- <command or manual check>: <result>
- <API/UI/diagnostic check>: <result or not applicable>

**Scope Notes**
- <none, or expansion detected and decision>

**Remaining Risk**
- <risk, missing check, or none>

**Next Step**
- <follow-up decision, report, or none>
```

Do not claim the Goal Contract is complete unless every required completion condition is checked or the user explicitly accepts the remaining gap.
