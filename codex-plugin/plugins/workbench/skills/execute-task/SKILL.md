---
name: execute-task
description: Coordinate a complete software task plan through parallel GPT-5.6 Sol/high worker agents, each operating in its own standard Git worktree. Invoke only as `$workbench:execute-task`; use when the user asks to execute a prepared plan, a set of task packets, or one bounded implementation objective.
---

# Execute Task

Coordinate an executable task plan without modifying files in the coordinator checkout.

Read [references/task-execution.md](references/task-execution.md) before spawning workers or creating worktrees.

## Procedure

1. Accept a complete execution plan, a self-contained task-packet set, or one bounded standalone objective. Resolve a user-provided Local Work Memory Artifact reference through the MCP contract exposed at invocation time.
2. Verify repository identity, the exact base commit ID, task dependencies, packet digests, owned paths, worktree assignments, runtime resources, and verification commands. Normalize a standalone objective into a one-task plan.
3. Keep the coordinator read-only. It may inspect Git and repository evidence but must not create worktrees, edit files, stage changes, or commit.
4. Determine runnable tasks from the dependency DAG. Parallelize only packets whose write surfaces and runtime resources are isolated.
5. Spawn one worker per runnable task with no conversation history, the complete task packet, model `gpt-5.6-sol`, and reasoning effort `high`. Do not silently fall back to another model or effort.
6. Each worker executes exactly one packet in its assigned standard Git worktree, verifies the result, creates its authorized task result commit, and returns the complete Task Result.
7. Validate returned task identity, base and result commit IDs, status, evidence, and clean worktree. Continue independent tasks, but do not run descendants of an unsuccessful result.
8. Resolve later task selectors from successful immutable result commits. Run integration packets through the same Sol/high worker contract only after their dependencies complete.
9. Return the complete Execution Result and stop.

Do NOT implement directly in the coordinator, modify the user's original checkout, reuse a worktree across tasks, weaken the requested worker model, push, publish, open a PR, merge into a user branch, delete worktrees or branches, or perform work outside this execution plan.
