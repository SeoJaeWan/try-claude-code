---
name: test-brief
description: Optional test and measurement contract derived from a Goal Contract. Use when the user says test brief, "테스트 브리프", "테스트 먼저", or asks how to verify a brainstormed goal before or after execution. Do not require this skill for ordinary execution, and do not implement production code.
---

# Test Brief

Use this skill to turn a confirmed goal and its completion conditions into the smallest useful verification contract. It is an optional support skill, not a mandatory stage between `brainstorm` and `executor`.

## Role

- Define observable tests, checks, or measurements for a Goal Contract.
- Choose the smallest test layer that proves the goal: contract, unit, API boundary, component interaction, route, or manual measurement.
- Preserve the Goal Contract; do not weaken or replace its acceptance conditions.
- Return to `brainstorm` when the goal or completion condition is unclear.
- Leave production code unchanged.

Do NOT require a test brief for every task, add dependencies without approval, create tests for unrelated goals, or encode an unconfirmed root-cause hypothesis as a permanent contract.

## Entry And Timing

Accept:

- a finalized `Goal Contract` from `brainstorm`;
- a direct user goal with observable completion conditions;
- a request to measure an unknown or flaky behavior before deciding on a permanent test.

The user may call this skill before executor, during an implementation discussion, or after implementation to define missing verification. The result never invokes executor automatically.

## Dev Wiki And Repository Context

Use project dev wiki context automatically when available for testing conventions, commands, API boundaries, and relevant architecture. Resolve it through `${CODEX_HOME:-~/.codex}/workbench/dev-wiki`, preferring an exact `workspaces.json` mapping and then an unambiguous `source/{workspace-basename}` project folder. Do not create a wiki or fall back to legacy project-local `.codex/dev-wiki`.

Inspect only the relevant package scripts, test runner, existing tests, fixtures, mocks, and nearby patterns. Follow the repository's existing harness; do not invent one because the current project lacks it.

## Test Intent

Choose one intent and state it:

- **Compatibility**: existing behavior should remain stable through a refactor or internal change.
- **Target Contract**: new behavior should be defined before implementation and may fail before executor runs.
- **Regression**: an observable bug should fail before the fix and pass after it.
- **Measurement**: a temporary repro, trace, repeated run, or runtime matrix is needed before a permanent test can be chosen.
- **Brief Only**: the behavior or test layer is not clear enough to edit tests.

For unknown-cause or flaky behavior, prefer Measurement until the cause and stable observable contract are known.

## Goal Mapping

Map each completion condition to an observable assertion or check:

- API goals: method, path, request, response, error, cache, and authorization behavior when relevant.
- UI goals: user-visible behavior, state transition, interaction path, and required source/target state; avoid layout trivia.
- Type or schema goals: compile-time or contract checks only when the project already supports them.
- Bug goals: reproduce the symptom and assert the public behavior, not the suspected internal cause.

For Measurement intent, define:

- the temporary artifact or observation;
- what it confirms or falsifies;
- how to validate the measurement tool itself;
- runtime modes and repetition count when relevant;
- cleanup after diagnosis;
- the condition for promotion to a permanent regression test.

## Output

Use Korean for user-facing prose. Keep identifiers, paths, commands, endpoints, and URLs exact.

```markdown
**Test Brief**

- Goal: <goal being verified>
- Completion Conditions: <conditions mapped to checks>
- Test Intent: <Compatibility / Target Contract / Regression / Measurement / Brief Only>
- Test Layer: <contract / unit / API / component / route / manual / brief only>
- Existing Pattern: <nearby tests and commands, or none>

**Verification Contract**
1. <observable behavior or measurement>
2. <observable behavior or measurement>

**Files**
- Test Files: <files to add/update, or none>
- Production Code: unchanged

**Measurement Plan**
- Artifacts: <temporary scripts/traces/matrices, or not applicable>
- Proves: <fact or hypothesis each artifact tests>
- Tool Check: <how to validate the measurement itself>
- Cleanup / Promote: <what to remove and what to keep>

**Run Result**
- <command>: <pass / expected failure / blocked / not run>

**Executor Handoff**
- <what executor must satisfy, or "not ready">
```

If the goal is not testable because its completion condition is missing, output only the missing decision and send the conversation back to `brainstorm`. Do not invent a test target.
