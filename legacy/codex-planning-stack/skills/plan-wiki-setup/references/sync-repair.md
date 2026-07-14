# Plan Wiki Sync/Repair

Use this reference when the project-local plan wiki source clone exists but planning cannot continue because orchestration preflight could not fast-forward the clone.

## Purpose

Receive remote plan wiki changes without losing local plan wiki maintenance work, then leave `./.codex/plan-wiki/source/wiki` in a verified state for planning agents.

This unit is separate from orchestrator. Orchestrator may detect the problem, but it must not merge, rebase, reset, stash, or repair the nested plan wiki source repo itself.

## Inputs

- Source repo: `./.codex/plan-wiki/source`
- Config: `./.codex/plan-wiki/config.json`
- Planning root: `./.codex/plan-wiki/source/wiki`
- The failing preflight command and output, when available:
  - `git -C .codex/plan-wiki/source pull --ff-only`

## Required Preflight

Run from the workspace root:

```text
node .codex/tools/stage-plan-wiki.mjs
git -C .codex/plan-wiki/source status --short --branch
git -C .codex/plan-wiki/source remote -v
git -C .codex/plan-wiki/source fetch origin
git -C .codex/plan-wiki/source log --oneline --decorate --left-right HEAD...origin/main
```

If the configured branch is not `main`, replace `origin/main` with the configured upstream branch from `./.codex/plan-wiki/config.json`.

## State Classification

| State | Condition | Safe action |
| --- | --- | --- |
| `clean-current` | Worktree clean and no ahead/behind | Verify planning root and return ready |
| `clean-behind` | Worktree clean, local has no unique commits, upstream has commits | Run `git pull --ff-only` |
| `clean-diverged` | Worktree clean, both local and upstream have unique commits | Ask for explicit approval, then prefer `git merge --no-ff <upstream>` over rebase |
| `dirty` | Any modified, deleted, renamed, or untracked file exists | Stop before merge/rebase; report files and ask whether to commit, stash, or discard |
| `conflicted` | Git reports unmerged paths or merge in progress | Stop and report conflict files |
| `remote-mismatch` | Remote URL does not match config | Stop and report config/remote mismatch |

## Sync Rules

- `clean-behind` is the only automatic receive path.
- `clean-diverged` can receive upstream by merge, but only after explicit user approval.
- Prefer merge over rebase for plan wiki repair because merge preserves local maintenance commits and does not rewrite history.
- Rebase is allowed only when the user explicitly asks for it.
- Do not use `git reset`, `git clean`, or `git stash` unless the user explicitly chooses that action.
- Never push as part of sync/repair unless the user explicitly approves a push after reviewing the result.

## Dirty Worktree Report

When state is `dirty`, report:

- branch and ahead/behind summary
- modified/deleted/untracked files from `git status --short`
- upstream commits that need to be received
- safe options:
  - commit current plan wiki changes first
  - stash current plan wiki changes, then receive upstream
  - discard selected dirty files only when the user explicitly asks
  - pause and let the user inspect manually

Do not choose one of these options silently.

## Clean Diverged Merge Path

After explicit approval:

```text
git -C .codex/plan-wiki/source merge --no-ff origin/main
```

If merge succeeds:

```text
git -C .codex/plan-wiki/source status --short --branch
test -f .codex/plan-wiki/source/wiki/registry.json
```

If merge conflicts:

- stop immediately
- report conflict files
- do not continue orchestration

## Completion Report

Report:

- final classification
- commands run
- upstream commits received
- local commits preserved
- whether planning root verification passed
- whether orchestrator can be retried
