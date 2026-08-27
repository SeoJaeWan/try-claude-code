---
name: prepare
description: Create an executable task DAG and isolated Git worktree plan from a software change request, issue, requirements document, or existing analysis artifact. Invoke only as `$workbench:prepare`; use when the user explicitly asks to "작업을 분해해", "실행 계획을 만들어", or "워크트리 계획을 확정해".
---

# Prepare

Produce a standalone execution plan without implementing, persisting, or creating worktrees.

Read [references/execution-plan.md](references/execution-plan.md) before producing the plan.

## Procedure

1. Accept any sufficiently complete change definition supplied inline or through a user-provided Local Work Memory Artifact reference. Resolve a supplied reference through the MCP according to the guidance and contract it currently exposes. Do not require a particular producer or document type.
2. Resolve the repository root, checkout root, Git common dir, HEAD, branch, status, and worktree inventory.
3. Use the Local Work Memory MCP for relevant project conventions, and inspect repository evidence needed to make the plan self-contained. Ask only for material decisions that cannot be discovered.
4. Require a clean, stable execution base. Do not stash, reset, clean, copy, or checkpoint user changes.
5. Convert requirements and acceptance conditions into independently verifiable tasks with an explicit dependency DAG and execution waves.
6. Define each task's inputs, owned and forbidden paths, indirect collision surfaces, runtime resources, checks, completion contract, worktree path, branch, and immutable base selector.
7. Parallelize only tasks with the same immutable base, no dependency path, disjoint write surfaces, and isolated runtime resources. Add integration tasks after parallel waves and a final integration-seal task.
8. Discover and run only safe commands needed to establish the baseline. Record stable evidence for pre-existing failures and stop if a command changes tracked files unexpectedly.
9. Validate IDs, acyclicity, dependencies, branches, paths, selectors, worktree count, and packet digests.
10. Return the complete immutable plan, then append a concise human-readable walkthrough of the planned waves, task purposes, dependencies, parallel work, integration, and delivery boundary. Do not make the user ask separately for an explanation. Then stop.

Do NOT implement tasks, create or delete worktrees, integrate commits, persist the plan, modify repository files, push, publish, or perform work outside this skill's planning scope.
