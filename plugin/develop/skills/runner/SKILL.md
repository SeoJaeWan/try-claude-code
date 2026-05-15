---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind stop-review and dev-review. Use when executing a finalized plan file (either `*.plan.md` or a folder's `plan.md`). Each session owns exactly one plan per `/runner` invocation; multiple plans run in independent terminals. HEAD always stays on the base branch and the plan-state JSON at `plans/{plan_key}/.runner-state.json` is the single source of truth for progress.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single plan artifact end-to-end — either `*.plan.md` or a folder's
canonical `plan.md` — in one worktree, one plan-agent
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

Plan-runner uses a precise vocabulary (`plan_path`, `plan_key`, `plan_slug`,
`stem`, `task_branch`). When a hook log or commit message uses a term
ambiguously — or when prose says `plans/{plan_key}/...` and you are not
sure whether your case is a flat plan, a folder plan, or a collision —
read [`references/glossary.md`](references/glossary.md).

## Enforcement model

Hard guarantees come from three places: the **PreToolUse hook**
(target-location ALLOW/BLOCK during agent-active phases), the **Stop hook**
(ALLOW / BLOCK / TIMEOUT verdict after a plan dispatch), and
`runner-state.mjs` (schema + `ALLOWED_TRANSITIONS` on every save).

To keep the prose-vs-enforcement gap small, **every status transition this
skill performs goes through one CLI**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
  <subcommand> <state-path> [extra-args]
```

Do **not** edit the JSON with `Edit`/`Write`, and do **not** call
`runner-state.mjs` helpers from inline `node -e` snippets. The PreToolUse
hook also blocks direct edits to the state file while a plan is mid-flight
— the only way through is the CLI.

The full subcommand catalogue (with the canonical step that calls each),
the PreToolUse target-location rule details, and the rationale for the
plan-state JSON SSOT all live in
[`references/enforcement.md`](references/enforcement.md). Read it once when
you first hit a `decision: "block"` payload starting with `[runner] 활성
plan`, or whenever a CLI subcommand name in this file is unfamiliar.

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
`preparing`). `mode: resume` means the hook loaded an existing one — pick
the action up from `state.status` per the routing table below.

## Status routing

Read `state.status` from the JSON to pick the high-level Step. When the row
also calls out a sub-state, read the named phase field to disambiguate.

| status | sub-state to read | action |
|---|---|---|
| `preparing` | — | Step 2 hasn't completed. Check `[ -d <state.worktree_path> ]`; if missing, run Step 2. If present, fall straight to Step 3 (which calls `arm-for-dispatch` before dispatching the plan agent). |
| `dispatching` | `state.stop_review.phase` | `phase = "armed"` → previous turn ended with the gate armed; end your turn so the Stop hook can fire. `phase = "blocked"` → Stop hook reported BLOCK; read `state.stop_review.block_history[last].reason_excerpt` and re-dispatch the plan agent — see **Step 3 (re-entry)**. `phase = "passed"` is transient (set right before the flip to `dev_reviewing`); you should not normally observe it. |
| `dev_reviewing` | `state.dev_review.phase` | `phase = "awaiting"` → Stop-review passed; enter **Step 4 — Dev-review gate**. `phase = "rework"` → Reviewer left needs-change items; read `state.dev_review.last_feedback_path` and dispatch rework agents — see **Step 4 (rework)**. `phase = "qa"` → Reviewer asked questions; answer in chat, then `qa-resolved` and re-enter Step 4 with the same round. |
| `closing` | — | Dev-review accepted the plan. Go to **Step 5 — Cleanup and ask user**. |
| `merged` | — | Terminal. The hook will already have blocked entry, so you should not normally see this. |

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
   do not coordinate; each plan goes through its own gates. The
   UserPromptSubmit hook enforces "one /runner per terminal" — if a
   session already drives a non-terminal plan, a second `/runner` is
   rejected. This keeps the Stop hook from having to multiplex BLOCK
   feedback across plans (the first BLOCK would otherwise mask the rest).

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
disk yourself (`[ -d <state.worktree_path> ]` via Bash). All cases live
under `status: preparing`:

- **worktree missing** — fresh start. Run
  `git worktree add -b <task_branch> <worktree_path> <base_branch>`.
- **worktree present, directory empty / unrelated** — ask the user; if
  they confirm, remove it and re-create.
- **worktree present, commits already on the task branch** — describe
  what is there using
  `git -C <worktree_path> log --oneline <base_branch>..<task_branch>`
  (cap at 20 lines), then ask whether to resume on top of the existing
  work or wipe it and restart. The state stays at `preparing` until
  `arm-for-dispatch` is explicitly called in Step 3.

After the worktree is in place, **stop here and proceed to Step 3**. Step 2
must not transition status itself — `arm-for-dispatch` in Step 3 is the
single place that moves `preparing → dispatching`.

### Step 3. Dispatch the plan agent (single Agent call)

Dispatch exactly one `Agent(...)` call. The agent reads the plan and
commits phase by phase inside its single turn. The skill's job in this
step is twofold:

1. **Arm the stop-review gate explicitly** — *before* the `Agent(...)`
   call, run:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
     arm-for-dispatch <state.state_path>
   ```

   This walks `preparing → dispatching` + `stop_review.phase = "armed"`
   atomically. If you skip it, the Stop hook won't fire when the agent's
   turn ends — the gate stays disarmed and the plan never reaches Step 4.

2. **Dispatch the agent foreground.** The prompt body is
   **`references/prompts/plan-dispatch.md` — read it and substitute the
   placeholders before sending**:

```
Agent(
  subagent_type: <state.owner_agent>,
  description: "Plan: <state.plan_slug>",
  prompt: <contents of references/prompts/plan-dispatch.md with
           {{worktree_path}}, {{plan_path}}, {{state_path}} substituted>,
)
```

**Foreground only — never pass `run_in_background: true`.** PreToolUse
refuses the call outright; the underlying reason (background dispatch
returns before commits exist, Stop hook then reviews a base-branch commit
and walks state past the agent — deadlock) lives in
[`references/dev-review-flow.md`](references/dev-review-flow.md) under "Why
the Step-3 deadlock matters".

The `description` form `Plan: <slug>` is kept for human readability and
continuity, but the hooks no longer parse them. If you need to vary the
wording, you may — the runner-state JSON is the only contract. The prompt
body itself, however, must come from the reference file so any contract
change updates one place.

After the agent returns, output a brief plain-text report (commit list +
"Stop-review가 실행됩니다.") and end your turn. **Do not call any tool
afterwards in the same turn.** The Stop hook fires on turn end and reads the
plan-state to decide whether to gate. "After the agent returns" means after
the foreground Agent tool call yields a tool result with the agent's final
message — which only happens once the agent is done — not after the prompt
was sent.

#### Step 3 re-entry (after BLOCK)

If the bootstrap arrives with `status: dispatching` and
`stop_review.phase: blocked`, the previous turn's Stop hook recorded a
BLOCK and you are looking at the next user turn. Do **not** try to fix the
code yourself in the main session — the BLOCK reason came in as a prior
`decision: block` payload, and the Stop hook also appended a
`[plan-runner: replay <state-path>]` directive that names the state file
to consult.

Action:

1. Read the state file. The last entry of
   `state.stop_review.block_history` carries the BLOCK count and a one-line
   `reason_excerpt`; the full reason was in the previous turn's
   `decision: block` payload.
2. If that last entry's `count >= 3`, surface the escalation note instead of
   blindly redispatching — ask the user to intervene per the planner
   directive's choices. The Stop hook already attached the same note to the
   BLOCK reason.
3. Otherwise, re-arm the gate explicitly:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
     arm-for-dispatch <state.state_path>
   ```

   This flips `dispatching/blocked → dispatching/armed`. Then re-run Step 3's
   `Agent(...)` call. The new commits will trigger another stop-review on
   the next turn-end.

### Step 4. Developer review gate (browser)

Once `status` is `dev_reviewing` with `dev_review.phase = "awaiting"`,
invoke the `dev-review` skill — it takes a single input (the absolute
state-path) and reads everything else (slug, plan path, worktree, branches,
iteration) from the JSON:

```
dev-review(state_path: <state.state_path>)
```

The dev-review skill prints a server URL and ends its turn so the user can
review in the browser and reply `리뷰 완료`. When the user replies, re-enter
the dev-review skill; it returns a terminal summary based on `feedback.json`.

Route the result through the right CLI subcommand:

| `result` from dev-review | CLI sequence | Next action |
|---|---|---|
| `approved` | `mark-approved <state-path>` | go to Step 5 |
| `rework` | `begin-rework <state-path> <feedback.json absolute path>` | dispatch rework agents per `rework_items[]`, then `rework-done <state-path>`, then re-invoke `dev-review` |
| `qa_required` | `mark-qa-pending <state-path>` | answer in chat, then `qa-resolved <state-path>`, then re-invoke `dev-review` (same round) |

All commands are `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs"
<subcommand> ...`. `begin-rework` is the only call that bumps
`dev_review.current_round`; the first Step 4 entry stays at round 1.

For each `rework_items[i]`, dispatch
`Agent(subagent_type: item.dispatch_agent, ...)` with the prompt body from
**`references/prompts/rework-dispatch.md`** — substitute `{{worktree_path}}`,
`{{commit_short_sha}}`, `{{commit_subject}}`, and render `{{comments_block}}`
from `item.comments[]` per the format documented in that file. Rework
dispatches must be **foreground**.

Rework intentionally does **not** call `arm-for-dispatch`. The per-commit
semantics, the parallel-vs-sequential rule, and the round-bookkeeping
invariants live in [`references/dev-review-flow.md`](references/dev-review-flow.md);
read it the first time a rework branch fires.

Do not advance past this gate on anything except `result = "approved"`. Do
not remove the worktree, do not merge, do not ask about merge until approval.

### Step 5. Clean up the worktree and ask the user

The state is `closing`. The task branch holds every plan commit plus any
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
  - **"PR 생성"** — leave the task branch in place and invoke the `/pr` skill so it can `git push` the branch and open the PR. State stays at `closing`. Pass the task branch and base branch from the state file.
  - **"나중에 처리"** — leave the task branch, do nothing. State stays at `closing`.

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

If something looks off, read the state JSON first to see what the runner
thinks is true, then pick the scenario:

- **Bootstrap missing.** No `[runner-skill bootstrap]` block. UserPromptSubmit
  hook did not fire or errored. Tell the user to enter through
  `/runner <plan-path>`; do not synthesize state from chat.
- **Stale worktree.** Handled in Step 2 by checking the worktree path on
  disk yourself. Always ask before destroying existing work.
- **Plan agent failed / committed less than expected.** Run
  `git -C "<state.worktree_path>" status`, report what was committed vs.
  missing, and decide with the user: re-dispatch, repair manually, or abort
  (remove worktree + state file). Worktree stays intact for inspection.
- **Crashed mid-run.** Re-invoking `/runner <plan>` picks up where things
  left off — the bootstrap reports the saved status and routing picks the
  right step.

For deeper recovery (corrupted state JSON, BLOCK streak escalation,
`--force-status` transitions, renamed plan file, re-running a `merged`
plan), see [`references/plan-state-recovery.md`](references/plan-state-recovery.md).

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

The **Core rules** above enforce the operationally critical guardrails
(HEAD stays on base, one worktree per plan, one Agent call per plan,
foreground only, etc.). Failure-mode-specific guardrails (never use
`isolation: "worktree"`, never call `EnterWorktree`, never edit state JSON
ad hoc, reviewer-chosen `dispatch_agent` is authoritative, etc.) live in
[`references/guardrails.md`](references/guardrails.md). Read it once at
the start of a new plan; the rules are stable.

</Instructions>
</Skill_Guide>
