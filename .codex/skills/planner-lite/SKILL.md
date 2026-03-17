---
name: planner-lite
description: Execute finalized implementation plans with deterministic orchestration. Use when architect has already produced a decision-complete `plan.md` or `plan-{track}/plan.md` and the user wants execution rather than more planning, especially for worktree-scoped runs that must dispatch each phase to its mapped named custom agent, with per-phase validation, commits, and final merge coordination.
---

<Skill_Guide>
<Purpose>
Execute one finalized plan file with git worktree isolation, phase progression, and mandatory named custom-agent dispatch.
</Purpose>

<Instructions>
# planner-lite

Use this skill only after planning is complete.

## Inputs to inspect

1. The executable plan file path
2. `./.codex/skills/architect/references/agents-lite.md`
3. `./.codex/skills/architect/references/planning-policy.md`
4. `./.codex/skills/architect/references/git.md`
5. The custom agent files mapped from each encountered `owner_agent`

## Execution scope

- Execute one plan file at a time.
- For sequential mode, execute `plans/{task-name}/plan.md`.
- For partial-parallel or parallel mode, execute one `plans/{task-name}/plan-{track}/plan.md` per session.
- Do not execute the root DAG index as if it were a track implementation plan.

## Session ownership

- The parent or main session should hand finalized plan execution off to the named custom agent `planner`.
- After that handoff, `planner` is the only session that should spawn phase workers, wait on them, run per-phase validation, commit phase work, and manage the final merge while following this skill.
- If a non-`planner` session is following this skill and named custom-agent spawning is available, it must launch `planner` and stop short of spawning any phase worker itself.
- If named custom-agent spawning is unavailable, stop and report the configuration problem instead of silently collapsing orchestration back into the parent session.
- Do not instruct users to invoke `$planner-lite` directly when the repository already exposes `/agent planner`.

## Owner mapping

- `frontend-developer` -> custom agent `frontend-developer`
- `backend-developer` -> custom agent `backend-developer`
- `publisher` -> custom agent `publisher`
- `playwright-guard` -> custom agent `playwright-guard`

## Workflow

### Step 0. Validate the plan

- Require a `**Branch:**` header.
- Require explicit `owner_agent` values for every executable block.
- Require every executable block to have enough execution metadata to delegate safely: phase id, `owner_agent`, `작업`, `산출물`, and plan-level validation commands.
- Refuse execution if blocking ambiguity remains or the file is only a planning index.
- Stop if an `owner_agent` cannot be mapped to an available named custom agent.
- Stop if project-scoped agents are unavailable, if the repository is not trusted, or if the current runtime can spawn only generic worker roles.

### Step 1. Prepare git state

- Record the current branch as the base branch.
- Keep the main repo checkout on the base branch.
- Default the worktree root to `./worktrees/{branch}` unless the repository already has a stronger local convention.
- Remove stale worktree state for the same branch before recreating it.
- Create one task worktree branch per executable plan file.

### Step 2. Resolve phase dispatch before any implementation

- Parse executable phases in order and treat `owner_agent` as authoritative routing metadata.
- Resolve the mapped named custom agent from `owner_agent`.
- Treat `primary_skill` as a consistency check against the mapped custom agent, not as a worker fallback path.
- Dispatch is mandatory for every mapped phase. Planner-lite owns orchestration only; do not implement a mapped phase directly in planner-lite.
- Treat a missing named custom-agent spawn as an execution failure, not as an acceptable shortcut.
- Do not fall back to `worker + skill`, `default + skill`, or any other generic role simulation.
- Build a delegation packet for each phase with:
  - plan path
  - phase heading or id
  - `owner_agent`
  - worktree directory
  - `목적`
  - `작업`
  - `산출물`
  - relevant validation commands

### Step 3. Execute phases in order via child agents

- Spawn the mapped named custom agent for phase execution. Keep git orchestration, worktree lifecycle, validation, commit control, and merge control in planner-lite.
- Address the mapped custom agent explicitly and include the resolved phase metadata in the prompt.
- Let the custom agent load and apply its own configured skills and developer instructions. Do not simulate that role by injecting a substitute skill into a generic worker.
- Require the child agent to work only inside the assigned worktree directory, avoid nested worktrees, avoid plan rewrites, and stay within the current phase scope.
- Require the child agent to report changed files, validations it ran locally, and any blockers before planner-lite continues.
- Record the spawned child agent id in phase state and treat that id as the only live worker for the phase.
- Wait for the child agent to finish each sequential phase before running validation or moving on.
- For long-running phases, call `wait_agent` with the maximum supported timeout `timeout_ms=3600000` rather than using short polling loops.
- If a max-length wait still times out without a terminal child status, treat the phase as still running and continue waiting on the same child agent id.
- Do not respawn a child agent because of a non-terminal wait timeout. Retry only after a terminal failure and after inspecting the current worktree diff or commit state.
- Keep each phase bounded to the files and outcomes described by the plan.
- Review the returned worktree changes, then run the relevant validation commands before moving to the next phase.
- Commit after each successful phase using `git.md` conventions.

Delegation prompt contract:

```text
Execute <plan path> <phase id> as the named custom agent <owner_agent>.
Work only in <worktree path>.
Goal: <phase 목적>
Tasks:
<phase 작업 bullets>
Expected outputs:
<phase 산출물 bullets>
Validation to respect:
<relevant validation commands>
Do not create branches, worktrees, or merges.
Do not rewrite the plan.
Do not edit files outside this phase scope.
Report changed files, validations run, and blockers.
```

### Step 4. Merge and clean up

- After the final phase passes, remove the worktree so the task branch can merge.
- Merge back into the recorded base branch with `--no-ff`.
- Delete the task branch only after a clean merge.
- If merge conflicts occur, stop, report the conflict, and keep the task branch for manual resolution.

## Subagent policy

- Use planner-lite as the orchestrator and the mapped custom agents as phase workers.
- For mapped phases, named custom-agent execution is required. Do not collapse a phase back into planner-lite just because planner-lite could edit the files itself.
- For a sequential track, execute phases one at a time and wait for each child agent before continuing.
- For partial-parallel or parallel execution, use separate planner-lite sessions per track so each track keeps its own worktree.
- If planner-lite is already running as a child agent and effective config prevents another named custom-agent spawn, stop and report the nesting requirement instead of silently collapsing roles.
- When delegating a phase, address the mapped child agent explicitly by role, for example `frontend-developer`.
- Do not replace a missing named custom-agent path with a generic worker plus explicit skill prompt.
- Do not treat `wait_agent` timeouts as implicit failures. Keep the same child agent alive and continue waiting with `timeout_ms=3600000` unless the child reaches a terminal state or the user cancels execution.

## Guardrails

- Do not rewrite the plan during execution except for clearly marked execution status notes if the repo already uses them.
- Do not create nested worktrees.
- Do not ask child agents to create branches, worktrees, or merge.
- Do not let planner-lite directly edit application files for a mapped phase unless the user explicitly overrides the child-agent model.
- Do not dispatch mapped phases to generic `worker`, `default`, or `explorer` roles as a substitute for the named custom agent.
- Do not switch the main repo checkout away from the recorded base branch.
- Do not continue past a failed phase validation.
- Do not delete task branches on merge failure.

## Output contract

- Report the executed plan path, base branch, worktree branch, which named custom agents were spawned, commits created, validations run, merge result, and any unresolved blockers.
</Instructions>
</Skill_Guide>
