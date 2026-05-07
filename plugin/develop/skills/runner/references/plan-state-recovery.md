# Plan-state recovery

This is the manual escape hatch for `plans/{plan_dir}/.runner-state.json`.
Use it when the runner is stuck in a way the skill itself cannot fix:
Codex timeout loops, dispatch failures, partially-applied edits, or a
state file that needs trimming.

> **Default to the CLI.** Direct edits with `Edit` / `Write` bypass
> `validateState` and `transitionStatus`, which is exactly how state
> files turn into something the next hook firing refuses to load. Use
> `node plugin/develop/scripts/runner-state-fixup.mjs` whenever it covers
> what you need; only hand-edit the JSON when the CLI cannot.

## Field map

| Field | Type | Owner | Safe to hand-edit? |
|---|---|---|---|
| `schema_version` | int | runner-state lib | **No.** Bumping it does not migrate old shapes; it just makes `validateState` reject the file. |
| `plan_slug` | string | UserPromptSubmit hook | Rarely. Only if you renamed the plan and `plan_path` no longer matches. Update both together. |
| `plan_path` | POSIX path | UserPromptSubmit hook | Yes when you move the `.plan.md`. Use `--rotate-plan-path` to keep the state-file location and `worktree_path` consistent. |
| `owner_agent` | string | UserPromptSubmit hook | Rarely. Changing mid-plan means the next dispatch goes to a different agent — usually you want a fresh plan instead. |
| `base_branch` | string | UserPromptSubmit hook | **No** mid-plan. Worktree was branched from this; changing it post-hoc breaks the rebase mental model. |
| `task_branch` | string | UserPromptSubmit hook | **No** mid-plan. `worktree_path` is derived from this. |
| `worktree_path` | POSIX path | UserPromptSubmit hook | Yes when you moved the worktree on disk. Update before the next `/runner` so the Stop hook can find it. |
| `status` | enum (see below) | runner skill via `transitionStatus` | **No directly.** Use `--force-status` only when you understand the legal-transitions table. |
| `stop_review.armed` | bool | Stop hook + runner skill | Use `--reset-armed` if a dispatch failed to arm or a stale arm survived. |
| `stop_review.last_result` | `"ALLOW" \| "BLOCK" \| "skipped" \| null` | Stop hook | Log label only. Editing it does not change behaviour but makes block_history confusing. |
| `stop_review.last_reviewed_commit` | sha or null | Stop hook | **No.** Stop hook uses this to decide "have I reviewed HEAD already?". Setting it wrong either replays a review or skips an unreviewed sha. |
| `stop_review.block_history` | array | Stop hook | Use `--reset-block-history` to clear an escalation streak. Do not splice manually — entries have a fingerprint that drives the 3-strike escalation. |
| `dev_review.current_round` | int | runner skill via `bumpDevReviewRound` | **No.** The dev-review helper reads it and writes review-data.json keyed by it. Mismatch means the browser shows the wrong round. |
| `dev_review.last_feedback_path` | path or null | runner skill | Yes if you regenerated feedback.json elsewhere. |
| `session_id` | string or null | UserPromptSubmit hook | Usually no. Only when manually re-attaching to a session. |
| `created_at` / `updated_at` | ISO string | lib | **No.** `saveState` overwrites `updated_at` automatically. |

## Statuses, in lifecycle order

```
validating → dispatching → awaiting_stop_review ─┬─→ stop_review_blocked ─┐
                                                  │                        │
                                                  └────────────────────────┴─→ awaiting_dev_review
                                                                                  │
                                                                                  ├─→ rework_in_progress ─→ awaiting_dev_review
                                                                                  ├─→ qa_pending           ─→ awaiting_dev_review
                                                                                  └─→ approved             ─→ merged
```

`merged` is terminal — UserPromptSubmit refuses to resume a merged plan.
The full edge table lives in `scripts/lib/runner-state-machine.mjs`.

## Recovery scenarios

### 1. Codex timeout loop

**Symptom:** `[stop-gate] TIMEOUT` keeps appearing every turn but Codex
itself is not making progress (`/codex:status` shows nothing or a stuck
job).

**Why it happens:** with the 2.9.2 fix, timeouts no longer mark BLOCK, so
state stays armed and the next Stop hook firing reviews the same diff.
That is correct when Codex is just slow once. If Codex is stuck or down,
the loop continues.

**Recovery:**
1. `/codex:cancel <task-id>` to stop the running Codex job.
2. If the Codex daemon itself is dead, restart it before triggering the
   next Stop hook.
3. If you want to give up on stop-review for this round entirely:
   ```bash
   node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
     --reset-armed
   ```
   This unsets `stop_review.armed`. The next dispatch re-arms.

### 2. Stuck in `stop_review_blocked` after a real BLOCK that you have addressed

**Symptom:** plan agent committed fixes for the BLOCK reason but you do
not want to wait for the next stop-review pass to confirm.

**Recovery:** **don't.** Let the next Stop hook firing run. If there is a
new commit, it reviews; if it ALLOWs, the state advances. The whole
point of the gate is that you do not get to skip it.

If you genuinely need to bypass (e.g. Codex is offline), use:
```bash
node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
  --force-status awaiting_dev_review --reset-armed
```
Be honest with yourself about whether the code was actually fixed.

### 3. Worktree disappeared / corrupted

**Symptom:** `git status` inside the worktree fails, or the directory was
deleted by something outside the runner.

**Recovery:**
1. If you have not committed the work elsewhere, restore the worktree
   from a backup or local reflog before doing anything else.
2. Otherwise, drop the plan and start over:
   ```bash
   rm -rf <worktree_path>
   rm <state-path>          # state file
   git worktree prune
   ```
   Then `/runner <plan>` again. The hook recreates everything from
   scratch.

### 4. `dispatching` status, agent never returned

**Symptom:** SKILL.md Step 2 detected `status: dispatching` but the
worktree shows partial work and the agent did not return cleanly (e.g. you
hit Esc, machine slept, network died).

**Recovery:**
1. `cd <worktree_path> && git log --oneline base..HEAD` — see what was
   committed.
2. If the work is salvageable, commit anything uncommitted and continue
   manually with `/runner` (the runner detects existing commits and asks
   how to proceed).
3. If not, `--rollback-to dispatching` is the same as starting fresh:
   ```bash
   node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
     --force-status dispatching --reset-armed
   ```
   Then `/runner` will redispatch the agent.

### 5. Repeated identical BLOCK has triggered the 3-strike escalation but you understand the issue and want to retry one more time

**Symptom:** `last_block_count >= 3`, escalation note tells you to stop.

**Recovery:**
```bash
node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
  --reset-block-history
```
This appends an `__allow__` separator so the next BLOCK starts a fresh
streak. Do not edit `block_history` by hand — entries carry a fingerprint
the streak counter depends on.

### 6. Renamed the plan file

```bash
node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
  --rotate-plan-path <new/path/to.plan.md>
```
Updates `plan_path`, moves the state file alongside the new plan
location, and prints the new state path you should pass to subsequent
commands.

### 7. Re-run a plan that was already `merged`

State files in `merged` are terminal; UserPromptSubmit refuses to resume
them. To re-run from scratch:

```bash
rm <state-path>
git branch -D <task_branch>           # only if you really want to redo it
git worktree remove <worktree_path>   # if it survived merge
```
Then `/runner <plan>` again.

## What `runner-state-fixup.mjs` will not do

- Edit fields that affect git semantics (`base_branch`, `task_branch`,
  `worktree_path`-from-branch derivation). Do those by `git` first, then
  `--rotate-plan-path` if needed.
- Skip `validateState`. Every change is loaded, mutated, validated, and
  re-saved through the library, so a fixup run that fails is a fixup run
  that did not write.
- Decide policy. `--force-status` works exactly because the runner
  skill's prose policy is honor-system; the CLI deliberately does not
  add a second layer of policy on top.

If you find yourself reaching for raw `Edit` / `Write` because the CLI
"won't let you" — that is the CLI doing its job. Open this doc, find
the scenario, or add a new flag to the script. Hand-editing the JSON
should be the last 1% of cases, not the first 30%.
