# Task Plan Execution Contract

## Accepted input

Accept exactly one of:

- `execution_plan`: a complete plan with a dependency DAG and self-contained task packets;
- `task_packet_set`: one or more complete packets with explicit dependencies;
- `standalone`: one bounded objective with sufficient repository context, acceptance conditions, ownership, and verification commands.

Reject summaries, metadata-only references, ambiguous ownership, stale inputs, digest mismatches, moving branch names used in place of commit IDs, or objectives that require a material product decision.

For a standalone objective, create a one-task plan before spawning a worker. Do not implement it in the coordinator.

## Coordinator boundary

The coordinator owns scheduling and evidence only.

- Resolve repository identity, Git common dir, invocation root, exact base commit ID, current worktree inventory, and every task dependency.
- Verify plan and packet digests when provided.
- Treat `base_commit` as the exact Git commit from which a task starts. Do not substitute a moving branch name after binding.
- Inspect only what is needed to validate scheduling and returned results.
- Do not create or adopt worktrees, install dependencies, run implementation commands, edit files, stage, or commit.
- Do not require a particular plan producer. A complete compatible plan is sufficient.

## Worker runtime

Every implementation or integration task runs in a fresh worker with this fixed profile:

```yaml
fork_turns: none
model: gpt-5.6-sol
reasoning_effort: high
context: complete_task_packet_only
```

The coordinator must pass the worker a complete packet rather than relying on conversation history. If the exact model or effort cannot be requested, return `BLOCKED`; do not inherit or silently fall back.

The host's available agent capacity bounds concurrency. Queue excess runnable tasks instead of changing their execution profile.

## Minimum self-contained task packet

```yaml
task_id:
run_id:
kind: implementation | integration
title:
objective:
repository_id:
git_common_dir:
base_selector:
  kind: exact_commit | task_result | integration_result
  value:
depends_on: []
assigned_worktree:
branch:
acceptance_conditions: []
owned_paths: []
forbidden_paths: []
shared_surfaces: []
runtime_resources: []
implementation_notes: []
focused_checks: []
broader_checks: []
verification_commands: []
commit_policy: task_local_required | no_commit_needed
task_packet_digest:
```

An integration packet also declares required task IDs, exact result commit IDs, integration order, strategy, cross-task checks, and the expected `integrated_head_sha` output.

## Scheduling

1. Mark a task runnable only when every dependency has a successful immutable result commit.
2. Tasks may run in parallel only when they have no dependency path, use the same resolved base commit where required, have disjoint direct and indirect write surfaces, and isolate ports, databases, queues, accounts, fixtures, formatters, generators, and build outputs.
3. Spawn one worker for each runnable task up to available capacity. Queue the rest.
4. Wait for terminal Task Results. Validate result identity and evidence before releasing descendants.
5. Continue independent branches of the DAG after an unrelated failure.
6. Do not run descendants of `FAILED`, `NEEDS_INPUT`, `REPLAN_REQUIRED`, or `BLOCKED` results.
7. Resolve integration selectors only from successful exact result commits and execute integration in the declared order.

## Worker procedure

Each worker performs exactly one packet:

1. Re-resolve the Git common dir and exact base commit ID from the packet.
2. Validate the assigned path as a unique direct child of a dedicated parent outside the repository, Git metadata, home configuration, and system paths, with no `..` or symlink component.
3. Require the exact branch to be valid, absent, and not checked out elsewhere. Create the equivalent of `git worktree add -b <branch> <worktree> <base-commit>` when the path is absent.
4. Adopt an existing path only when its path, common dir, branch, task identity, HEAD, and clean status match the packet. A dirty same-task resume requires explicit user approval.
5. Run all task commands and mutations only inside the assigned worktree.
6. Implement the smallest change satisfying the packet. Compare staged and unstaged changes with owned and declared shared/generated surfaces; stop on unexplained files without deleting or absorbing them.
7. Run focused checks before broader checks and record commands, duration, result, and concise evidence.
8. Inspect the final diff and perform a correctness, security, failure-handling, scope, and verification self-review.
9. Stage only authorized paths, inspect the staged patch, create at most one authorized task result commit, and require a clean successful worktree.
10. Preserve unsuccessful worktrees as diagnostic evidence. Cleanup is a separate explicit user action.

For integration packets, consume only the declared exact result commits. Resolve conflicts only when the correct result is mechanically determined. Return `NEEDS_INPUT` for product or public-contract conflicts and `REPLAN_REQUIRED` for dependency, ownership, worktree, or ordering defects.

## Task Result

```markdown
# Task Result — <task-id>
- status: COMPLETE | FAILED | NEEDS_INPUT | REPLAN_REQUIRED | BLOCKED
- result_id:
- run_id:
- task_id:
- kind:
- worker_model: gpt-5.6-sol
- worker_reasoning_effort: high
- task_packet_digest:
- worktree:
- worktree_created: true | false
- branch:
- base_commit:
- observed_head_commit:
- result_commit:
- phase_reached:
- mutation_occurred:
- worktree_clean:

## Scope
- changed paths
- ownership exceptions

## Verification
- command, result, duration, evidence

## Review
- finding and disposition

## Deviations, remaining risks, and checks not run

## Integration output
- integrated_head_sha: # integration task only
```

Only `COMPLETE` results may release dependent tasks.

## Execution Result

```markdown
# Workbench Execution Result — <run-id>
- status: COMPLETE | PARTIAL | FAILED | NEEDS_INPUT | REPLAN_REQUIRED | BLOCKED
- repository_id:
- base_commit:
- worker_model: gpt-5.6-sol
- worker_reasoning_effort: high
- task_count:
- complete_tasks: []
- unsuccessful_tasks: []
- skipped_descendants: []
- final_integration_commit:

## Task results
- task ID -> status, result commit, worktree, evidence

## Scheduling
- executed waves
- queued or serialized tasks and reasons

## Remaining risks and manual actions
- push, PR, user-branch merge, handoff, and cleanup not performed
```
