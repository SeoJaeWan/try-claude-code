# Source-branch push

## Bind the exact target

Resolve local repository/common dir, source branch/HEAD, remote URL, source repository and `refs/heads/<source>`, observed remote SHA, and existing PR URL/base when applicable. A fork's source remote can differ from the PR base repository. Upstream/PR evidence may establish the target; a default/base branch alone does not. Ask when identity is materially ambiguous. Record accepted release decisions and applicable commit/push authority; do not guess or substitute targets.

Read/fetch current source history and release records before preparation. Compare actual local/remote states; do not overwrite unseen remote work. If they diverge, reconcile only within authorized source scope with the repository's normal strategy and checks, or report the needed decision. Do NOT merge into the PR base or rewrite history to make a push succeed.

## Prepare and verify locally

Inspect dirty state and preserve user changes. Follow repository isolation rules: reuse a clean, authorized source/preparation checkout, or create a dedicated worktree from the exact confirmed source commit when required. Do not absorb unrelated dirty files or depend on a prior worker's checkout; if required uncommitted inputs cannot be safely bound, resolve their inclusion. Existing source commits need not be recommitted. Declare the small metadata edit scope, inspect the staged diff, and commit only those edits under applicable authority; no empty or duplicate metadata commit is needed when records already suffice.

Run safe project checks appropriate to the actual code/metadata scope, reusing still-valid exact-state evidence where available. Inspect commands before executing release scripts and avoid publish/deploy side effects. Do not introduce a blanket full-suite or reviewer gate. Verification must cover the exact delivery tree/commit; generated or repair changes must be committed or excluded deliberately before pushing. A failed required check preserves the local result and blocks push; report checks not run honestly.

Retain the verified delivery commit in the confirmed local source branch before pushing, so release metadata remains available for later execution or repeat push. If the source is not checked out, recheck checkout inventory immediately before a guarded ref advance from its observed old SHA and confirm the new head. If checked out, never update its ref behind that checkout: integrate there only with confirmed clean/idle state and ownership under the existing bound local integration authority, including primary/pinned; no repeated approval is needed. Dirty/active/shared, concurrent changes, or unknown ownership block that integration and push; preserve/report the result instead of resetting or leaving a stale source branch. Save a concise receipt outside any disposable checkout so the next request can recover target, commit, decisions, metadata, and verification without live agents. Do not automatically clean unrelated checkouts.

## Normal push and confirmation

Recheck clean delivery worktree, exact commit, repository/ref binding, current remote head, and authority. Push the exact SHA explicitly to the confirmed source ref using a normal push; no implicit/default push, force/lease force, remote deletion, or branch-policy bypass. If it already equals the remote head, report `UP_TO_DATE` without another mutation.

Verify the remote ref after the push. Record `PUSHED` only for a confirmed exact head; if the remote advanced immediately, distinguish an accepted push whose commit remains reachable from a current head from an unconfirmed delivery. For a lost response, inspect the remote ref before retrying. A non-fast-forward rejection needs fresh history, bounded reconciliation and affected checks; recurring concurrency or authentication/policy failure ends this request with the preserved local result and a concrete limitation. Do not change remotes to bypass failure.

Return source repository/remote/ref, existing PR URL when known, confirmed comparison base, release mechanism, affected targets and accepted decisions, changed/reused metadata, check results, delivered SHA, confirmed remote SHA, push status, and remaining actions. Distinguish local preparation success from push failure. Pending external checks can be reported as pending; do not poll, monitor, post comments, create a PR, publish, deploy, or remain in a live wait loop. Yield after this push request.
