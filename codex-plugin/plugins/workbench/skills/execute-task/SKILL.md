---
name: execute-task
description: Execute one bounded software implementation or integration task in a dedicated standard Git worktree, with planning, testing, verification, review, and a task-local commit. Invoke only as `$workbench:execute-task`; use when the user supplies a task objective or execution packet and asks to implement or integrate it.
---

# Execute Task

Execute exactly one bounded task in one task-scoped Git worktree.

Read [references/task-execution.md](references/task-execution.md) before creating a worktree or modifying files.

## Procedure

1. Accept either a standalone task objective or a complete execution packet. Resolve a user-provided Local Work Memory Artifact reference through the MCP according to the guidance and contract it currently exposes. Do not require a particular planning tool or producer.
2. Resolve repository identity, Git common dir, immutable base SHA, task scope, acceptance conditions, owned paths, checks, and dependency result SHAs. Ask for input only when a material boundary cannot be discovered safely.
3. For a supplied packet, verify its digest and exact binding. For a standalone objective, create the minimal execution contract defined by the reference.
4. Validate the assigned or derived worktree path and branch. Materialize one standard Git worktree from the immutable base, or adopt an exact clean same-task worktree.
5. Run all task commands and mutations only inside that worktree.
6. Define concrete success checks and, when practical, record a focused expected failure before implementation.
7. Implement the smallest change satisfying the task. Do not absorb unrelated or sibling work.
8. Run focused and broader checks, inspect the final diff and status, and perform a correctness, security, failure-handling, scope, and test self-review.
9. Stage only declared paths, inspect the staged patch, create the authorized task-local commit, and require a clean successful worktree.
10. For an integration task, consume pinned result SHAs, verify their diffs and evidence, integrate only in the declared order, and resolve only mechanically determined conflicts.
11. Return the complete Task Result and stop.

Do NOT modify the user's original checkout, execute additional tasks, stash, reset, clean, force checkout, merge into a user branch, push, publish, open a PR, delete a worktree or branch, or perform work outside this task.
