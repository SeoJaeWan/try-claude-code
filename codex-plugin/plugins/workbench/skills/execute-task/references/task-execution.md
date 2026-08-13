# Task Execution Contract

One invocation executes exactly one ready Task Packet in one task-scoped standard Git worktree. The plan may be supplied inline or resolved from a Local Work Memory Artifact reference.

## Plan input

Accept either:

- `inline`: the complete Execution Plan and selected Task Packet are present in the current task context or user input;
- `memory_artifact`: the user supplies a Local Work Memory Artifact reference and Execute Task resolves the complete Prepare artifact through the MCP.

Do not require Memory Update. Reject summaries, metadata-only references, incomplete packets, digest mismatches, stale plans, and plans for a different repository or run.

## Preflight record

Capture before any worktree creation or mutation:

```yaml
run_id:
task_id:
kind:
shape_report_id:
execution_plan_id:
execution_plan_digest:
task_packet_digest:
plan_input_kind: inline | memory_artifact
plan_artifact_ref: null
git_common_dir:
invocation_root:
assigned_worktree:
branch:
base_selector:
resolved_base_sha:
execution_binding_digest:
head_sha_observed:
status_clean:
dependencies:
commit_policy:
```

For inline input, keep `plan_artifact_ref: null`. For referenced input, preserve the exact MCP Typed Reference.

## Plan, packet, and binding digests

The Execution Plan and every Task Packet must be immutable YAML artifacts with exactly one corresponding digest field and no generated timestamp field.

- Normalize only CRLF/CR line endings to LF.
- Replace only the relevant digest scalar value with the empty string.
- Preserve every other byte; exclude no lines and trim no whitespace.
- SHA-256 the complete UTF-8 bytes and lowercase-hex encode the result.

Resolve `base_selector` only after dependencies succeed:

- `exact_sha` resolves to its literal commit;
- `task_output` resolves to the named successful Task Result's `result_sha`;
- `integration_output` resolves to the named successful integration result's `integrated_head_sha`.

Create this logical Execution Binding:

```json
{
  "version": 1,
  "run_id": "<run_id>",
  "task_id": "<task_id>",
  "shape_report_id": "<shape_report_id>",
  "execution_plan_id": "<execution_plan_id>",
  "execution_plan_digest": "<verified plan digest>",
  "task_packet_digest": "<verified packet digest>",
  "resolved_base_sha": "<40-hex commit>",
  "dependencies": [
    { "task_id": "<dependency ID>", "head_sha": "<immutable result SHA>" }
  ],
  "assigned_worktree": "<canonical absolute path>",
  "branch": "<exact planned branch>",
  "execution_binding_digest": ""
}
```

Sort dependencies by `task_id` in ascending Unicode code-point order. Serialize with RFC 8785 JSON Canonicalization Scheme, keep `execution_binding_digest` empty, then SHA-256 the exact UTF-8 bytes.

## Standard Git worktree materialization

If the assigned path is absent:

1. Resolve the repository Git common dir and confirm it equals the plan.
2. Confirm the canonical assigned path is a direct child of the dedicated `worktree_parent`, has no `..` or symlink component, lies outside repository/Git/home-configuration/system paths, and is unoccupied.
3. Confirm `resolved_base_sha` is an existing commit.
4. Confirm the exact planned branch is valid, absent, and not checked out in `git worktree list --porcelain`.
5. Create exactly one worktree and branch equivalent to `git worktree add -b <planned-branch> <assigned-worktree> <resolved-base-sha>`.
6. Re-read worktree metadata, branch, HEAD, and status. Require exact matches and a clean status.
7. Run subsequent commands only inside the assigned worktree.

Do not share `node_modules`, build output, or test caches through symlinks. A package-download cache may be shared only when Prepare authorized it.

If the assigned path already exists and is clean, adopt it only when path, common dir, branch, task identity, and HEAD match the binding. A dirty path is an exact documented same-task resume only when the packet and prior Task Result satisfy the resume contract and the user explicitly approves.

## Scope and staging

- Compare working and staged diffs against `owned_paths` and declared generated/shared surfaces.
- Stop on unexplained files. Do not delete or absorb them.
- Stage explicit paths rather than broad globs.
- Review the staged patch before commit.
- A successful mutating task ends at one immutable task-local commit with a clean status.

For `RESHAPE_REQUIRED`, `REPREPARE_REQUIRED`, `FAILED`, or `BLOCKED`, stop mutation, do not stage or commit invalidated work, and preserve the task worktree as quarantined evidence.

## Source use and contract invalidation

Use the Local Work Memory MCP for current project conventions and canonical project documents when needed. Use Context7 only for generalized library/version questions and verify decision-relevant claims against official sources.

- Decision or acceptance change: return `RESHAPE_REQUIRED`.
- Ownership, dependency, worktree, or ordering change: return `REPREPARE_REQUIRED`.

Do not invoke either skill automatically.

## Integration safety

Every integration task has its own unique worktree and consumes immutable result SHAs, never moving branch tips.

- Start from the packet's resolved base.
- Verify each `base..head` diff and stated checks before integrating.
- Resolve a mechanical conflict only when Shape already determines the correct result.
- Return `RESHAPE_REQUIRED` for product/public-contract conflict.
- Return `REPREPARE_REQUIRED` for dependency, ownership, or ordering flaws.
- Run the plan's cross-task checks after combining pinned results.

## Task Result

```markdown
# Task Result — <task_id>
- status: COMPLETE | FAILED | RESHAPE_REQUIRED | REPREPARE_REQUIRED | BLOCKED
- result_id: <run_id>/<task_id>/<attempt>
- run_id:
- kind:
- shape_report_id:
- execution_plan_id:
- execution_plan_digest:
- task_packet_digest:
- plan_input_kind: inline | memory_artifact
- plan_artifact_ref:
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
- staged_paths:
- unstaged_paths:
- untracked_paths:

## Scope
- changed paths
- ownership exceptions: none | details

## Verification
- command, result, duration, evidence

## Review
- self-review findings and disposition

## Sources
- canonical source, version/ref alignment, retrieval provenance/date, claim, affected contract IDs

## Execution Binding
- version, run/task/Shape/plan identity, plan/packet digests, resolved base, ordered dependencies, worktree, branch, binding digest

## Contract invalidation
- stale inputs
- affected downstream task IDs/waves
- integration_allowed: false when not COMPLETE

## Deviations and remaining risks

## Checks not run
- check and reason

## Recommended next
- user-selectable action; never auto-invoked

## Integration output
- integrated_head_sha: # integration task only
```

Preserve failed worktrees and branches for diagnosis. Cleanup is a later explicit user action.
