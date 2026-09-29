# Local PR-head delivery and cleanup

Default finish means verified local PR source/head integration, a durable continuation checkpoint, and safe cleanup of eligible task worktrees. Remote push is `NOT_REQUESTED`; even an older input's `push: true` does not cause a push in this workflow. Preserve that source policy as history and report publication as a separate explicit action. Honor current explicit no-integration/no-cleanup instructions; no-push alone still permits local integration and safe cleanup.

## Resolve the local target

Resolve the exact repository/common dir, local source/head branch, observed local commit, and existing PR URL/head repository when available. Use unambiguous PR evidence or an explicit user-selected branch; do NOT substitute the PR base/default branch, guess among PRs, or assume a fork's base repository is its source. A PR URL or network connection is not required when the local review target is already established. Record target and local integration authority separately from immutable implementation packets, with the verified result, current intent revision, worker identity/profile, and cleanup policy.

An explicit execution request enables this default local finish when repository rules permit it. A task-local commit policy alone does not authorize integration. Preserve explicit source prohibitions, including no local merge or cleanup; apply a clear superseding user instruction through a binding revision. Missing identity/authority blocks only delivery, not independent implementation. Ask material questions early and report preserved results when unresolved.

## Integrate through one worker

The coordinator stays read-only. Prefer the final worker with its existing explicit profile; use a scoped integration worker only when needed. Only verified results for the latest accepted scope qualify for default delivery. Provisional continuation does not establish acceptance or permission to label a candidate as delivered.

Inspect current branch/worktree inventory and target HEAD immediately before integration. Use fast-forward or a normal repository-approved merge retaining exact verified-result ancestry, and check the combined tree after divergence/conflict repair. Keep original result and delivery commits distinct; reuse checks only for an unchanged relevant tree/environment. Conflicts, unrelated changes, or missing ownership block affected delivery rather than expanding scope.

- If the source branch is not checked out anywhere, integrate from the observed local head in an exclusively owned worktree. Recheck checkout inventory before advancing the local source ref, and advance only if still unchecked-out and its old value matches. Otherwise use the checked-out handling below. Re-read the ref to confirm the exact delivered commit.
- If it is checked out elsewhere, do NOT update its ref behind that checkout. The assigned worker may fast-forward/merge in the confirmed clean, idle source checkout under the default local integration authority, including a primary or pinned checkout. Confirm ownership, no active process/write task, and no in-progress Git operation first; no repeated approval is needed for that bound local integration. The coordinator cannot perform this mutation. Dirty, active, shared, currently needed, or uncertain-ownership checkouts block integration; preserve/report them. This integration authority never authorizes removing the source checkout.
- If the target changes during integration, inspect/rebind the new head and repeat affected checks. Stop on recurring concurrent advancement rather than retrying indefinitely. Do NOT reset/rewrite history or substitute another target.

Confirm a clean delivered tree, passing checks for that exact commit, and the local source ref's exact identity before cleanup. A normal merge may add a delivery commit beyond a task's one authored result commit. An authorized repository strategy that copies commits cannot justify cleanup from tree similarity: exact task result commits must be reachable from the confirmed source branch.

## Durable checkpoint and safe cleanup

Before removing anything, the worker saves the minimum continuation evidence outside all removable worktrees, for example an ignored run receipt under the Git common dir or a host artifact store. Preserve input/binding/revision identities, target/ref and delivered SHA, task result SHAs, checks/findings, accepted decisions, and necessary logs/patches. Copy needed ignored evidence too; archive snapshots need not include ignored files. Confirm the checkpoint is readable without live workers or their checkout paths.

Clean only this run's exclusively owned task/integration worktrees once writers, helpers, and commands are quiescent, descendants no longer need them, and every exact result to preserve is reachable from the confirmed local source branch. Immediately recheck inventory, status (including untracked files), in-progress Git operations, reachability, and needed evidence. Preserve dirty/unmerged/provisional, shared, pinned, primary, or currently needed checkouts. Do NOT delete branches by default.

Use the host archive operation for a managed worktree when available. For ordinary standard Git worktrees, use `git worktree remove` without force only after these proofs and after moving the cleanup worker's working directory outside the checkout being removed. Do NOT use shell deletion, force removal, pruning as a substitute, or cleanup of unrelated old worktrees. Verify archive/removal outcome. A cleanup tool failure or safety preservation is a reported limitation, not permission to discard work.

## Return and continue

Use a compact checkpoint such as:

```yaml
delivery:
  mode: local_pr_head
  target_repository:
  head_branch:
  pr_url: null
  intent_revision:
  verified_result_commit:
  observed_local_head_before:
  delivered_commit:
  confirmed_local_head:
  local_integration: VERIFIED # or NOT_REQUESTED, NEEDS_INPUT, FAILED
  remote_push: NOT_REQUESTED
  checkpoint_path:
  cleanup:
    status: COMPLETE # or NOT_REQUESTED, PRESERVED, FAILED
    removed_or_archived: []
    preserved: [] # path and reason
```

Return `COMPLETE` only when implementation, applicable verification, requested local integration, durable evidence, and requested safe cleanup are accounted for. An explicit no-integration/no-cleanup policy may be `NOT_REQUESTED`; eligible removals must be verified. If requested cleanup is limited or fails, report `ACTION_REQUIRED` with the confirmed local result and preserved paths, rather than false completion. Use `NEEDS_INPUT` for a material unresolved target/authority decision. End the turn; no remote publication or live review wait is implied.

A later question uses the checkpoint and fresh read-only evidence. Review fixes follow [execution-updates.md](execution-updates.md), rechecking the local source head and assigning fresh task worktrees when old ones were removed. Preserve prior result identity and verify the updated scope before local delivery/cleanup. User-directed GitHub findings can be read as evidence; do NOT post replies without messaging authorization. Approval alone does not authorize PR base merge, remote push, or deployment. Cancellation preserves local history and any unfinished work; do not revert commits automatically.
