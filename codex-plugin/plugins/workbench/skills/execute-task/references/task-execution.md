# Task Execution Contract

One invocation executes exactly one persisted Task Packet in one task-scoped standard Git worktree.

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
shape_artifact_digest:
shape_wiki_source_id:
shape_wiki_slug:
shape_wiki_revision:
prepare_artifact_digest:
prepare_wiki_source_id:
prepare_wiki_slug:
prepare_wiki_revision:
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

Require the supplied Shape and Prepare Memory Update Results to report `status: APPLIED` or `NOT_NEEDED`, the corresponding `artifact_kind`, and exact matches for the plan's Shape/Prepare artifact IDs and digests. Retrieve both exact `source_id` values with `memory_get`, normalize each canonical body line ending, recompute both digests, and compare every returned opaque revision with its supplied reference. Reject a search excerpt, missing body, unavailable memory service, stale revision, digest mismatch, indeterminate result, or superseded Shape or Prepare persistence state.

## Artifact and binding digests

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
  "execution_plan_digest": "<verified plan digest>",
  "task_packet_digest": "<verified packet digest>",
  "shape_artifact_digest": "<verified persisted Shape artifact digest>",
  "prepare_artifact_digest": "<verified persisted Prepare artifact digest>",
  "resolved_base_sha": "<40-hex commit>",
  "dependencies": [
    { "task_id": "<dependency ID>", "head_sha": "<immutable result or integrated head SHA>" }
  ],
  "assigned_worktree": "<canonical absolute path>",
  "branch": "<exact planned branch>",
  "execution_binding_digest": ""
}
```

Sort dependencies by `task_id` in ascending Unicode code-point order. Serialize with [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785), keeping `execution_binding_digest` empty, then SHA-256 the exact UTF-8 bytes and lowercase-hex encode it.

## Standard Git worktree materialization

If the assigned path is absent:

1. Resolve the repository Git common dir and confirm it equals the plan.
2. Confirm the canonical assigned path is a direct child of the dedicated `worktree_parent`, has no `..` or symlink component, lies outside repository/Git/home-configuration/system paths, and is unoccupied.
3. Confirm `resolved_base_sha` is an existing commit.
4. Confirm the exact planned branch is valid, absent, and not checked out in `git worktree list --porcelain`.
5. Create exactly one worktree and branch equivalent to:

   ```text
   git worktree add -b <planned-branch> <assigned-worktree> <resolved-base-sha>
   ```

6. Re-read `git worktree list --porcelain`, the new worktree's common dir, branch, HEAD, and status. Require exact matches and a clean status before continuing.
7. Run subsequent commands with the assigned path as working directory. Install task-local dependencies using the recorded immutable command.

Do not share `node_modules`, build output, or test caches through symlinks. A package-download cache may be shared when Prepare authorized it.

If the assigned path already exists and is clean, adopt it only for an exact clean pre-created packet worktree whose path, common dir, branch, task identity, and HEAD match the binding. A dirty path is an exact documented same-task resume only when the packet names the prior `resume_from_result_id`, copies its `resume_status_fingerprint`, sets `adopt_partial_diff: true`, and the user explicitly approves. Before adoption, compare the prior Task Result with the current path, common dir, branch, base HEAD, staged/unstaged/untracked paths, and deterministic status fingerprint; every value must match. Never switch its branch, reset it, clean it, or repurpose it. Any mismatch blocks execution.

## Scope and staging

- Compare working and staged diffs against `owned_paths` and declared generated/shared surfaces.
- Stop on unexplained files. Do not delete or absorb them.
- Stage explicit paths rather than broad globs.
- Review the staged patch before commit.
- A successful mutating task ends at one immutable task-local commit with a clean status.

For `RESHAPE_REQUIRED`, `REPREPARE_REQUIRED`, `FAILED`, or `BLOCKED`, stop mutation, do not stage or commit invalidated work, and preserve the task worktree as quarantined evidence. Never stash, reset, clean, or discard it automatically.

Reject a mutating task unless `commit_policy: task_local_required`. Permit `no_commit_needed` only for a read-only integration seal with an empty diff.

## Source use and contract invalidation

Use Context7 only for generalized library/version questions and verify decision-relevant claims against canonical official sources or upstream repositories.

Continue when evidence clarifies an implementation detail within existing decisions. Stop when it changes requirements, invariants, acceptance, public contract, architecture, task ownership, or ordering.

- Decision change: return `RESHAPE_REQUIRED` and mark Shape, Prepare, and downstream tasks stale.
- Ownership, dependency, or ordering change: return `REPREPARE_REQUIRED` and mark affected tasks/waves stale.

Do not invoke either skill automatically.

## Integration safety

Every integration task has its own unique worktree and consumes immutable result SHAs, never moving branch tips.

- Start from the packet's resolved base.
- Verify each `base..head` diff and stated checks before integrating.
- Resolve a mechanical conflict only when Shape already determines the correct result.
- Return `RESHAPE_REQUIRED` for product/public-contract conflict.
- Return `REPREPARE_REQUIRED` for dependency, ownership, or ordering flaws.
- Run the plan's cross-task checks after combining pinned results.
- For `verify_existing_head`, require declared serial results to be ancestors of the resolved base/head chain, inspect the combined diff, and emit the seal worktree's clean HEAD as `integrated_head_sha`.

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
- shape_artifact_digest:
- shape_wiki_source_id:
- shape_wiki_slug:
- shape_wiki_revision:
- prepare_artifact_digest:
- prepare_wiki_source_id:
- prepare_wiki_slug:
- prepare_wiki_revision:
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
- version: 1
- run_id, task_id, execution_plan_digest, task_packet_digest, shape_artifact_digest, prepare_artifact_digest
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
