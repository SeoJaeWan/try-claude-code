---
name: mini
description: Same workflow as the `runner` skill but with explanatory prose moved out so the SKILL.md first-turn payload is minimal. Triggers on '/mini <plan-path>' or 'mini <plan>'. Use when /runner trips the 1M-tier context gate; otherwise prefer /runner for the same job. Reuses runner's references and prompts on demand.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single plan artifact (`*.plan.md` or folder `plan.md`) in one
worktree, one foreground plan-agent dispatch, gated by stop-review and
dev-review. The plan-state JSON at `plans/{plan_key}/.runner-state.json`
is the SSOT — read it as the first action every turn.
</Purpose>

<Instructions>

## Bootstrap

UserPromptSubmit hook injects:

```
[runner-skill bootstrap]
  state_path: <abs path>
  mode: fresh | resume
```

No bootstrap → user did not enter via `/mini`. Tell them so and stop.

## Status routing

| status         | sub-state                 | action |
|---|---|---|
| `preparing`    | —                         | Step 2 (if worktree missing) → Step 3 |
| `dispatching`  | `stop_review.phase=armed` | end turn so Stop hook fires |
| `dispatching`  | `stop_review.phase=blocked` | Step 3 re-entry (re-arm + re-dispatch) |
| `dev_reviewing`| `dev_review.phase=awaiting` | Step 4 |
| `dev_reviewing`| `dev_review.phase=rework`   | Step 4 rework dispatch |
| `dev_reviewing`| `dev_review.phase=qa`       | answer in chat → `qa-resolved` → re-enter Step 4 |
| `closing`      | —                         | Step 5 |
| `merged`       | —                         | terminal (hook blocks entry) |

## Core rules

1. Main HEAD stays on `state.base_branch` always.
2. One worktree per plan via `git worktree add -b`.
3. One foreground `Agent(...)` plan-dispatch per run. Rework dispatches are separate.
4. Never `isolation: "worktree"`. Phase agents work inside the manually created worktree.
5. State transitions ONLY via `runner-state-cli.mjs`. Direct JSON edits are a bug — the PreToolUse hook also blocks them while a plan is mid-flight.
6. plan-runner runs from repo root, never from inside `worktrees/**`.
7. One `/mini` per terminal — hook rejects a second non-terminal plan in the same session.

Prose details (rationale, edge cases) live in
`plugin/develop/skills/runner/references/enforcement.md` and
`plugin/develop/skills/runner/references/guardrails.md`. Read on demand.

## Step 2 — Worktree

Read state JSON. Need `plan_path`, `task_branch`, `worktree_path`, `base_branch`.

```bash
git rev-parse --abbrev-ref HEAD     # must == state.base_branch
[ -d <state.worktree_path> ] && echo present || echo missing
```

- missing → `git worktree add -b <task_branch> <worktree_path> <base_branch>`
- present + empty/unrelated → ask user, then remove + recreate
- present + has commits → `git -C <worktree_path> log --oneline <base>..<task_branch>` (cap 20), ask resume vs wipe

Do not transition status here. Go to Step 3.

## Step 3 — Dispatch (single Agent call)

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
  arm-for-dispatch <state.state_path>
```

Then dispatch **foreground**:

```
Agent(
  subagent_type: <state.owner_agent>,
  description: "Plan: <state.plan_slug>",
  prompt: <contents of plugin/develop/skills/runner/references/prompts/plan-dispatch.md
           with {{worktree_path}}, {{plan_path}}, {{state_path}} substituted>,
)
```

Never pass `run_in_background: true` — PreToolUse refuses it and the underlying deadlock is documented in `references/dev-review-flow.md`.

After the agent returns, output a brief plain-text report (commit list + "Stop-review가 실행됩니다.") and **end your turn**. Do not call any tool afterwards in the same turn.

### Step 3 re-entry (after BLOCK)

bootstrap with `status=dispatching, stop_review.phase=blocked`:

1. Read state. `stop_review.block_history[last]` has `count` + `reason_excerpt`.
2. `count >= 3` → surface escalation, ask user.
3. else → `arm-for-dispatch` again, then re-run Step 3's `Agent(...)`.

## Step 4 — Dev-review

```
dev-review(state_path: <state.state_path>)
```

The dev-review skill prints a server URL and ends its turn. When the user replies `리뷰 완료`, re-enter dev-review; it returns a terminal summary based on `feedback.json`.

| result        | CLI                                                       | next |
|---|---|---|
| `approved`    | `mark-approved <state-path>`                              | Step 5 |
| `rework`      | `begin-rework <state-path> <feedback.json abs path>`      | dispatch rework agents → `rework-done <state-path>` → re-invoke dev-review |
| `qa_required` | `mark-qa-pending <state-path>`                            | answer in chat → `qa-resolved <state-path>` → re-invoke dev-review (same round) |

All commands prefixed `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs"`. Only `begin-rework` bumps `dev_review.current_round`.

Rework dispatch: for each `rework_items[i]`, dispatch foreground

```
Agent(
  subagent_type: item.dispatch_agent,
  description: "Rework: <state.plan_slug> r<round>",
  prompt: <contents of plugin/develop/skills/runner/references/prompts/rework-dispatch.md
           with {{worktree_path}}, {{commit_short_sha}}, {{commit_subject}},
           {{comments_block}} substituted>,
)
```

Rework does **not** call `arm-for-dispatch`. Per-commit semantics + parallel-vs-sequential rules live in `plugin/develop/skills/runner/references/dev-review-flow.md`.

Do not advance past this gate on anything except `result=approved`.

## Step 5 — Cleanup + ask user

```bash
git worktree remove "<state.worktree_path>" --force
git rev-parse --abbrev-ref HEAD     # must still be state.base_branch
```

Output plain text (NOT AskUserQuestion):

- Commits: `git log --oneline <base>..<task_branch>`
- Files: `git diff --stat <base>..<task_branch>`
- Three options:
  - **"base 브랜치(<base>)에 병합"** —
    1. `git merge <task_branch> --no-ff -m "merge: <task_branch> into <base>"`
    2. `git branch -d <task_branch>`
    3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" mark-merged <state.state_path>`
    4. (optional) `... reset <state.state_path> --confirm` — wipes state + feedback files so a future `/mini` on the same plan is not rejected as `merged`.
  - **"PR 생성"** — leave task branch in place, invoke `/pr`. State stays `closing`.
  - **"나중에 처리"** — leave task branch, do nothing. State stays `closing`.

HEAD must remain on `state.base_branch` at all times. After merge, the Stop hook removes the active-plan pointer automatically.

## Step 6 — Verify

```bash
git worktree list --porcelain
git rev-parse --abbrev-ref HEAD
git log --oneline "<base>..<task_branch>"
```

## Error recovery

| symptom | action |
|---|---|
| bootstrap missing | tell user to enter via `/mini`; do not synthesize state |
| stale worktree | Step 2 ask-before-destroy logic |
| plan agent failed / partial commits | `git -C <worktree> status`, decide with user (re-dispatch / repair / abort) |
| crashed mid-run | re-invoke `/mini <plan>` — bootstrap restores from state |

Corrupted state, BLOCK streak escalation, `--force-status`, renamed plan, re-running `merged` plan → `plugin/develop/skills/runner/references/plan-state-recovery.md`.

## Validation

```bash
cat plans/<plan_key>/.runner-state.json
git worktree list --porcelain
git rev-parse --abbrev-ref HEAD
```

</Instructions>
</Skill_Guide>
