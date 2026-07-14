# Runner guardrails

The Core rules in `SKILL.md` already enforce the operationally critical
guardrails (HEAD stays on base, one worktree per plan, one Agent call per
plan, etc.). The list below adds the failure-mode-specific ones that
surface less often but cause hard-to-debug state corruption when violated.

1. Never pass `isolation: "worktree"` to Agent — it does not support nested
   Agent calls and prevents merge.
2. Never call `EnterWorktree` — it lacks mid-session exit, making merge
   impossible.
3. Never run plan-runner from inside `worktrees/**` — always from the
   repository root.
4. Never delete the task branch on your own — the user decides when to merge
   and clean up.
5. Always verify the plan dispatch produced commits before relying on the
   stop-gate to do anything useful.
6. Always remove the worktree before asking the user about merge, and never
   `checkout` the task branch — HEAD must stay on the base branch.
7. Never reinterpret one request as multiple plan files or extra workstreams.
8. Never bypass Step 4 dev-review. The worktree stays alive until dev-review
   returns `approved`; rework commits and Q&A both happen inside that gate.
9. Never re-dispatch rework commits to a different `dispatch_agent` than the
   reviewer selected in the UI. The reviewer's choice is authoritative.
10. Never split one plan across multiple plan-agent dispatches. One plan =
    one Agent call. Rework dispatches are separate and narrower.
11. For `dev_review.phase` changes, prefer the `runner-state-cli.mjs`
    subcommands over inline `Edit`/`Write` on the JSON. The CLI bundles
    load + mutate + atomic save and avoids racing with a concurrent
    `/runner` resume in another terminal. Identity fields (plan_path,
    task_branch, base_branch, …) are written once by Step 1 of the runner
    skill and should not be touched mid-plan.
