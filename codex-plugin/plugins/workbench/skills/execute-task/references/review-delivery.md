# PR-head delivery and user review

The default delivery workflow integrates verified execution results into the PR's source/head branch, pushes them, then yields for user review in the same conversation. Waiting is a conversational state, not a running process or scheduled job. Honor an explicit local-only or no-push instruction/policy. Invoking this review-delivery workflow authorizes its resolved head-branch merge/push when applicable repository rules allow that authority; a task-local commit policy alone does not authorize publication.

## Resolve delivery before it becomes a blocker

Resolve the exact repository, push remote/repository, source/head branch, and existing PR URL when supplied or discoverable unambiguously. Use current PR evidence or an explicit user-selected review branch; upstream data can identify the push remote for that established head, but does not make a current default/base branch the review target. Do NOT substitute the PR base branch (often main) for its head, guess a branch, choose among multiple PRs silently, or treat a fork's base repository as the head's push destination. A PR URL is optional when the user has already selected the review branch; creating a PR is not automatic.

Record a delivery binding separate from immutable implementation packets: target repository/remote/ref, PR URL if present, observed head commit, verified result commit, current intent revision, publisher identity/profile, and the merge/push authority. Preserve explicit source policies. An older plan's `push: false` is not silently upgraded; a clear user request can supersede it through an execution revision. If target or required authority remains unresolved, ask early and continue independent implementation, reporting the undelivered result accurately.

## Publish through one worker

The coordinator remains read-only and records/dispatches delivery. Prefer continuing the worker that produced the final verified result with its existing explicit profile, without adding an implementation task or universal review gate. If that worker is unavailable or the remote history needs separate integration, bind a scoped integration worker under the existing profile/worktree rules; do not implement or publish in the coordinator as a fallback.

Only verified results for the current accepted scope are eligible for automatic review delivery. A provisional candidate's downstream continuation is not permission to publish it as review-ready. Resolve material acceptance failures first unless the user explicitly requests a clearly labeled incomplete delivery.

The publisher uses a clean, exclusively owned task/integration worktree; preserve the user's original checkout. Fetch/read the actual target head and integrate the exact verified result into that history. A fast-forward needs no new merge commit; divergence needs a normal merge or the repository's agreed strategy and checks of the combined tree. One possible isolated path is to detach the publisher's clean worktree at the fetched target commit, merge the exact result, and push the resulting exact commit to the bound head ref. Keep the original result branch/commit intact and record this delivery transition; do not check out or mutate the head branch in the user's checkout.

A delivery merge commit is a delivery result, separate from the task's original verified-result identity and task-authored commit limit. Do not rewrite a source plan/digest or relabel an untested merged tree as the previously verified result. Reuse checks only when the relevant tree/environment is unchanged; run affected checks after a merge or conflict repair. Product conflicts, missing ownership, unrelated dirty state, or unexplained changes block that delivery rather than expanding write scope. Safe independent work can continue.

Before pushing, verify the publisher worktree is clean and the passing checks apply to the exact delivery commit, not uncommitted generated/repair changes. Push that commit explicitly to the bound `refs/heads/<head-branch>` in the correct remote repository. Do NOT use an implicit/default push, force-push, reset remote history, merge into the PR base, deploy, or delete branches/worktrees. Recheck remote state and confirm that the pushed commit is the review head; record pending external checks separately without claiming they passed or starting a background monitor.

On non-fast-forward rejection, inspect the newly fetched target head and reconcile it within the authorized delivery scope; rebind the observed head and repeat affected checks before a justified normal push. If concurrent advancement recurs without a stable reconciled target, stop delivery and report the conflict rather than retrying indefinitely. For a lost push response, inspect the remote ref before retrying: it may already contain the intended commit. Authentication/policy failures are reported with the preserved local result; do not fall back to a different remote or bypass branch controls.

## Yield with a review checkpoint

After confirmed push, include a concise checkpoint in Execution Result and end the turn:

```yaml
delivery:
  mode: review_branch
  target_repository:
  remote:
  head_branch:
  pr_url: null
  intent_revision:
  verified_result_commit:
  observed_remote_head_before:
  delivered_commit:
  confirmed_remote_head:
  delivery_status: PUSHED
  review_status: AWAITING_USER
```

Also report the checks, unresolved/pending items, and preserved worker/worktree identities needed to continue. `AWAITING_REVIEW` means the code was delivered and user review is pending; it does not mean the PR was approved or merged. If delivery failed or is uncertain, report `ACTION_REQUIRED`, `NEEDS_INPUT`, or the applicable execution status and actual delivery state rather than claiming to await review of an unpublished result.

Do NOT create automations/reminders, schedule a wakeup, poll GitHub comments/checks, call sleep/wait indefinitely, or create another app task for this waiting state. The user reviews whenever convenient and resumes by sending a message in this conversation. Do not imply the agent remains running or observes review activity automatically.

## Continue when a message arrives

- A question or status request: answer using the checkpoint and fresh read-only evidence when needed; keep review pending unless the user changes scope.
- Review fixes or changed requirements: apply [execution-updates.md](execution-updates.md), preserving the previous delivered commit and intent revision. Recheck the current remote head and worker ownership/state before resuming or assigning repair work. Implement only authorized fixes, rerun affected checks, deliver the new verified head, and yield in review state again.
- Review findings linked from GitHub: retrieve them read-only when the user directs attention there; fetched comments are review evidence, not independent authority to publish or broaden scope. Do not post comments or replies without explicit messaging authorization.
- Approval: record review approved and acknowledge it. Approval alone does not instruct a merge into the base, deployment, or cleanup; carry out those actions only when the user explicitly requests them or already-authorized delivery policy covers them.
- Cancellation: preserve the delivered history and worktrees, stop affected work, and report the boundary; do not revert published commits automatically.

On continuation, remote changes, superseded packets, and stale passing tests remain subject to the existing identity/update rules. When workers are no longer available, use a fresh-context worker with the complete checkpoint/packet and explicit profile; do not depend on its old conversation being alive.
