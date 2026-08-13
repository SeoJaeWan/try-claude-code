---
name: execute-task
description: Execute exactly one ready Prepare task, supplied inline or by Local Work Memory Artifact reference, by materializing its unique standard Git worktree, then plan, test, implement or integrate, verify, review, and create a task-local commit. Invoke only as `$workbench:execute-task`. Use when the user explicitly supplies a run/task ID and names this selector.
---

# Execute Task

Perform stage 8 for exactly one Task Packet. Sibling tasks require separate explicit invocations and may run concurrently only when Prepare placed them in the same parallel wave.

Read [references/task-execution.md](references/task-execution.md) before creating a worktree or modifying files.

## Entry gate

- Require `run_id`, `task_id`, one complete `READY` Execution Plan, and the exact Task Packet. Accept the plan directly from the current task context or user input. When the user supplies a Local Work Memory Artifact reference instead, use the Local Work Memory MCP to resolve its canonical content.
- Do not require Shape or Prepare to have been persisted. A persistence result or Artifact reference is never an execution prerequisite.
- Use the Local Work Memory MCP to reference current project conventions or other canonical project documents when needed. Follow the MCP tool contract rather than duplicating its usage details here.
- Verify Git common dir, repository identity, plan/packet digests, assigned path, unique branch, resolvable base selector, successful dependency results, immutable Execution Binding, and commit policy.
- Permit invocation from primary Local or another checkout, but never modify there. All task commands and mutations run only inside the assigned task worktree.
- If the assigned task worktree is absent, materialize exactly the planned path and branch from the resolved immutable base using standard Git worktree commands after every safety check in the reference.
- Stop on dirty or mismatched worktree state, base drift, branch collision, missing dependency, invalid plan binding, or repository-policy conflict. Do not stash, reset, clean, overwrite, or force checkout.

## Implementation task loop

1. **Plan and fact preflight:** restate task boundary, acceptance criteria, owned paths, shared surfaces, checks, base, and Execution Plan binding.
2. **Research if needed:** resolve version-sensitive implementation facts through Context7 and canonical official sources. Stop with `RESHAPE_REQUIRED` before mutation if evidence changes requirements, invariants, acceptance, public contract, or architecture.
3. **Test:** define concrete success checks. When practical, add or run a focused failing test and record the expected failure.
4. **Implement:** make the smallest change satisfying this packet. Do not absorb sibling work.
5. **Verify:** run focused checks then required broader checks. Inspect final diff and Git status.
6. **Self-review:** inspect correctness, security, failure handling, scope, tests, generated changes, and repository conventions.
7. **Commit:** stage only declared paths, verify the staged diff, create exactly one task-local commit when required, and confirm the successful task worktree is clean.

## Integration task loop

For `kind: integration`:

1. Materialize the integration packet's own unique worktree and branch from its resolved base.
2. Verify every required Task Result is `COMPLETE` and pin its immutable `result_sha`.
3. Recheck each task diff against its ownership boundary.
4. Integrate only pinned SHAs using Prepare's order and strategy.
5. Resolve only mechanical conflicts determined by Shape decisions. Return `RESHAPE_REQUIRED` for product or architecture conflict and `REPREPARE_REQUIRED` for invalid task topology.
6. Run cross-task checks, self-review, create the planned integration commit when required, and return a clean `integrated_head_sha`.

For `verify_existing_head`, create the seal packet's unique worktree from the final serial task result, verify ancestry and the combined base-to-head diff, run cross-task checks, and emit its clean HEAD without inventing a merge.

## Output

Return the Task Result from the reference: plan and packet identity, base/observed/result SHAs, worktree materialization evidence, changed paths, commit, checks, sources, deviations, invalidation scope, and status.

A non-`COMPLETE` task preserves its worktree and evidence without committing invalidated work. Clean-worktree and result-SHA requirements apply only to successful results.

Do NOT execute sibling tasks, change Shape or Prepare contracts, modify the user's Local checkout, merge into the user's Local branch, push, open a PR, hand off, delete a worktree/branch, or invoke another Workbench skill automatically.

Do NOT automatically invoke another Workbench skill.
