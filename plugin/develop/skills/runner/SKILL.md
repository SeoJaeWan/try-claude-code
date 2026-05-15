---
name: runner
description: Deterministic plan-runner. Executes a finalized plan (`*.plan.md` or folder `plan.md`) in one worktree, one foreground plan-agent dispatch, gated by stop-review and dev-review. Triggers on `/runner <plan-path>`. Plan-state JSON at `plans/{plan_key}/.runner-state.json` is SSOT.
model: sonnet
---

<Skill_Guide>
<Instructions>

Bootstrap: read the `[runner-skill bootstrap]` header for `state_path`. Read state JSON as the first action every turn.

## Route by `state.status`

- `preparing` → S2 (worktree) → S3
- `dispatching/armed` → end turn so Stop hook fires
- `dispatching/blocked` → S3 re-entry
- `dev_reviewing/awaiting` → S4
- `dev_reviewing/rework` → S4 rework dispatch
- `dev_reviewing/qa` → answer in chat → `qa-resolved` → re-enter S4
- `closing` → S5
- `merged` → terminal

All state transitions go through `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" <sub>`. Never edit state JSON directly — PreToolUse blocks it.

## Core rules

HEAD stays on `state.base_branch` always. One worktree per plan. One foreground `Agent(...)` plan-dispatch per run. Never `isolation: "worktree"`. Run from repo root, not inside `worktrees/**`. One `/runner` per terminal.

## S2 — Worktree

`git rev-parse --abbrev-ref HEAD` must equal `state.base_branch`. Check `[ -d <state.worktree_path> ]`:

- missing → `git worktree add -b <task_branch> <worktree_path> <base_branch>`
- exists, empty/unrelated → ask user, remove + recreate
- exists, has commits → `git -C <wt> log --oneline <base>..<task_branch>` (cap 20), ask resume vs wipe

Do not transition status here. Continue to S3.

## S3 — Dispatch

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" arm-for-dispatch <state-path>
```

Then dispatch **foreground**:

```
Agent(
  subagent_type: <state.owner_agent>,
  description: "Plan: <state.plan_slug>",
  prompt: <contents of references/prompts/plan-dispatch.md with
           {{worktree_path}}, {{plan_path}}, {{state_path}} substituted>,
)
```

Never `run_in_background: true`. After agent returns, print brief commit list + "Stop-review가 실행됩니다." and **end your turn**. Do not call any tool afterwards in the same turn.

### S3 re-entry

`status=dispatching, stop_review.phase=blocked`: read `block_history[last]`. If `count >= 3` escalate to user. Else `arm-for-dispatch` then re-dispatch.

## S4 — Dev-review

```
dev-review(state_path: <state.state_path>)
```

After the user replies `리뷰 완료`, re-enter dev-review for terminal summary. Route by `result`:

- `approved` → `mark-approved <state-path>` → S5
- `rework` → `begin-rework <state-path> <feedback-abs-path>` → dispatch foreground per `rework_items[i]` using `references/prompts/rework-dispatch.md` (substitute `{{worktree_path}}`, `{{commit_short_sha}}`, `{{commit_subject}}`, `{{comments_block}}`) → `rework-done <state-path>` → re-invoke dev-review
- `qa_required` → `mark-qa-pending <state-path>` → answer in chat → `qa-resolved <state-path>` → re-invoke dev-review (same round)

Rework does **not** call `arm-for-dispatch`. Only `begin-rework` bumps `dev_review.current_round`.

## S5 — Cleanup + ask user

```
git worktree remove "<state.worktree_path>" --force
git rev-parse --abbrev-ref HEAD     # must still be state.base_branch
```

Print plain text (NOT AskUserQuestion): `git log --oneline <base>..<task_branch>` + `git diff --stat <base>..<task_branch>` + 3 options:

- **병합** → `git merge <task_branch> --no-ff -m "merge: <task_branch> into <base>"` → `git branch -d <task_branch>` → `mark-merged <state-path>` → optional `reset <state-path> --confirm`
- **PR 생성** → invoke `/pr` (state stays `closing`)
- **나중에** → do nothing

## S6 — Verify

```
git worktree list --porcelain
git rev-parse --abbrev-ref HEAD
git log --oneline "<base>..<task_branch>"
```

## On-demand references

- `references/dev-review-flow.md` — rework per-commit semantics, parallel/sequential, round bookkeeping
- `references/enforcement.md` — CLI subcommand catalogue, PreToolUse target-location rule, SSOT rationale
- `references/plan-state-recovery.md` — corrupted state, BLOCK streak escalation, `--force-status`, renamed plan, re-running `merged`
- `references/glossary.md` — plan_path / plan_key / plan_slug / stem / task_branch
- `references/guardrails.md` — never-do list (isolation, EnterWorktree, manual JSON edits, etc.)

Bootstrap missing → tell user to enter via `/runner <plan-path>`. Do not synthesize state.

</Instructions>
</Skill_Guide>
