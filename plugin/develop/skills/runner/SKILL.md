---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind stop-review and dev-review. Use when executing a finalized `*.plan.md` file. Each session owns exactly one plan per `/runner` invocation; multiple plans run in independent terminals. HEAD always stays on the base branch and the plan-state JSON at `plans/{stem}/.runner-state.json` is the single source of truth for progress.
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

## How this skill is enforced (and how it is not)

The runner ships **no executable code of its own** — this SKILL.md is the
runner. Every step below is prose Claude reads and acts on each turn. The
hooks (`UserPromptSubmit`, `Stop`) and the `runner-state.mjs` library do
provide hard guarantees, but only inside their boundaries:

- `validateState`, `transitionStatus`, and the atomic `saveState` enforce
  the plan-state schema and the ALLOWED_TRANSITIONS table. Bypassing them
  with raw `Edit` / `Write` on the JSON breaks those guarantees silently.
- The Stop hook decides ALLOW / BLOCK / TIMEOUT and writes the verdict back
  through the same library. It cannot know whether *this skill* obeyed the
  prose between turns.

Everything else — "do not redispatch after BLOCK x3", "transition to
`awaiting_dev_review` after QA round", "use `transitionStatus` rather than
poking `state.status`" — is an honor system enforced only by you reading
this file. If you skip a step the next hook firing will load whatever
state you left and run with it. Two practical defenses you should always
take:

1. **Use `transitionStatus(state, STATUS.X)` and the named helpers
   (`setStopReviewArmed`, `setLastReviewedCommit`, `bumpDevReviewRound`).**
   Never assign `state.status` or nested fields by hand, and never edit
   the JSON with `Edit` / `Write`. Use a small `node -e "..."` Bash that
   imports `runner-state.mjs`.
2. **Call `assertExpectedStatus(state, STATUS.X, "<step name>")` at the top
   of every step.** It throws with a useful message when you arrived from
   the wrong status — far better than silently doing the wrong thing.

## Why a plan-state JSON SSOT

Every plan owns one file at `plans/{plan_stem}/.runner-state.json`. That file
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
`[runner-skill bootstrap]`. That block is the entry point — start every
runner turn by locating it and reading these fields:

```
[runner-skill bootstrap]
  plan_slug: <slug>
  plan_path: <abs path to .plan.md>
  state_path: <abs path to .runner-state.json>
  status: <one of the status enum values>
  resume: true | false
  worktree_path: <abs>            (when known)
  worktree_exists_on_disk: true | false
  dev_review_round: <int>          (only when > 0)
  last_feedback_path: <abs>        (only when set)
  last_block_count: <int>          (only on resume into stop_review_blocked)
  last_block_excerpt: <one line>   (only on resume into stop_review_blocked)
```

If the bootstrap block is missing, the user did not enter through `/runner`.
Tell them so and stop — do not try to drive a plan without state.

After reading the bootstrap, **always read the full state JSON** before
acting. The hook only surfaces the fields above; everything else (base
branch, owner agent, block history) lives in the JSON.

## Status routing

Use `status` from the bootstrap to decide where to enter. Each status maps to
exactly one action:

| status | action |
|---|---|
| `validating` | New plan. Go to **Step 2 — Set up worktree**. |
| `dispatching` | Worktree was being prepared but the previous run did not finish. Verify whether `worktree_exists_on_disk` is true; if not, redo Step 2. If yes, fall through to Step 3. |
| `awaiting_stop_review` | The previous turn ended with the gate armed but the Stop hook never ran (e.g. the user typed something else). End your turn so the gate can fire. |
| `stop_review_blocked` | The Stop hook reported BLOCK. Treat the BLOCK reason from the previous turn (or `last_block_excerpt`) as input and re-dispatch the plan agent — see **Step 3 (re-entry)**. |
| `awaiting_dev_review` | Stop-review passed; enter **Step 4 — Dev-review gate**. |
| `rework_in_progress` | Reviewer left needs-change items. Read `last_feedback_path` and dispatch rework agents — see **Step 4 (rework)**. |
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

Stale-worktree handling is now driven by `worktree_exists_on_disk` from the
bootstrap, not by scanning git output:

- **`worktree_exists_on_disk: false` and `status: validating`** — fresh
  start. Run `git worktree add -b <task_branch> <worktree_path> <base_branch>`.
- **`worktree_exists_on_disk: true` and `status: validating`** — directory
  is there but state is fresh. Two cases:
  1. The directory is empty / unrelated → ask the user; if they confirm,
     remove it and re-create.
  2. There are commits on the task branch already → describe what is there
     using `git -C <worktree_path> log --oneline <base_branch>..<task_branch>`
     (cap at 20 lines), then ask whether to resume on top of the existing
     work or wipe it and restart. Update the state via the runner-state
     library after the user decides.
- **`status: dispatching`, worktree exists** — previous run got past Step 2.
  Skip the `git worktree add` and go straight to Step 3.
- **`status: dispatching`, worktree missing** — previous run never finished
  Step 2. Re-run Step 2 from scratch.

After the worktree is in place, advance the state to
`awaiting_stop_review` via `transitionStatus(state, STATUS.AWAITING_STOP_REVIEW)`
from `runner-state.mjs` (it stays in `dispatching` until the Agent dispatch in
Step 3 actually fires; the transition lives there, not here). Then move on.

### Step 3. Dispatch the plan agent (single Agent call)

Dispatch exactly one `Agent(...)` call. The agent reads the plan and
commits phase by phase inside its single turn. The skill's only job in this
step is to: (a) arm the stop-review gate, and (b) hand the agent the right
working directory, plan path, and state path.

Before calling `Agent`, update the state file via the runner-state library:

- `transitionStatus(state, STATUS.AWAITING_STOP_REVIEW)` — never assign
  `state.status` directly. The helper enforces the legal-transitions table
  (`runner-state-machine.mjs`); a raw assignment bypasses it and a typo
  silently corrupts the JSON.
- `setStopReviewArmed(state, true)` — same reason; do not write the nested
  field by hand.
- `saveState(statePath, state)` — atomic write, also re-runs `validateState`
  before persisting.

The simplest way to do that from the skill is to run a small Node script
inline that imports `runner-state.mjs`. Direct ad-hoc edits with
`Edit`/`Write` on the JSON are discouraged because they bypass the schema
check **and** the transition guard.

Then dispatch:

```
Agent(
  subagent_type: <state.owner_agent>,
  description: "Plan: <state.plan_slug>",
  prompt: "
    ## Working directory
    You are working in: <state.worktree_path>
    cd to this directory before starting any work.

    ## Plan + state
    Plan file: <state.plan_path>
    Runner state: <state.state_path or the value passed to you>
    Read the plan as your spec. The state JSON records progress (status,
    last reviewed commit, dev-review round, block history) and is the only
    place runner-side metadata lives — do NOT modify it; that is the runner
    skill's responsibility.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Treat phase boundaries inside the plan as commit boundaries: complete
      each phase, commit, then proceed to the next.
    - Do NOT commit-amend across phases — every phase produces its own commit.
    - Only implement what the plan describes. Do NOT pull in adjacent work.

    ## Commit rules (the dev-review UI reads these back verbatim)
    - Format: `{type}(scope): {description}`. scope is optional; description
      uses imperative mood and stays within ~72 characters.
    - Allowed types: feat / fix / refactor / docs / chore / style / test.
    - Do NOT include phase identity in the commit — no \"phase 2 — ...\",
      no \"[Phase 2] ...\", no \"2단계: ...\".
    - Body is **required and written in Korean**, exactly 2 lines:
        Line 1 = 무엇 (이 커밋이 한 변경의 핵심)
        Line 2 = 왜 (동기·제약·맥락 — diff만으로 드러나지 않는 정보)
      Do NOT prefix labels (`작업:` / `이유:`); line position alone
      communicates the role. Subject stays English.
      Self-evident changes (typo, formatting, dep bump) may use a single
      Korean WHAT line as an escape hatch — use sparingly.
    - Commit each phase with `git add -A && git commit -m '...'` using a
      HEREDOC or `-m`+`-m` for the body.
    - Full spec: `plugin/develop/references/commit-convention.md`.
  ",
)
```

The `description` form `Plan: <slug>` and the prompt headers are kept for
human readability and continuity, but the hooks no longer parse them. If you
need to vary the wording, you may — the runner-state JSON is the only
contract.

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

1. Read the state file (the bootstrap already gives you `last_block_excerpt`
   and `last_block_count`; the full block_history is in the JSON).
2. If `last_block_count >= 3`, surface the escalation note instead of blindly
   redispatching — ask the user to intervene per the planner directive's
   choices. The Stop hook already attached the same note to the BLOCK reason.
3. Otherwise, re-run Step 3's `Agent(...)` call. The same state record is
   already armed (BLOCK leaves `stop_review.armed = true`), so no extra arm
   step is required. The new commits will trigger another stop-review on the
   next turn-end.

### Step 4. Developer review gate (browser)

Once `status` is `awaiting_dev_review`, invoke the `dev-review` skill to
collect explicit per-commit reviewer approval. The dev-review skill takes a
single input — the absolute path to the plan-state JSON — and reads
everything else (slug, plan path, worktree, branches, iteration) from it:

```
dev-review(state_path: <state.state_path>)
```

Before invoking for a **fresh round**, bump `state.dev_review.current_round`
via `runner-state.bumpDevReviewRound(state)` and save. The dev-review skill
and helper script use that value directly as `review_iteration` — they do
not increment it themselves.

Re-entering for the **same round** (e.g. after answering `qa_required`
questions, or simply because the user replied `리뷰 완료`) does NOT bump
the round; just call the skill again with the same `state_path`.

The dev-review skill prints a server URL and ends its turn so the user can
review in the browser and reply `리뷰 완료`.

When the user replies `리뷰 완료`, re-enter the dev-review skill; it returns
a terminal summary based on `feedback.json`:

- `result = "approved"` →
    `transitionStatus(state, STATUS.APPROVED)`. Go to Step 5.
- `result = "rework"` →
    `transitionStatus(state, STATUS.REWORK_IN_PROGRESS)` and write the
    feedback path into `state.dev_review.last_feedback_path` (the round
    bump itself goes through `bumpDevReviewRound(state)` — see below).
    Then for each item in
    `rework_items[]`, dispatch `Agent(subagent_type: item.dispatch_agent,
    ...)` with this prompt shape:

    ```
    ## Working directory
    You are working in: <state.worktree_path>
    cd to this directory before starting any work.

    ## Context
    You are revising prior work based on reviewer feedback. The code already
    exists in this worktree; build on it, do not redo prior commits.

    ## Target commit
    - Commit: <item.short_sha> — <item.message_subject>
    - This is the commit the reviewer flagged. The follow-up commit you
      create should address every line comment listed below.

    ## Feedback (line-anchored comments on this commit)
    {for each c in item.comments}
    - <c.file>:L<c.line_start>-L<c.line_end> (side: <c.side>): "<c.body>"
    {/for}

    ## Instructions
    Apply the feedback. Do NOT touch unrelated files. Do NOT rebase or amend
    existing commits.

    ## Commit rules (the dev-review UI reads these back verbatim)
    - Format: `{type}(scope): {description}`. Allowed types: feat / fix /
      refactor / docs / chore / style / test. Imperative mood, ~72
      characters or less.
    - Do NOT include phase or rework-round identity in the message.
    - Body is required and written in Korean, exactly 2 lines:
        Line 1 = 리뷰 피드백이 요구한 변경
        Line 2 = 그 변경이 피드백을 어떻게 해소하는지
      Do NOT prefix labels (`작업:` / `이유:`). Subject stays English.
    - Full spec: `plugin/develop/references/commit-convention.md`.
    ```

    Rework is **per-commit**: one `rework_items[i]` covers one flagged
    commit and aggregates every `needs-change` line comment on it. Multiple
    rework items may be dispatched sequentially (safe default) or in
    parallel when they target different commits whose files do not overlap.
    The rework dispatch's description is whatever the runtime produces; it
    is not a `Plan: ...` dispatch and does not arm the stop-review gate.
    After all rework agents commit, advance the state with
    `transitionStatus(state, STATUS.AWAITING_DEV_REVIEW)` and re-invoke
    `dev-review` with `review_iteration += 1`.

- `result = "qa_required"` →
    `transitionStatus(state, STATUS.QA_PENDING)`. Answer the questions in
    chat, then re-invoke `dev-review` with the same `review_iteration` and
    ask the user to re-review. After the re-invocation,
    `transitionStatus(state, STATUS.AWAITING_DEV_REVIEW)`.

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
  - "base 브랜치(<base>)에 병합" → `git merge <task_branch> --no-ff -m "merge: <task_branch> into <base>"` then `git branch -d <task_branch>`. `transitionStatus(state, STATUS.MERGED)`.
  - "PR 생성" → leave the task branch in place for PR creation. State stays at `approved`.
  - "나중에 처리" → leave the task branch, do nothing. State stays at `approved`.

Do not merge, checkout, or delete the task branch without explicit user
approval. HEAD must remain on `state.base_branch` at all times.

After the user merges, you may also remove the active-plan pointer for this
state from the session via the runner-state / sessions helpers — the next
time `/runner` is invoked on this plan it will be rejected as `merged`.

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

Handled in Step 2 via the bootstrap's `worktree_exists_on_disk` flag. The
user is always asked before existing work is destroyed.

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
cat plans/<stem>/.runner-state.json

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
11. Never edit the plan-state JSON ad hoc with `Edit`/`Write`. Use the
    runner-state library helpers so the schema check and atomic write run.

</Instructions>
</Skill_Guide>
