---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind stop-review and dev-review. Use when executing a finalized `*.plan.md` file. Each session owns exactly one plan per `/runner` invocation; multiple plans run in independent terminals. HEAD always stays on the base branch and the plan-state JSON at `plans/{plan_key}/.runner-state.json` is the single source of truth for progress.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single `*.plan.md` artifact end-to-end: one worktree, one plan-agent
dispatch, gated by stop-review and dev-review. The runner does not parse the
plan's body and does not pick the entry point on its own — the
UserPromptSubmit hook reads the plan and emits a `[runner-skill bootstrap]`
context block telling the skill exactly which plan, which state file, and
which step to resume from. The skill's job is to act on that bootstrap and
keep the on-disk plan-state JSON in sync with reality.
</Purpose>

<Instructions>
# plan-runner

## Glossary

Terms that look similar but mean different things. Cross-checking these
when reading a hook log or commit message saves time.

| Term | Defined as | Example for `plans/auth/login.plan.md` |
|---|---|---|
| `plan_path` | Full path to the `.plan.md` file | `plans/auth/login.plan.md` |
| `plan_key` | The plan's directory relative to `plans/`, slashes preserved. Same vocabulary as the dev-review server's URL key. | `auth/login` |
| `stem` | Filename basename minus `.plan.md`. Internal to `deriveStatePathFromPlanPath`; surfaces only in lib code. | `login` |
| `plan_slug` | The `plan_slug:` field from the plan's YAML frontmatter. User-controlled, used in commit messages and dev-review's `task_slug`. **Not** auto-derived from path. | whatever the plan author chose (often `login`, but free) |
| `task_branch` | Git branch the worktree lives on. From frontmatter `branch:`. | `feat/auth-login` |

For a flat plan (`plans/foo.plan.md`) `plan_key` and `stem` coincide and
prose that says `plans/{stem}/...` is technically right. For a nested
plan they diverge — prose throughout this skill uses `plan_key` because
it always names the right directory.

## How this skill is enforced (and how it is not)

This SKILL.md is prose Claude reads each turn — the runner has no
"executable controller". Hard guarantees come from three places:

- `runner-state.mjs` enforces the plan-state schema and the
  ALLOWED_TRANSITIONS table on every save. Bypassing it with raw
  `Edit` / `Write` on the JSON breaks the guarantees silently.
- The Stop hook decides ALLOW / BLOCK / TIMEOUT and writes the verdict
  back through the same library. It cannot know whether *this skill*
  obeyed the prose between turns.
- The **PreToolUse hook** intercepts every tool call from the main
  session and consults `lib/pre-tool-use-policy.mjs`. While a plan is
  mid-flight it blocks tool calls that don't match the current status —
  e.g. `Edit`/`Write` on the worktree during `awaiting_dev_review`,
  mutating Bash before Step 5, or an `Agent` dispatch whose
  `subagent_type` doesn't match `state.owner_agent`. If you see a
  `decision: "block"` payload starting with `[runner] 활성 plan`, the
  reason names the offending status and the recovery path — read it
  instead of retrying the same call.

To keep the gap small, every status transition in this skill goes through
**one CLI**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
  <subcommand> <state-path> [extra-args]
```

The CLI bundles `assertExpectedStatus` + `transitionStatus` + the auxiliary
helpers (`setStopReviewArmed`, `bumpDevReviewRound`) + atomic `saveState`
for each step the skill needs. Do **not** reach into `runner-state.mjs`
helpers from inline `node -e` snippets, and do **not** edit the JSON with
`Edit` / `Write`. The subcommand catalogue, with the canonical step that
calls each, is:

| Subcommand | Called from | Effect |
|---|---|---|
| `arm-for-dispatch` | _(deprecated in prose — PreToolUse arms automatically when the plan-agent dispatch is detected; kept for manual recovery / `--rollback-to dispatching` paths)_ | move into `awaiting_stop_review`, set `stop_review.armed = true` |
| `begin-rework` | Step 4 (rework) | move into `rework_in_progress`, bump round, record feedback path |
| `rework-done` | Step 4 (after rework dispatches commit) | move back to `awaiting_dev_review` |
| `mark-qa-pending` | Step 4 (Q&A round) | move into `qa_pending` |
| `qa-resolved` | Step 4 (after answering) | move back to `awaiting_dev_review` |
| `mark-approved` | Step 4 (approval) | move into `approved` |
| `mark-merged` | Step 5 (after `git merge`) | move into `merged` |
| `reset` | Step 5 (post-merge cleanup) | delete the state file + sibling `feedback*.json` (requires `--confirm`) |

Anything **not** about a status transition (reading the state JSON, running
git commands, dispatching agents) is still on the prose — that is the
honor-system surface this skill cannot eliminate. Read the state file
fresh at the top of each turn.

## Why a plan-state JSON SSOT

Every plan owns one file at `plans/{plan_key}/.runner-state.json`. That file
is the only place the runner records progress, and every hook that the runner
participates in (UserPromptSubmit, Stop) reads from and writes to it. There is
no parallel record kept in chat memory, in commit messages, or in regex
contracts inside agent prompts. The benefits:

- **Resumable from anywhere.** Re-running `/runner plans/<file>.plan.md` in a
  new session, after a reboot, or even on a different machine will pick the
  state up exactly where it was left.
- **Inspectable.** The user can open the JSON to see the current step, the
  worktree path, the dev-review round, and recent BLOCK history.
- **No fragile string contract.** The previous runner relied on the agent's
  `description` and `prompt` matching exact regexes so hooks could find the
  plan. That contract is gone — hooks now key off the state file directly.

Treat the state file as authoritative. Read it whenever you need to know
something about the plan; never guess from chat history alone.

## Bootstrap context

When the user invokes `/runner <plan-path>` the UserPromptSubmit hook fires
**before** this skill is engaged. It validates the plan, creates or loads the
state file, and injects an `additionalContext` block that begins with
`[runner-skill bootstrap]` and carries exactly two fields:

```
[runner-skill bootstrap]
  state_path: <abs path to .runner-state.json>
  mode: fresh | resume
```

That is the entire contract. Everything else — `status`, `plan_slug`,
`plan_path`, `worktree_path`, `dev_review.current_round`,
`stop_review.block_history` — lives in the JSON at `state_path`. **Open it
and read it as your first action every turn**; do not try to remember fields
from a previous turn.

If the bootstrap block is missing, the user did not enter through `/runner`.
Tell them so and stop — do not try to drive a plan without state.

`mode: fresh` means the hook just created the state file (status will be
`validating`). `mode: resume` means the hook loaded an existing one — pick
the action up from `state.status` per the routing table below.

## Status routing

Read `state.status` from the JSON to decide where to enter. Each status maps
to exactly one action:

| status | action |
|---|---|
| `validating` | New plan. Go to **Step 2 — Set up worktree**. |
| `dispatching` | Worktree was being prepared but the previous run did not finish. Check `fs.existsSync(state.worktree_path)` (e.g. `[ -d <wt> ]`); if missing, redo Step 2. If present, fall through to Step 3. |
| `awaiting_stop_review` | The previous turn ended with the gate armed but the Stop hook never ran (e.g. the user typed something else). End your turn so the gate can fire. |
| `stop_review_blocked` | The Stop hook reported BLOCK. Read `state.stop_review.block_history[last].reason_excerpt` as the BLOCK reason and re-dispatch the plan agent — see **Step 3 (re-entry)**. |
| `awaiting_dev_review` | Stop-review passed; enter **Step 4 — Dev-review gate**. |
| `rework_in_progress` | Reviewer left needs-change items. Read `state.dev_review.last_feedback_path` and dispatch rework agents — see **Step 4 (rework)**. |
| `qa_pending` | Reviewer asked questions. Answer in chat, then re-enter Step 4 with the same round. |
| `approved` | Dev-review accepted the plan. Go to **Step 5 — Cleanup and ask user**. |
| `merged` | Terminal. The hook will already have blocked entry, so you should not normally see this. |

## Core rules

1. plan-runner runs in the main conversation context (no agent binding).
2. Main HEAD stays on the base branch at all times — during and after execution.
3. Exactly one worktree is created per plan via `git worktree add -b`. One
   `/runner` invocation owns one worktree.
4. Exactly one `Agent(...)` plan-dispatch per plan run-through. The agent
   commits phase by phase inside that one dispatch. Rework dispatches in
   Step 4 are separate, narrower calls.
5. Phase agents are dispatched without `isolation: "worktree"` — they work
   directly in the manually created worktree.
6. After the agent returns, end your turn so the Stop hook can review. After
   dev-review approves, remove the worktree but keep HEAD on the base branch
   and ask the user about merge.
7. plan-runner runs from the repository root, never from inside `worktrees/**`.
8. Multiple plans run in separate terminals as independent sessions. Sessions
   do not coordinate; each plan goes through its own gates.

## Branch model

```
X (base branch — HEAD stays here during execution)
│
└── git worktree add -b feat/login-frontend worktrees/feat-login-frontend X
    ├── commit: feat(login): add login form (phase 1)
    ├── commit: feat(login): add validation rules (phase 2)
    ├── commit: test(login): add scenario coverage (phase 3)
    ├── commit: fix(login): error message visibility (rework round 2)
    └── (dev-review approved)
    → worktree remove → ask user: merge into X? (HEAD stays on X)
```

The base branch is whatever HEAD pointed at when `/runner` was invoked. The
plan-state's `base_branch` field records it. The task branch is created by
`git worktree add -b`, lives only inside the worktree until cleanup, and is
never merged or deleted without explicit user approval.

---

## Execution workflow

### Step 1. Validate (handled by the UserPromptSubmit hook)

Plan validation, frontmatter parsing, owner-agent existence, and state-file
creation all happen in the hook before the skill runs. If the bootstrap
context arrived, validation passed. Skip directly to the action implied by
the routing table.

If the user invoked the skill some other way and there is no bootstrap, do
not try to validate manually — tell them to enter through `/runner
<plan-path>` so the hook can do its job.

### Step 2. Set up the worktree

Read the state JSON. You need: `plan_path`, `task_branch`, `worktree_path`.

```bash
# Confirm HEAD is on the base branch the hook recorded.
git rev-parse --abbrev-ref HEAD
```

If HEAD is not on `state.base_branch`, do not proceed — the hook captured the
base when the user invoked `/runner`, and the worktree must branch from that
exact commit. Ask the user before doing anything destructive.

Stale-worktree handling is driven by checking the worktree directory on
disk yourself (`[ -d <state.worktree_path> ]` via Bash):

- **worktree missing and `status: validating`** — fresh start. Run
  `git worktree add -b <task_branch> <worktree_path> <base_branch>`.
- **worktree present and `status: validating`** — directory is there but
  state is fresh. Two cases:
  1. The directory is empty / unrelated → ask the user; if they confirm,
     remove it and re-create.
  2. There are commits on the task branch already → describe what is there
     using `git -C <worktree_path> log --oneline <base_branch>..<task_branch>`
     (cap at 20 lines), then ask whether to resume on top of the existing
     work or wipe it and restart. Update the state via the runner-state
     library after the user decides.
- **`status: dispatching`, worktree present** — previous run got past Step 2.
  Skip the `git worktree add` and go straight to Step 3.
- **`status: dispatching`, worktree missing** — previous run never finished
  Step 2. Re-run Step 2 from scratch.

After the worktree is in place, **stop here and proceed to Step 3**. The
PreToolUse hook arms the gate atomically when it sees the plan-agent
dispatch in Step 3, so Step 2 must not transition status itself.

### Step 3. Dispatch the plan agent (single Agent call)

Dispatch exactly one `Agent(...)` call. The agent reads the plan and
commits phase by phase inside its single turn. The skill's only job in this
step is to hand the agent the right working directory, plan path, and
state path — the PreToolUse hook arms the gate as a side-effect of seeing
the dispatch.

> **Auto-arm.** When the PreToolUse hook sees an `Agent` (or `Task`) call
> whose `subagent_type` matches `state.owner_agent` and the current status
> is one of `validating` / `dispatching` / `stop_review_blocked`, it walks
> the state machine to `awaiting_stop_review`, sets
> `stop_review.armed = true`, and saves the state file before letting the
> dispatch through. The skill no longer calls `arm-for-dispatch` itself.
> If the hook blocks the call, the status was not one of the three
> arm-able values — read the block reason and investigate.

Dispatch. The prompt body is **`references/prompts/plan-dispatch.md` —
read it and substitute the placeholders before sending**:

```
Agent(
  subagent_type: <state.owner_agent>,
  description: "Plan: <state.plan_slug>",
  prompt: <contents of references/prompts/plan-dispatch.md with
           {{worktree_path}}, {{plan_path}}, {{state_path}} substituted>,
)
```

The `description` form `Plan: <slug>` is kept for human readability and
continuity, but the hooks no longer parse them. If you need to vary the
wording, you may — the runner-state JSON is the only contract. The prompt
body itself, however, must come from the reference file so any contract
change updates one place.

After the agent returns, output a brief plain-text report (commit list +
"Stop-review가 실행됩니다.") and end your turn. **Do not call any tool
afterwards in the same turn.** The Stop hook fires on turn end and reads the
plan-state to decide whether to gate.

#### Step 3 re-entry (after BLOCK)

If the bootstrap arrives with `status: stop_review_blocked`, the previous
turn's Stop hook recorded a BLOCK and you are looking at the next user turn.
Do **not** try to fix the code yourself in the main session — the BLOCK
reason came in as a prior `decision: block` payload, and the Stop hook also
appended a `[plan-runner: replay <state-path>]` directive that names the
state file to consult.

Action:

1. Read the state file. The last entry of
   `state.stop_review.block_history` carries the BLOCK count and a one-line
   `reason_excerpt`; the full reason was in the previous turn's
   `decision: block` payload.
2. If that last entry's `count >= 3`, surface the escalation note instead of
   blindly redispatching — ask the user to intervene per the planner
   directive's choices. The Stop hook already attached the same note to the
   BLOCK reason.
3. Otherwise, re-run Step 3's `Agent(...)` call directly. BLOCK leaves
   `stop_review.armed = true` and the status at `stop_review_blocked`; the
   PreToolUse hook accepts `stop_review_blocked` as an arm-able entry, walks
   it back to `awaiting_stop_review`, and lets the dispatch through. The new
   commits will trigger another stop-review on the next turn-end.

### Step 4. Developer review gate (browser)

Once `status` is `awaiting_dev_review`, invoke the `dev-review` skill to
collect explicit per-commit reviewer approval. The dev-review skill takes a
single input — the absolute path to the plan-state JSON — and reads
everything else (slug, plan path, worktree, branches, iteration) from it:

```
dev-review(state_path: <state.state_path>)
```

**Round bookkeeping** — the dev-review server reads `current_round` directly
as `review_iteration`, so the runner is responsible for keeping it accurate:

| Trigger | Action |
|---|---|
| First time entering Step 4 (after Stop-review ALLOW) | round 1. The state arrives at `awaiting_dev_review` with `current_round = 0`; `begin-rework` is the only call that bumps it (see below). For the first round there is no rework yet, so no bump — just invoke `dev-review`. |
| User replies `리뷰 완료`, result = `approved` | no round change. Move to Step 5 via `mark-approved`. |
| User replies `리뷰 완료`, result = `qa_required` | no round change. Use `mark-qa-pending` to record the QA pause; after answering, `qa-resolved` flips back. Re-invoke `dev-review` with the same round. |
| User replies `리뷰 완료`, result = `rework` | round bumps. `begin-rework` does the bump, the status transition, and records the feedback path in one call. After every rework agent commits, `rework-done` flips back to `awaiting_dev_review` for the next review pass. |

The dev-review skill prints a server URL and ends its turn so the user can
review in the browser and reply `리뷰 완료`.

When the user replies `리뷰 완료`, re-enter the dev-review skill; it returns
a terminal summary based on `feedback.json`:

- `result = "approved"` →
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" mark-approved <state.state_path>`.
    Go to Step 5.
- `result = "rework"` →
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" begin-rework <state.state_path> <feedback.json absolute path>`.
    This bumps `dev_review.current_round`, records the feedback path, and
    transitions to `rework_in_progress` atomically. Then for each item in
    `rework_items[]`, dispatch `Agent(subagent_type: item.dispatch_agent,
    ...)` with the prompt body from
    **`references/prompts/rework-dispatch.md`** — substitute
    `{{worktree_path}}`, `{{commit_short_sha}}`, `{{commit_subject}}`, and
    render `{{comments_block}}` from `item.comments[]` per the format
    documented in that file.

    Rework is **per-commit**: one `rework_items[i]` covers one flagged
    commit and aggregates every `needs-change` line comment on it. Multiple
    rework items may be dispatched sequentially (safe default) or in
    parallel when they target different commits whose files do not overlap.
    The rework dispatch's description is whatever the runtime produces; it
    is not a `Plan: ...` dispatch.

    Rework intentionally **does not** call `arm-for-dispatch`. Stop-review
    is bypassed for rework commits because the reviewer sees them directly
    in the next dev-review round; routing them through stop-review would
    decouple round counts from review results and create BLOCK ↔ rework
    cycles that the UI cannot represent. After all rework agents commit:

    ```bash
    node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
      rework-done <state.state_path>
    ```

    Then re-invoke `dev-review` with the bumped round.

- `result = "qa_required"` →
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" mark-qa-pending <state.state_path>`.
    Answer the questions in chat, then run
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" qa-resolved <state.state_path>`
    and re-invoke `dev-review` with the same round.

Do not advance past this gate on anything except `result = "approved"`. Do
not remove the worktree, do not merge, do not ask about merge until approval.

### Step 5. Clean up the worktree and ask the user

The state is `approved`. The task branch holds every plan commit plus any
rework commits. Remove the worktree but **stay on the base branch**. Then
ask the user about merge.

```bash
git worktree remove "<state.worktree_path>" --force

# Sanity: HEAD must still be on state.base_branch.
git rev-parse --abbrev-ref HEAD
```

After cleanup, output as plain text (do NOT use AskUserQuestion):

- Summary of all commits: `git log --oneline <base>..<task_branch>`
- Changed files: `git diff --stat <base>..<task_branch>`
- The three options:
  - **"base 브랜치(<base>)에 병합"** —
    1. `git merge <task_branch> --no-ff -m "merge: <task_branch> into <base>"`
    2. `git branch -d <task_branch>`
    3. `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" mark-merged <state.state_path>`
    4. (optional) `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" reset <state.state_path> --confirm` — removes the state file and any sibling `feedback*.json` so a future `/runner` on the same plan path is not rejected as `merged`. Skip if the user wants to keep the audit trail.
  - **"PR 생성"** — leave the task branch in place and invoke the `/pr` skill so it can `git push` the branch and open the PR. State stays at `approved`. Pass the task branch and base branch from the state file.
  - **"나중에 처리"** — leave the task branch, do nothing. State stays at `approved`.

Do not merge, checkout, or delete the task branch without explicit user
approval. HEAD must remain on `state.base_branch` at all times.

After the user merges, the Stop hook removes the active-plan pointer for
this state from the session automatically — the next time `/runner` is
invoked on this plan it is rejected as `merged` until the state file is
deleted (e.g. via `reset --confirm`).

### Step 6. Verify completion

```bash
# Worktree should be gone
git worktree list --porcelain

# HEAD should still be on the base branch
git rev-parse --abbrev-ref HEAD

# Task branch should still contain every plan commit (until the user deletes
# it, if they chose to merge or PR)
git log --oneline "<base>..<task_branch>"
```

---

## Error recovery

### Bootstrap missing or malformed

If the `[runner-skill bootstrap]` block is absent, the UserPromptSubmit hook
either did not fire or ran into an error. Tell the user to enter through
`/runner <plan-path>` and stop. Do not synthesize state from chat.

### Stale worktree from a previous run

Handled in Step 2 by checking the worktree path on disk yourself. The user
is always asked before existing work is destroyed.

### Plan agent failure

If the plan agent fails or commits less than the plan expects:
1. Inspect `git -C "<state.worktree_path>" status` for partial changes.
2. Report what was committed vs. what is missing as plain text.
3. Decide with the user: re-dispatch the plan agent, repair manually, or
   abort by removing the worktree and the state file. The worktree stays
   intact for inspection.

### Resuming after a crash

The whole point of the state JSON is that re-running `/runner <plan>` picks
up where things left off. If the user reports the runner went down
mid-execution, just have them re-invoke `/runner` — the bootstrap will
report the saved status and routing will pick the right step.

---

## Validation commands

```bash
# Inspect the current plan-state JSON
cat plans/<plan_key>/.runner-state.json

# Inspect worktree state
git worktree list --porcelain

# Verify HEAD hasn't drifted
git rev-parse --abbrev-ref HEAD
```

---

## Guardrails

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
11. Never edit the plan-state JSON ad hoc with `Edit`/`Write`, and never
    write inline `node -e` snippets that import `runner-state.mjs` directly.
    All status transitions go through `scripts/runner-state-cli.mjs` so the
    assertion, transition, auxiliary updates, and atomic save run together.
    The PreToolUse hook also blocks direct `Edit`/`Write` on the state file
    while a plan is mid-flight — the only way through is the CLI.

</Instructions>
</Skill_Guide>
