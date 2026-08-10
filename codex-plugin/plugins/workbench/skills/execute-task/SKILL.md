---
name: execute-task
description: Execute exactly one prepared implementation or integration task in its assigned worktree using plan, test, implementation, verification, review, and task-local commit gates. Invoke only as `$workbench:execute-task`. Use when the user explicitly supplies a prepared run/task ID and names this selector.
---

# Execute Task

Perform stage 8 for exactly one Task Packet. Sibling tasks require separate explicit invocations and may run concurrently only when Prepare placed them in the same parallel wave.

Read [references/task-execution.md](references/task-execution.md) before modifying files.

## Entry gate

- Require `run_id`, `task_id`, a ready Execution Plan, and the exact Task Packet.
- Verify the Git common dir, coordinator identity, assigned worktree path, branch, resolvable base selector, dependency Task Results, immutable Execution Binding, and commit policy.
- Require every existing assigned coordinator or worker worktree to be clean, to use the exact planned branch, and to have `HEAD == resolved_base_sha` before mutation. For a documented resume, require the recorded task identity and prior state to match exactly.
- Do NOT modify or implement in the primary Local checkout.
- If the assigned worker worktree does not exist, create only the exact path and unique branch authorized by the Execution Plan from the Execution Binding's resolved base SHA. Do not reuse an unplanned directory or branch.
- If a coordinator task starts detached, create the exact durable coordinator branch declared by Prepare before mutation.
- Stop on unexpected dirty state, base drift, branch collision, missing dependency, or target-repository policy conflict. Do not stash, reset, clean, or overwrite.

## Implementation task loop

1. **Plan and fact preflight:** restate the task boundary, acceptance criteria, owned paths, shared surfaces, and checks. Identify unresolved external API/version facts and resolve them before mutation.
2. **Research if needed:** use Context7 for version-specific implementation facts, then verify canonical official sources and source-ref alignment with the installed version. Do not treat `main`, `master`, or `canary` as released-version proof. If evidence changes a Shape decision, invariant, acceptance criterion, or public contract, stop with `RESHAPE_REQUIRED` before code changes.
3. **Test:** define the concrete success checks. When practical, add or run a focused failing test before implementation and record the expected failure.
4. **Implement:** make the smallest change that satisfies this Task Packet. Do not absorb sibling work.
5. **Verify:** run focused checks first, then the broader checks required by the packet. Inspect the final diff and Git status. If new decision-changing evidence appears during implementation or verification, stop mutation immediately with `RESHAPE_REQUIRED`.
6. **Self-review:** check correctness, security, failure handling, scope, tests, generated changes, and repository conventions.
7. **Commit:** stage only declared task paths, verify the staged diff, create exactly one task-local commit when the approved Task Packet requires it, and confirm the successful worktree is clean.

## Integration task loop

For `kind: integration`:

1. Verify every required worker result is `COMPLETE` and pin its exact `result_sha`.
2. Recheck each worker diff against its declared ownership boundary.
3. In the coordinator worktree, integrate only the pinned SHAs in Prepare's order and strategy.
4. Resolve only mechanical conflicts clearly covered by the Shape decisions. Return `RESHAPE_REQUIRED` for product/architecture conflict and `REPREPARE_REQUIRED` for invalid task topology.
5. Run cross-task checks on the combined result, self-review the integrated diff, and create the planned integration commit when required.
6. Return a clean `integrated_head_sha`. Finalize never integrates worker fragments.

For a `verify_existing_head` integration seal, pin the successful serial task results already present on the coordinator, verify their ancestry and combined diff, run cross-task checks, and return the current clean coordinator HEAD as `integrated_head_sha` without inventing a merge.

## Output

Return the Task Result from the reference: contract digests, base/observed/result SHAs, changed paths, commit, checks, source notes, deviations, exit state, invalidation scope, and status. A non-`COMPLETE` task preserves its worktree and evidence without committing invalidated work; clean-worktree and result-SHA requirements apply only to successful results.

Do NOT execute sibling tasks, change the Shape contract, merge into the user's Local branch, push, open a PR, hand off, delete a worktree/branch, or invoke another Workbench skill automatically.
Do NOT automatically invoke another Workbench skill.
