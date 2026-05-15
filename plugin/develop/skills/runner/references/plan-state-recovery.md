# Plan-state recovery

This is the manual escape hatch for `plans/{plan_dir}/.runner-state.json`.
Use it when the runner is stuck in a way the skill itself cannot fix:
Codex failures, dispatch failures, partially-applied edits, or a
state file that needs trimming.

> **Default to the CLI.** Direct edits with `Edit` / `Write` bypass
> `validateState` and `transitionStatus`, which is exactly how state
> files turn into something the next hook firing refuses to load. Use
> `node plugin/develop/scripts/runner-state-fixup.mjs` whenever it covers
> what you need; only hand-edit the JSON (or use `jq`) when the CLI cannot.

## Field map

| Field | Type | Owner | Safe to hand-edit? |
|---|---|---|---|
| `schema_version` | int | runner-state lib | **No.** Only v2 is supported; v1 auto-migration was removed in the cleanup pass. A v1 file must be deleted and the plan re-created via `/runner`. |
| `plan_slug` | string | UserPromptSubmit hook | Rarely. Only if you renamed the plan and `plan_path` no longer matches. Update both together. |
| `plan_path` | POSIX path | UserPromptSubmit hook | Yes when you move the `.plan.md`. See "Renamed the plan file" below. |
| `owner_agent` | string | UserPromptSubmit hook | Rarely. Changing mid-plan means the next dispatch goes to a different agent — usually you want a fresh plan instead. |
| `base_branch` | string | UserPromptSubmit hook | **No** mid-plan. Worktree was branched from this; changing it post-hoc breaks the rebase mental model. |
| `task_branch` | string | UserPromptSubmit hook | **No** mid-plan. `worktree_path` is derived from this. |
| `worktree_path` | POSIX path | UserPromptSubmit hook | Yes when you moved the worktree on disk. Update before the next `/runner` so the Stop hook can find it. |
| `status` | enum (see below) | runner skill via `transitionStatus` | **No directly.** Use `--force-status` only when you understand the legal-transitions table. |
| `stop_review.armed` | bool | Stop hook + runner skill | Use `--clear-armed` if a dispatch failed to arm or a stale arm survived. |
| `stop_review.phase` | `"armed" \| "blocked" \| "passed" \| null` | Stop hook + runner-state-cli | Sub-state of `dispatching`. Set via `setStopReviewPhase` library helper, not by hand. |
| `stop_review.last_result` | `"ALLOW" \| "BLOCK" \| "skipped" \| null` | runner-state-cli `record-stop-review-*` | Log label only. Editing it does not change behaviour but makes block_history confusing. |
| `stop_review.last_reviewed_commit` | sha or null | runner-state-cli `record-stop-review-*` | **No.** Stop hook uses this to decide "have I reviewed HEAD already?". Setting it wrong either replays a review or skips an unreviewed sha. |
| `stop_review.block_history` | array | runner-state-cli `record-stop-review-block` | Use the jq snippet under "Reset BLOCK streak" below to clear an escalation streak. Do not splice manually — entries have a fingerprint that drives the 3-strike escalation. |
| `dev_review.current_round` | int | runner-state-cli `begin-rework` | **No.** The dev-review helper reads it and writes review-data.json keyed by it. Mismatch means the browser shows the wrong round. |
| `dev_review.phase` | `"awaiting" \| "rework" \| "qa" \| null` | runner-state-cli phase mutators | Sub-state of `dev_reviewing`. Set via `setDevReviewPhase` library helper, not by hand. |
| `dev_review.last_feedback_path` | path or null | runner-state-cli `begin-rework` | Yes if you regenerated feedback.json elsewhere. |
| `session_id` | string or null | UserPromptSubmit hook | Usually no. Only when manually re-attaching to a session. |
| `created_at` / `updated_at` | ISO string | lib | **No.** `saveState` overwrites `updated_at` automatically. |

## Statuses, in lifecycle order (schema_version 2)

The on-disk enum has 5 status values; sub-states live on `phase` fields.
Phase transitions are *not* status edges — they leave `status` unchanged.

```
preparing ─→ dispatching ─→ dev_reviewing ─→ closing ─→ merged
              │                │                │
              ├─ phase: armed   ├─ phase: awaiting│
              ├─ phase: blocked ├─ phase: rework   │
              └─ phase: passed  └─ phase: qa       │
                                                   └─ (no phase)
```

`merged` is terminal — UserPromptSubmit refuses to resume a merged plan.

The full edge table lives in `scripts/lib/runner-state-machine.mjs`.

## Recovery scenarios

### 1. Codex timeout loop

**Symptom:** `[stop-gate] TIMEOUT` keeps appearing every turn but Codex
itself is not making progress.

**Why it happens:** timeouts do not mark BLOCK; state stays armed and the
next Stop hook firing reviews the same diff. That is correct when Codex is
just slow once. If Codex is stuck or down, the loop continues.

**Recovery:** stop the running Codex job manually (kill the broker
process). If you want to give up on stop-review for this round entirely:

```bash
node plugin/develop/scripts/runner-state-fixup.mjs <state-path> --clear-armed
```

This unsets `stop_review.armed`. The next dispatch's `arm-for-dispatch`
re-arms.

### 2. Stuck in `dispatching` + `stop_review.phase = "blocked"` after a real BLOCK that you have addressed

**Symptom:** plan agent committed fixes for the BLOCK reason but you do
not want to wait for the next stop-review pass to confirm.

**Recovery:** **don't.** Let the next Stop hook firing run. If there is a
new commit, it reviews; if it ALLOWs, the state advances. The whole
point of the gate is that you do not get to skip it.

If you genuinely need to bypass (e.g. Codex is offline):

```bash
node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
  --force-status dev_reviewing --clear-armed
# then manually fix dev_review.phase with jq if needed:
jq '.dev_review.phase = "awaiting"' <state-path> > <state-path>.new && \
  mv <state-path>.new <state-path>
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

### 4. `preparing` or `dispatching` status, agent never returned

**Symptom:** SKILL.md Step 2 detected `status: preparing` (or
`dispatching` with the gate armed) but the worktree shows partial work
and the agent did not return cleanly (e.g. you hit Esc, machine slept,
network died).

**Recovery:**
1. `cd <worktree_path> && git log --oneline base..HEAD` — see what was
   committed.
2. If the work is salvageable, commit anything uncommitted and continue
   manually with `/runner` (the runner detects existing commits and asks
   how to proceed).
3. If not, walk the state back to `preparing` so the next dispatch
   re-arms cleanly:
   ```bash
   node plugin/develop/scripts/runner-state-fixup.mjs <state-path> \
     --force-status preparing --clear-armed
   ```
   Then `/runner` will redispatch the agent.

### 5. Reset BLOCK streak (after addressing repeated BLOCK)

**Symptom:** `block_history` last entry's `count >= 3`, escalation note
tells you to stop. You understand the issue and want one more shot.

The fixup CLI no longer carries `--reset-block-history`; use jq to append
the `__allow__` separator the streak counter looks for:

```bash
jq '.stop_review.block_history += [{
      "fingerprint": "__allow__",
      "count": 1,
      "first_at": (now | todate),
      "last_at":  (now | todate),
      "reason_excerpt": null
    }]' <state-path> > <state-path>.new && mv <state-path>.new <state-path>
```

Do not splice or rewrite earlier entries — their fingerprints are what the
counter compares against.

### 6. Renamed the plan file

The fixup CLI no longer carries `--rotate-plan-path` because the
state-file location is derived from the plan path. The cleanest move
is to drop the old state and re-run `/runner` against the new plan path —
the hook will create a fresh state at the new canonical location. If you
need to preserve `block_history` / `dev_review.current_round` across the
rename:

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

### 7. Bump dev-review round manually

```bash
jq '.dev_review.current_round += 1 | .dev_review.last_feedback_path = $p' \
  --arg p "<absolute/path/to/feedback.json>" \
  <state-path> > <state-path>.new && mv <state-path>.new <state-path>
```

The dev-review skill reads `current_round` to find the matching
`review-data-<n>.json` / `feedback-<n>.json` pair on disk.

### 8. Re-run a plan that was already `merged`

State files in `merged` are terminal; UserPromptSubmit refuses to resume
them. Use the CLI's reset command:

```bash
node plugin/develop/scripts/runner-state-cli.mjs reset <state-path> --confirm
# (or, manually:)
rm <state-path>
git branch -D <task_branch>           # only if you really want to redo it
git worktree remove <worktree_path>   # if it survived merge
```

Then `/runner <plan>` again.

## What `runner-state-fixup.mjs` will not do

- Edit fields that affect git semantics (`base_branch`, `task_branch`,
  `worktree_path`-from-branch derivation). Do those by `git` first, then
  recreate the plan if necessary.
- Skip `validateState`. Every change is loaded, mutated, validated, and
  re-saved through the library, so a fixup run that fails is a fixup run
  that did not write.
- Decide policy. `--force-status` works exactly because the runner
  skill's prose policy is honor-system; the CLI deliberately does not
  add a second layer of policy on top.

If you find yourself reaching for raw `Edit` / `Write` because the CLI
"won't let you" — first check whether a `jq` one-liner above already
covers the scenario. Hand-editing the JSON should be the last 1% of
cases, not the first 30%.
