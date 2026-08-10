# Task Execution Contract

One invocation executes exactly one Task Packet.

## Preflight record

Before mutation, capture:

```yaml
run_id:
task_id:
kind:
shape_report_id:
execution_plan_id:
execution_plan_digest:
task_packet_digest:
git_common_dir:
worktree_root:
branch:
base_selector:
resolved_base_sha:
execution_binding_digest:
head_sha_observed:
status_clean:
dependencies:
commit_policy:
```

For every existing assigned worktree, resolve its canonical root and Git common dir, require the exact planned branch, require a clean status, and require its observed `HEAD` to equal the Execution Binding `resolved_base_sha` before mutation. This applies to coordinator, worker, implementation, and integration tasks. Reject every mismatch or branch/ref drift. Never repair it with stash, reset, clean, forced checkout, or an unplanned rebase.

The Execution Plan and every Task Packet must each be emitted as one immutable YAML artifact with exactly one corresponding digest field and no generated timestamp field. For a Task Packet, normalize only CRLF/CR line endings to LF, replace only the `task_packet_digest` scalar value with the empty string while preserving every other byte, and SHA-256 the complete artifact bytes. For the Execution Plan, use the same procedure with only `execution_plan_digest`. Exclude no lines or fields, and do not trim whitespace. Lowercase-hex encode the digest. A missing/duplicate digest field or any mismatch blocks execution.

Resolve the Task Packet's `base_selector` only after dependencies succeed:

- `exact_sha` resolves to its literal commit;
- `task_output` resolves to the named successful implementation Task Result's `result_sha`;
- `integration_output` resolves to the named successful integration Task Result's `integrated_head_sha`.

Create this exact logical Execution Binding after resolving dependencies:

```json
{
  "version": 1,
  "run_id": "<run_id>",
  "task_id": "<task_id>",
  "execution_plan_digest": "<verified plan digest>",
  "task_packet_digest": "<verified packet digest>",
  "resolved_base_sha": "<40-hex commit>",
  "dependencies": [
    { "task_id": "<dependency ID>", "head_sha": "<immutable result or integrated head SHA>" }
  ],
  "assigned_worktree": "<canonical absolute path>",
  "branch": "<exact branch>",
  "execution_binding_digest": ""
}
```

Sort `dependencies` by `task_id` in ascending Unicode code-point order. Serialize the complete object with [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785), keeping `execution_binding_digest` as the empty string; there are no timestamps or excluded fields. SHA-256 those exact UTF-8 bytes and lowercase-hex encode the result. Preserve the full logical binding and digest in the Task Result so another invocation can reproduce it. Never rewrite the prepared Task Packet with runtime SHAs.

## Worktree materialization

If a worker path is absent and the plan authorizes creation:

1. confirm the canonical path is a direct child of the plan's dedicated `worktree_parent`, contains no `..` or symlink component, is outside repository/Git/home-config/system paths, and is not occupied;
2. confirm the branch is unique and not checked out elsewhere;
3. create it from the exact Execution Binding `resolved_base_sha` and planned branch;
4. run all task commands with that path as the working directory;
5. install worktree-local dependencies using the recorded immutable command.

Do not share `node_modules`, build output, or test caches through symlinks. A global package-download cache may be shared.

## Scope and staging

- Compare both working and staged diffs against `owned_paths` and known generated/shared surfaces.
- Stop on unexplained files. Do not delete or absorb them.
- Stage explicit paths, not broad repository globs.
- Review the staged patch before commit.
- The final worktree must be clean; return the immutable commit SHA.

The clean/commit rule above is a `COMPLETE` gate. For `RESHAPE_REQUIRED`, `REPREPARE_REQUIRED`, `FAILED`, or `BLOCKED`, stop mutation, do not stage or commit invalidated work, preserve the assigned worktree as quarantined evidence, and report its exact dirty state. Never stash, reset, clean, or discard it automatically.

Reject a mutating task unless its packet says `commit_policy: task_local_required`. Allow `no_commit_needed` only when the task is a read-only integration seal and the final diff is empty.

## Source use during implementation

Use Context7 only for generalized library/version questions. Verify decision-relevant material against canonical official docs or the official upstream repository. Record new implementation-level sources in the result.

Continue when new evidence only clarifies an implementation detail within existing decisions. Stop when it changes requirements, invariants, acceptance criteria, public contract, or architecture.

For decision-changing evidence record the source URL, optional canonical official URL, title, installed library/API version or `not_applicable`, source tag/branch/release, version-alignment status, retrieval provenance/date, supported claim, contradiction summary, and affected REQ/NFR/INV/AC/DEC IDs. Mark the old Shape Report and Execution Plan stale, identify downstream tasks/waves that must not integrate, and recommend an explicit new Shape followed by Prepare without invoking either automatically.

## Integration safety

An integration task consumes immutable worker SHAs, never moving branch tips. Verify each `base..head` diff and stated checks before integrating.

- A mechanical conflict is resolvable only when the Shape decision already determines the correct result.
- A product or public-contract conflict returns `RESHAPE_REQUIRED`.
- A dependency, ownership, or ordering flaw returns `REPREPARE_REQUIRED`.
- Run the plan's cross-task checks after combining all pinned results.
- For `verify_existing_head`, require every declared serial task result to be an ancestor of the clean coordinator HEAD, inspect the combined base-to-head diff, run cross-task checks, and emit that HEAD as `integrated_head_sha`.

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
- execution_binding_digest:
- worktree:
- branch:
- base_sha:
- observed_head_sha:
- result_sha: # COMPLETE only; null otherwise
- commit: # null unless COMPLETE
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
- source URL, canonical official URL if verified, installed/source version alignment, retrieval date/provenance, claim, contradiction, affected contract IDs

## Execution Binding
- version: 1
- run_id, task_id, execution_plan_digest, task_packet_digest
- resolved_base_sha, dependencies ordered by task_id
- assigned_worktree, branch, execution_binding_digest

## Contract invalidation
- stale artifacts
- affected downstream task IDs/waves
- integration_allowed: false when not COMPLETE

## Deviations and remaining risks

## Checks not run
- check and reason

## Recommended next
- explicit selector and reason; never auto-invoked

## Integration output
- integrated_head_sha: # integration task only
```

Preserve failed worktrees and branches for diagnosis. Cleanup is a later explicit user action.
