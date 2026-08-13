# Task Execution Contract

## Input modes

Accept exactly one of:

- `standalone`: a bounded task objective with sufficient acceptance and repository context;
- `task_packet`: an immutable execution packet supplied inline or resolved from a user-provided Local Work Memory Artifact reference.

Reject summaries, metadata-only references, ambiguous ownership, stale packets, digest mismatches, or objectives that require a material product decision.

For `standalone`, create a minimal contract before mutation:

```yaml
execution_input_kind: standalone
run_id: <generated or supplied>
task_id: <generated or supplied>
kind: implementation | integration
objective:
base_sha:
acceptance_conditions: []
owned_paths: []
forbidden_paths: []
dependency_results: []
assigned_worktree:
branch:
verification_commands: []
commit_policy: task_local_required | user_confirmation_required
input_digest:
```

For `task_packet`, preserve its run, task, plan, packet, path, branch, selector, dependency, and commit fields exactly. A packet's producer is irrelevant; only its complete verified contract matters.

## Execution binding

Capture before worktree creation or mutation:

```yaml
execution_input_kind: standalone | task_packet
run_id:
task_id:
kind:
input_digest:
packet_digest: null
git_common_dir:
invocation_root:
assigned_worktree:
branch:
resolved_base_sha:
head_sha_observed:
status_clean:
dependencies: []
commit_policy:
execution_binding_digest:
```

For a packet, set `packet_digest`; for standalone input keep it `null`.

Create the logical binding from the fields above plus ordered dependency task IDs and immutable head SHAs. Sort dependencies by task ID, serialize with RFC 8785 JSON Canonicalization Scheme while the binding digest is empty, and SHA-256 the exact UTF-8 bytes.

## Worktree materialization

If the assigned path is absent:

1. Confirm the Git common dir and immutable base commit.
2. Require the canonical path to be a direct child of a dedicated parent, outside the repository, Git metadata, home configuration, and system paths, with no `..` or symlink component.
3. Require the exact branch to be valid, absent, and not checked out elsewhere.
4. Create the equivalent of `git worktree add -b <branch> <worktree> <base-sha>`.
5. Re-read worktree metadata, branch, HEAD, and status. Require exact matches and a clean status.

Adopt an existing clean path only when its path, common dir, branch, task identity, and HEAD match the binding. A dirty path requires an exact documented same-task resume and explicit user approval.

Do not share dependency directories or build outputs through symlinks. A package-download cache may be shared only when the execution contract authorizes it.

## Scope, validation, and commit

- Compare staged and unstaged diffs with owned paths and declared shared/generated surfaces.
- Stop on unexplained files without deleting or absorbing them.
- Research version-sensitive implementation details through Context7 when available and verify decision-relevant claims with official sources.
- Stop with `NEEDS_INPUT` when new evidence changes requirements, acceptance, or public behavior.
- Stop with `REPLAN_REQUIRED` when ownership, dependency, worktree, or ordering is invalid.
- Run focused checks before broader checks and record commands, duration, status, and concise evidence.
- Stage explicit paths, inspect the staged patch, create at most one authorized task-local commit, and require a clean successful worktree.
- Preserve unsuccessful worktrees as diagnostic evidence without staging or committing invalidated work.

## Integration safety

An integration task uses its own worktree and immutable result SHAs.

- Verify every required result is complete and inspect its base-to-head diff against stated ownership.
- Integrate only pinned SHAs in the declared order and strategy.
- Resolve a conflict only when the correct result is mechanically determined by the supplied contract.
- Return `NEEDS_INPUT` for product or public-contract conflicts and `REPLAN_REQUIRED` for dependency, ownership, or ordering defects.
- Run declared cross-task checks and emit a clean `integrated_head_sha`.

## Task Result

```markdown
# Task Result — <task-id>
- status: COMPLETE | FAILED | NEEDS_INPUT | REPLAN_REQUIRED | BLOCKED
- result_id:
- run_id:
- task_id:
- kind:
- execution_input_kind: standalone | task_packet
- input_digest:
- packet_digest:
- execution_binding_digest:
- worktree:
- worktree_created: true | false
- branch:
- base_sha:
- observed_head_sha:
- result_sha:
- commit:
- phase_reached:
- mutation_occurred:
- worktree_clean:
- status_fingerprint:

## Scope
- changed paths
- ownership exceptions

## Verification
- command, result, duration, evidence

## Review
- finding and disposition

## Sources
- canonical source, version/ref alignment, retrieval provenance, supported claim

## Binding and invalidation
- exact execution binding
- stale inputs and affected dependents
- integration_allowed: false when not COMPLETE

## Deviations, remaining risks, and checks not run

## Integration output
- integrated_head_sha: # integration task only
```

Cleanup remains a separate explicit user action.
