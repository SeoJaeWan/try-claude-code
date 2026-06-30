# Plan-state recovery

This is the manual escape hatch for `plans/{plan_dir}/.runner-state.json`.
Use it when the runner is stuck in a way the skill itself cannot fix:
dispatch failures, partially-applied edits, or a state file that needs
trimming.

> **Default to the CLI for `dev_review.phase` changes.** The slim schema
> is otherwise small enough that direct `jq` edits are safe, but the CLI
> still bundles load + mutate + atomic save and avoids racing with a
> concurrent `/runner` resume.

## Field map

| Field | Type | Owner | Safe to hand-edit? |
|---|---|---|---|
| `plan_slug` | string | Step 1 of runner skill | Rarely. Only if you renamed the plan and `plan_path` no longer matches. Update both together. |
| `plan_path` | POSIX path | Step 1 of runner skill | Yes when you move the `.plan.md`. See "Renamed the plan file" below. |
| `owner_agent` | string | Step 1 of runner skill | Rarely. Changing mid-plan means the next dispatch goes to a different agent — usually you want a fresh plan instead. |
| `base_branch` | string | Step 1 of runner skill | **No** mid-plan. dev-review uses this for diff range; changing it post-hoc breaks the review package. |
| `task_branch` | string | Step 1 of runner skill | **No** mid-plan. `worktree_path` is derived from this. |
| `worktree_path` | POSIX path | Step 1 of runner skill | Yes when you moved the worktree on disk. Update before the next `/runner`. |
| `dev_review.phase` | `"awaiting" \| "rework" \| "qa" \| null` | runner-state-cli phase mutators | Prefer the CLI subcommands; jq edit is acceptable when no concurrent /runner. |
| `dev_review.last_feedback_path` | path or null | runner-state-cli `begin-rework` | Yes if you regenerated feedback.json elsewhere. |

## Step inference

The runner skill does **not** read a `status` field — it infers the Step
from disk + `dev_review.phase`. See SKILL.md's routing table for the full
matrix. Quick mental model:

```
worktree absent              → Step 2 (or post-Step-5 if state file exists)
worktree present, 0 commits  → Step 3 (dispatch plan agent)
worktree present, ≥1 commits → Step 4 (dev-review; sub-state from dev_review.phase)
```

## Recovery scenarios

### 1. Worktree disappeared / corrupted

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
   Then `/runner <plan>` again. Step 1 recreates the state file from
   scratch.

### 2. Plan agent dispatched but committed less than expected

**Symptom:** worktree exists with fewer commits than the plan's phase
count.

**Recovery:**
1. `cd <worktree_path> && git log --oneline <base>..HEAD` — see what was
   committed.
2. If the work is salvageable, commit anything uncommitted and re-run
   `/runner` (the runner detects existing commits and asks how to
   proceed in Step 2).
3. If not, wipe the worktree (`git worktree remove --force` then
   `git branch -D <task_branch>`) and re-run `/runner`.

### 3. dev_review.phase out of sync with feedback.json

**Symptom:** `feedback.json` says the reviewer submitted with rework
items but `dev_review.phase` is still `"awaiting"` (e.g. the runner
crashed between processing the result and calling `begin-rework`).

**Recovery:** Re-invoke `dev-review` from the runner skill. It is
idempotent — it will re-read `feedback.json` and report the result
again, and the runner can call `begin-rework` properly this time.

If the phase is wrong-direction (`"rework"` but no rework agents ever
ran), set it directly:

```bash
jq '.dev_review.phase = "awaiting"' <state-path> > <state-path>.new && \
  mv <state-path>.new <state-path>
```

### 4. Renamed the plan file

The state-file location is derived from the plan path. The cleanest move
is to drop the old state and re-run `/runner` against the new plan path —
Step 1 will create a fresh state at the new canonical location. If you
need to preserve `dev_review.last_feedback_path` across the rename:

```bash
# 1. Update plan_path inside the JSON.
jq --arg p "<new/abs/path/to.plan.md>" '.plan_path = $p' \
  <old-state-path> > <old-state-path>.new && mv <old-state-path>.new <old-state-path>

# 2. Move the state file to its new canonical location.
#    For plans/foo.plan.md:      plans/foo/.runner-state.json
#    For plans/foo/plan.md:      plans/foo/.runner-state.json (same dir, no move)
mkdir -p <new-state-dir>
mv <old-state-path> <new-state-dir>/.runner-state.json
```

### 5. Re-run a plan that was already merged

There is no terminal marker. The natural signals are:

- **State file deleted** at Step 5 (you ran `runner-state-cli reset`) +
  task branch still in place: the next `/runner` is a fresh Step 1, but
  Step 2's `git worktree add -b <task_branch>` fails with "branch already
  exists" — that's the cue this plan is already complete.
- **State file kept** (PR / 나중에 option, or you skipped `reset` on
  merge): the routing table picks "Post-Step-5 re-entry" (worktree absent
  + non-null `dev_review.phase`) and the skill asks what to do.

To genuinely redo a merged plan, drop the branch and any leftover state,
then re-invoke `/runner`:

```bash
git branch -D <task_branch>
git worktree remove <worktree_path>   # if it survived merge
rm <state-path>                       # if it still exists
# Optional: remove feedback*.json sitting next to the state file
```

Then `/runner <plan>` again — Step 1 starts from scratch with the current
HEAD as the new `base_branch`.

### 6. Stale state file from a previous schema

If a `.runner-state.json` from before the stop-review-removal pass exists
on disk (it will still have `schema_version`, `status`, and `stop_review`
fields), the runner-state library silently accepts the extra fields and
just doesn't use them. The slim schema's required identity fields all
already existed in the old schema, so resume should work. If anything
behaves oddly, delete the state file and re-run `/runner` to regenerate.
