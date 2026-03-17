---
name: planner-lite
description: Execute finalized implementation plans with deterministic orchestration. Use when architect has already produced a decision-complete `plan.md` or `plan-{track}/plan.md` and the user wants execution rather than more planning, especially for branch-scoped worktree runs, phase-by-phase skill dispatch, per-phase commits, and final merge coordination.
---

<Skill_Guide>
<Purpose>
Execute one finalized plan file with git worktree isolation, phase progression, and explicit child-agent handoff.
</Purpose>

<Instructions>
# planner-lite

Use this skill only after planning is complete.

## Inputs to inspect

1. The executable plan file path
2. `./.codex/skills/architect/references/agents-lite.md`
3. `./.codex/skills/architect/references/planning-policy.md`
4. `./.codex/skills/architect/references/git.md`
5. The custom agent files and skill files mapped from each encountered `owner_agent`

## Execution scope

- Execute one plan file at a time.
- For sequential mode, execute `plans/{task-name}/plan.md`.
- For partial-parallel or parallel mode, execute one `plans/{task-name}/plan-{track}/plan.md` per session.
- Do not execute the root DAG index as if it were a track implementation plan.

## Owner mapping

- `frontend-developer` -> agent `frontend-developer`, skill `./.codex/skills/frontend-dev/SKILL.md`
- `backend-developer` -> agent `backend-developer`, skill `./.codex/skills/backend-dev/SKILL.md`
- `publisher` -> agent `publisher`, skill `./.codex/skills/ui-publish/SKILL.md`
- `playwright-guard` -> agent `playwright-guard`, skill `./.codex/skills/guard-e2e-test/SKILL.md`

## Workflow

### Step 0. Validate the plan

- Require a `**Branch:**` header.
- Require explicit `owner_agent` values for every executable block.
- Refuse execution if blocking ambiguity remains or the file is only a planning index.
- Stop if an `owner_agent` cannot be mapped to an available custom agent or execution surface.
- If project-scoped agents are unavailable, stop and report that the repository must be trusted so Codex can load `.codex/agents/*.toml` and `.codex/config.toml`.

### Step 1. Prepare git state

- Record the current branch as the base branch.
- Keep the main repo checkout on the base branch.
- Default the worktree root to `./.codex/worktrees/{branch}` unless the repository already has a stronger local convention.
- Remove stale worktree state for the same branch before recreating it.
- Create one task worktree branch per executable plan file.

### Step 2. Execute phases in order

- Read the phase block and resolve both the mapped custom agent and the mapped skill for that `owner_agent`.
- Prefer spawning the mapped custom agent for phase execution. Keep git orchestration, worktree lifecycle, and merge control in planner-lite.
- In the delegated prompt, tell the child agent which worktree directory to use and which skill to load explicitly, for example `Use $frontend-dev`.
- Require the child agent to work only inside the assigned worktree directory, avoid nested worktrees, avoid plan rewrites, and stay within the current phase scope.
- Keep each phase bounded to the files and outcomes described by the plan.
- Run the phase validation commands before moving to the next phase.
- Commit after each successful phase using `git.md` conventions.

### Step 3. Merge and clean up

- After the final phase passes, remove the worktree so the task branch can merge.
- Merge back into the recorded base branch with `--no-ff`.
- Delete the task branch only after a clean merge.
- If merge conflicts occur, stop, report the conflict, and keep the task branch for manual resolution.

## Subagent policy

- Use planner-lite as the orchestrator and the mapped custom agents as phase workers.
- For a sequential track, execute phases one at a time and wait for each child agent before continuing.
- For partial-parallel or parallel execution, use separate planner-lite sessions per track so each track keeps its own worktree.
- If planner-lite is already running as a child agent and effective config prevents another spawn, stop and report the nesting requirement instead of silently collapsing roles.
- When delegating a phase, address the mapped child agent explicitly and include the mapped skill explicitly, for example `frontend-developer` with `Use $frontend-dev`.

## Guardrails

- Do not rewrite the plan during execution except for clearly marked execution status notes if the repo already uses them.
- Do not create nested worktrees.
- Do not ask child agents to create branches, worktrees, or merge.
- Do not switch the main repo checkout away from the recorded base branch.
- Do not continue past a failed phase validation.
- Do not delete task branches on merge failure.

## Output contract

- Report the executed plan path, base branch, worktree branch, commits created, validations run, merge result, and any unresolved blockers.
</Instructions>
</Skill_Guide>
