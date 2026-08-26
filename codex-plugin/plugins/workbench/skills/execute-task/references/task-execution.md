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

An integration packet also declares required task IDs, integration order, strategy, cross-task checks, and the expected `integrated_head_sha` output. The coordinator binds each required task ID to an exact verified result commit or an exact provisional candidate at runtime.

## Execution principle

Preserve the approved plan as the immutable statement of intent. Treat implementation-time conflicts, failed checks, and inaccurate planning assumptions as execution findings, not automatic reasons to replace the plan or stop the run.

- Attempt the smallest repair that remains inside the packet's objective, contracts, owned or declared shared surfaces, and authority.
- When a finding remains, finish every later implementation step and check that is still safe, executable, and meaningful.
- Create a provisional candidate commit when authorized implementation is structurally usable by downstream work even though verification has not passed.
- Continue downstream work from a provisional candidate only when the worker explicitly returns `continuation: ALLOWED` with evidence that the required material interface exists.
- Never treat continuation as acceptance. Only passing verification produces a verified result, and only passing final integration checks produces a final integration commit.
- Exhaust all independent and materially runnable work before returning `NEEDS_INPUT`, `ACTION_REQUIRED`, or `BLOCKED` to the user.

## Scheduling

1. Mark a task runnable when every dependency has either an exact verified result commit or an exact provisional candidate with `continuation: ALLOWED` and the material prerequisite needed by the task exists.
2. Tasks may run in parallel only when they have no dependency path, use the same resolved base commit where required, have disjoint direct and indirect write surfaces, and isolate ports, databases, queues, accounts, fixtures, formatters, generators, and build outputs.
3. Spawn one worker for each runnable task up to available capacity. Queue the rest.
4. Wait for terminal Task Results. Validate result identity and evidence before releasing descendants.
5. Continue independent branches after any unrelated finding or blocker. Continue dependent branches from usable provisional candidates and record that scheduling decision.
6. Stop only the affected descendants when `continuation: NOT_POSSIBLE`, no exact commit exists, or the required material interface is absent. A failed check alone is not a scheduling barrier.
7. Resolve selectors only from exact immutable commits. Prefer a verified result; otherwise use an explicitly allowed provisional candidate without changing the original plan or packet digest.
8. Run each materially runnable integration packet in its declared order. Carry unresolved findings into integration so it can expose or mechanically repair cross-task incompatibilities.
9. Do not interrupt the run solely to report an implementation conflict. Execute everything that does not require new authority or an unavailable prerequisite, then report once in the Execution Result.

## Worker procedure

Each worker performs exactly one packet:

1. Re-resolve the Git common dir and exact base commit ID from the packet.
2. Validate the assigned path as a unique direct child of a dedicated parent outside the repository, Git metadata, home configuration, and system paths, with no `..` or symlink component.
3. Require the exact branch to be valid, absent, and not checked out elsewhere. Create the equivalent of `git worktree add -b <branch> <worktree> <base-commit>` when the path is absent.
4. Adopt an existing path only when its path, common dir, branch, task identity, HEAD, and clean status match the packet. A dirty same-task resume requires explicit user approval.
5. Run all task commands and mutations only inside the assigned worktree.
6. Implement the smallest change satisfying the packet. When implementation exposes a conflict or failed assumption, attempt the smallest repair inside the same objective and authorized surfaces. Compare staged and unstaged changes with owned and declared shared/generated surfaces; stop mutation on unexplained files without deleting or absorbing them.
7. Run focused checks before broader checks. After a failure, continue every later check that remains safe, executable, and diagnostically meaningful. Record commands, duration, result, and concise evidence.
8. Inspect the final diff and perform a correctness, security, failure-handling, scope, and verification self-review. Classify every finding as `resolved_in_task`, `carried_to_integration`, `action_required`, or `hard_blocker`.
9. Stage only authorized paths and inspect the staged patch. For `task_local_required`, create at most one commit: a `verified_result` when verification passes, or a `provisional_candidate` when the implementation is structurally usable but findings remain. Require a clean worktree after either commit and never label the provisional commit as verified.
10. Set `continuation: ALLOWED` only when an exact commit exists and downstream work can consume the required material interface without inventing a product decision or expanding authority. Otherwise set `continuation: NOT_POSSIBLE` and state the missing prerequisite.
11. Preserve any unsuccessful uncommitted worktree as diagnostic evidence. Cleanup is a separate explicit user action.

For integration packets, consume the coordinator-bound exact verified results and allowed provisional candidates. Attempt every declared integration and cross-task check that remains meaningful. Resolve incompatibilities only when the correct result is mechanically determined and stays inside authorized integration surfaces. If final verification passes, return a verified `integrated_head_sha`; otherwise return a clearly labeled `candidate_integrated_head_sha` when a usable integrated candidate exists. Preserve product or public-contract conflicts as `action_required`, execute unrelated remaining work, and report them after the run instead of silently changing the approved plan.

## Task Result

```markdown
# Task Result — <task-id>
- status: COMPLETE | IMPLEMENTED_WITH_FINDINGS | PARTIAL | NEEDS_INPUT | BLOCKED
- implementation_status: COMPLETE | PARTIAL | NOT_STARTED
- verification_status: PASS | FAIL | NOT_RUN
- continuation: ALLOWED | NOT_POSSIBLE
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
- commit_kind: verified_result | provisional_candidate | none
- result_commit: # verified only
- candidate_commit: # provisional only
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

## Implementation-time findings
- planned assumption
- observed conflict or failure
- attempted repair
- disposition: resolved_in_task | carried_to_integration | action_required | hard_blocker
- downstream impact and evidence

## Deviations, remaining risks, and checks not run

## Integration output
- integrated_head_sha: # verified integration only
- candidate_integrated_head_sha: # provisional integration only
```

`COMPLETE` requires completed implementation and passing verification. `IMPLEMENTED_WITH_FINDINGS` and `PARTIAL` do not claim acceptance, but may release a dependent task when they provide an exact provisional candidate and `continuation: ALLOWED`. Status alone never releases a dependency.

## Execution Result

```markdown
# Workbench Execution Result — <run-id>
- status: COMPLETE | ACTION_REQUIRED | PARTIAL | NEEDS_INPUT | BLOCKED
- repository_id:
- base_commit:
- worker_model: gpt-5.6-sol
- worker_reasoning_effort: high
- task_count:
- attempted_tasks: []
- complete_tasks: []
- provisional_tasks: []
- unattempted_tasks: []
- final_integration_commit: # verified only
- candidate_integration_commit: # provisional only

## Task results
- task ID -> status, implementation status, verification status, continuation, commit kind, exact commit, worktree, evidence

## Scheduling
- executed waves
- descendants continued from provisional candidates
- queued, serialized, or unattempted tasks and reasons

## Plan-versus-execution findings
- planned assumption
- observed conflict or failure
- attempted repair
- final disposition
- exact action required before delivery

## Remaining risks and manual actions
- push, PR, user-branch merge, handoff, and cleanup not performed
```

Return `COMPLETE` only when all required implementation and final verification pass. Return `ACTION_REQUIRED` when all safely runnable work was attempted but unresolved findings still prevent acceptance. Return `PARTIAL` when material prerequisites made some planned work impossible to attempt, `NEEDS_INPUT` when a user decision or new authority is required, and `BLOCKED` when execution could not make meaningful progress. Do not replace the original plan automatically; report the execution evidence so the user can decide any follow-up.
