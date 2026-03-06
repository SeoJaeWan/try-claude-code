---
name: planner-lite
description: Deterministic plan orchestrator with plan linting, branch merge, and worktree cleanup.
model: opus
---

<Skill_Guide>
<Purpose>
Execute plan artifacts deterministically with planner-managed per-phase worktree isolation and explicit branch merge rules.
</Purpose>

<Instructions>
# planner-lite

Use this skill to execute `plan.md` or `.claude/try-claude/plans/{task-name}/plan-{track}.md` artifacts with strict validation and deterministic Git cleanup.

## Inputs

1. Plan file path (`.claude/try-claude/plans/{task-name}/plan.md` or `.claude/try-claude/plans/{task-name}/plan-{track}.md`)
2. Plan headers:
    - `**Branch:** {execution-branch}`
3. Phase/task blocks with `- owner_agent: \`{agent-name}\``

## Core rules

1. planner-lite runs in the main conversation context (no agent binding).
2. planner-lite owns worktree isolation by enforcing `Agent(... isolation: "worktree")` for every phase dispatch.
3. `Branch` from the plan header is the execution branch. Create it from the current branch at start.
4. After each phase, merge the worker's worktree branch back into `Branch` before dispatching the next phase.
5. Start context is current branch (not fixed to `main`).
6. **Phase execution delegation MUST use the `Agent` tool. Never execute phase work directly.**
7. planner-lite must run from the repository root (not from a nested `.claude/worktrees/**` path).

## Execution workflow

1. Validate plan:
    - Ensure `**Branch:**` header exists in the plan file.
    - Ensure each execution block includes `- owner_agent: \`{agent-name}\``.
    - Ensure every `owner_agent` maps to an existing agent in `agents/{owner_agent}.md`.
    - For DAG plans, ensure required metadata sections are present: `Track`, `DependsOn`, `StartCondition`, `ReadyCheck`, `BlockingFiles`, `Outputs`, `MergeCondition`.
    - Ensure current working directory is the repository root and not inside `.claude/worktrees/**`.
    - If validation fails, stop execution immediately.
2. Create the execution branch:
    - Read `Branch` value from the plan header → `{B}`.
    - Record the current branch: `git rev-parse --abbrev-ref HEAD` → `{A}`.
    - Create `{B}` from `{A}`: `git checkout -b {B}`.
    - All subsequent work happens on or from `{B}`.
3. Execute each phase sequentially in plan order:
    - Read the phase block's `owner_agent` value.
    - Use the same `owner_agent` value directly as `subagent_type`.
    - Build the agent prompt from the phase block content (task description, file paths, acceptance criteria).
    - If `primary_skill` is specified, append: `Use the {primary_skill} skill for this work.`
    - **Call the Agent tool** with these exact parameters:

        ```
        Agent(
          subagent_type: "{owner_agent}",
          isolation: "worktree",
          prompt: "
            ## Branch context
            Execution branch: {B}
            Your worktree MUST branch from {B} (not main).
            Only implement Phase N work described below. Do NOT redo prior phases.

            ## Task
            {phase content}
          ",
          description: "Phase N: {short summary}"
        )
        ```

    - Wait for the Agent to return its result.
    - Merge the worker's worktree branch back into `{B}`.
    - Stop on blocking phase failures.
4. All phases complete → `{B}` contains the accumulated result of Phase 1 through N.

## Merge/cleanup behavior

1. Per-phase merge: after each worker completes, merge its worktree branch into `{B}`.
2. Worktree cleanup is handled by planner-lite's explicit `Agent(... isolation: "worktree")` dispatch contract.
3. On merge conflict:
    - Keep branch
    - Print conflict/retry guidance

## Parallel guidance

For `partial-parallel` / `parallel`:

1. Run one `planner-lite` skill session per `.claude/try-claude/plans/{task-name}/plan-{track}.md`
2. Each session uses its own `Branch`
3. Do not run multiple sessions concurrently for the same `Branch`

## Validation commands

1. `rg -n "^\*\*Branch:\*\*" <plan-path>`
2. `rg -n "owner_agent:" <plan-path>`
3. `git worktree list --porcelain`
4. `git worktree prune -n -v`

## Guardrails

1. Do not force execution from `main`; honor the current branch context.
2. Do not execute phases when lint validation fails.
3. Do not delete source branches on merge failure.
4. Do not run two planner-lite sessions concurrently against the same `Branch`.
5. Do not run planner-lite from inside `.claude/worktrees/**`; restart from repository root.

</Instructions>
</Skill_Guide>
