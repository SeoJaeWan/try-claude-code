---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind dev-review. Use when executing a finalized plan file (either `*.plan.md` or a folder's `plan.md`). Each session owns exactly one plan per `/runner` invocation; multiple plans run in independent terminals. HEAD always stays on the base branch and the plan-state JSON at `plans/{plan_key}/.runner-state.json` holds the identity fields the dev-review skill needs.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single plan artifact end-to-end — either `*.plan.md` or a folder's
canonical `plan.md` — in one worktree, one plan-agent dispatch, gated by
dev-review (browser). The runner does not parse the plan's body and does not
pick the entry point on its own — the UserPromptSubmit hook reads the plan
and emits a `[runner-skill bootstrap]` context block telling the skill which
plan file and state path to use. The skill's job is to act on that bootstrap,
infer the current Step from disk (worktree presence, commits, feedback.json),
and keep `dev_review.phase` in sync with where the dev-review loop sits.
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

The runner has no hard tool-call gate. Correctness comes from two layers
of defense in depth, in order of how soon they catch a mistake:

1. **This SKILL prose + the dispatch prompt** — the LLM driving the main
   session reads SKILL.md each turn and follows the Core rules below.
   Sub-agents read `references/prompts/plan-dispatch.md` and commit phase
   by phase inside the worktree.
2. **dev-review browser UI** — every plan commit is reviewed by the human
   reviewer in the browser before merge. Any mutation that lands in a
   commit is visible there — wrong-attribution slips, scope drift, and
   broken phases all show up as commits the reviewer can flag.

What this means in practice:

- **Plan-state JSON edits**: use `runner-state-cli.mjs` subcommands for
  `dev_review.phase` mutations, never inline `node -e` snippets or
  `Edit`/`Write` on the file. The CLI bundles load + mutate + atomic save
  in one place; a hand-edit may silently lose the dev-review feedback path.
- **Worktree mutations from the main session**: don't. The agent commits
  the plan; main session inspects (read-only `git`). If you slip and edit
  a file inside the worktree, the next agent's `git add -A` may swallow
  it into a phase commit — visible in dev-review, but the attribution is
  lost. The cost is a confused review round, not silent corruption.

The CLI subcommand catalogue and the rationale for the slim plan-state JSON
live in [`references/enforcement.md`](references/enforcement.md).

## Bootstrap context

When the user invokes `/runner <plan-path>` the UserPromptSubmit hook fires
**before** this skill is engaged. It validates the plan, refuses re-entry if
the plan has a `.merged` marker file, creates or loads the state file, and
injects an `additionalContext` block that begins with `[runner-skill
bootstrap]` and carries exactly two fields:

```
[runner-skill bootstrap]
  state_path: <abs path to .runner-state.json>
  mode: fresh | resume
```

That is the entire contract. Everything else — `plan_slug`, `plan_path`,
`owner_agent`, `task_branch`, `worktree_path`, `base_branch`,
`dev_review.phase` — lives in the JSON at `state_path`. **Open it and read it
as your first action every turn**; do not try to remember fields from a
previous turn.

If the bootstrap block is missing, the user did not enter through `/runner`.
Tell them so and stop — do not try to drive a plan without state.

`mode: fresh` means the hook just created the state file (worktree does not
exist yet — go to Step 2). `mode: resume` means an existing state file was
loaded — infer the current Step from disk per the routing table below.

## Step routing (disk + dev_review.phase)

The plan-state JSON does **not** carry a `status` field. Read
`state.dev_review.phase` and inspect disk to decide which Step to enter.

| `dev_review.phase` | worktree at `state.worktree_path` | commits on `task_branch` beyond base | feedback.json at `plans/{plan_key}/dev-review/feedback.json` | → Action |
|---|---|---|---|---|
| `null` | absent | n/a | n/a | **Step 2** — create the worktree, then continue to Step 3 in the same turn. |
| `null` | present | 0 | n/a | **Step 3** — dispatch the plan agent foreground; when it returns, continue to Step 4 in the same turn. |
| `null` | present | ≥1 | absent | **Step 4 first entry** — invoke `dev-review`. |
| `"awaiting"` | present | ≥1 | exists (`review_status` not yet `submitted`) | **Step 4 awaiting** — `dev-review` already opened the browser. End your turn so the user can review. |
| `"awaiting"` | present | ≥1 | `submitted` | **Step 4 — process result** — re-invoke `dev-review` to read the verdict and branch on approved/rework/qa_required. |
| `"rework"` | present | ≥1 | any | **Step 4 — rework in flight** — re-invoke `dev-review`; the new HEAD triggers package regeneration in that skill. |
| `"qa"` | present | ≥1 | any | **Step 4 — Q&A pause** — answer the reviewer's questions in chat, then ask them to reset the question comments and reply `리뷰 완료`. End your turn. |
| any non-null | **absent** | (task branch may still exist) | any | **Post-Step-5 re-entry** — the previous run reached Step 5 and the user picked PR / 나중에. Ask the user: re-create the worktree to continue, abandon the plan (`rm <state-path>`), or proceed to merge from the existing branch. |

`null` worktree + non-null phase is the only "weird" combination; everything
else is deterministic from disk. When unsure, prefer re-invoking dev-review —
that skill is idempotent and will surface whatever inconsistency exists in
feedback.json.

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
6. The plan-agent dispatch is **foreground**. When it returns, continue
   immediately to Step 4 (invoke `dev-review`) in the **same turn**. There
   is no Stop hook gate to wait for.
7. plan-runner runs from the repository root, never from inside `worktrees/**`.
8. Multiple plans run in separate terminals as independent sessions.

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
plan-state's `base_branch` field records it for the dev-review skill's diff
range computation. The task branch is created by `git worktree add -b`,
lives only inside the worktree until cleanup, and is never merged or
deleted without explicit user approval.

---

## Execution workflow

### Step 1. Validate (handled by the UserPromptSubmit hook)

Plan validation, frontmatter parsing, `.merged` marker check, and state-file
creation all happen in the hook before the skill runs. If the bootstrap
context arrived, validation passed. Skip directly to the action implied by
the routing table.

If the user invoked the skill some other way and there is no bootstrap, do
not try to validate manually — tell them to enter through `/runner
<plan-path>` so the hook can do its job.

### Step 2. Set up the worktree

Read the state JSON. You need: `plan_path`, `task_branch`, `worktree_path`,
`base_branch`.

```bash
# Confirm HEAD is on the base branch the hook recorded.
git rev-parse --abbrev-ref HEAD
```

If HEAD is not on `state.base_branch`, do not proceed — the hook captured the
base when the user invoked `/runner`, and the worktree must branch from that
exact commit. Ask the user before doing anything destructive.

Stale-worktree handling is driven by checking the worktree directory on
disk yourself (`[ -d <state.worktree_path> ]` via Bash):

- **worktree missing** — fresh start. Run
  `git worktree add -b <task_branch> <worktree_path> <base_branch>`.
- **worktree present, directory empty / unrelated** — ask the user; if
  they confirm, remove it and re-create.
- **worktree present, commits already on the task branch** — describe
  what is there using
  `git -C <worktree_path> log --oneline <base_branch>..<task_branch>`
  (cap at 20 lines), then ask whether to resume on top of the existing
  work or wipe it and restart.

After the worktree is in place, **continue immediately to Step 3 in the same
turn** — there is no gate between worktree setup and dispatch.

### Step 3. Dispatch the plan agent (single Agent call)

Dispatch exactly one `Agent(...)` call. The agent reads the plan and
commits phase by phase inside its single turn. The skill's job in this
step is twofold:

1. **Verify the owner agent file exists.** Read `state.owner_agent`, strip
   any `<plugin>:` namespace prefix, and check that
   `${CLAUDE_PLUGIN_ROOT}/agents/<bare-name>.md` exists with `[ -f ... ]`
   via Bash. If it does not, **stop immediately** and tell the user to fix
   the plan's `owner_agent` then delete the state file
   (`plans/<plan_key>/.runner-state.json`) before re-running `/runner`. Do
   not call `Agent`.

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

**Foreground only — never pass `run_in_background: true`.** A background
dispatch returns before commits exist; the model would end its turn with
no commits in the worktree and the next /runner would mis-route to Step 3
again. The full rationale lives in
[`references/dev-review-flow.md`](references/dev-review-flow.md) under
"Why foreground matters".

The `description` form `Plan: <slug>` is kept for human readability; hooks
no longer parse it.

After the agent returns, briefly summarize the commits it produced (output
`git -C <worktree_path> log --oneline <base_branch>..<task_branch>` as a
plain-text list) and then **continue to Step 4 in the same turn** by
invoking the `dev-review` skill. Do not end the turn between Step 3 and
Step 4.

### Step 4. Developer review gate (browser)

When the plan-agent returns (Step 3) or the bootstrap routes here from a
resume, invoke the `dev-review` skill with the state path:

```
dev-review(state_path: <state.state_path>)
```

The dev-review skill reads identity fields from the state JSON (`plan_path`,
`worktree_path`, `task_branch`, `base_branch`), generates the review
package, starts the browser server, prints a URL, and ends its turn so the
user can review and reply `리뷰 완료`.

When the user replies, re-enter the dev-review skill; it returns a terminal
summary derived from `feedback.json`. Route the result through the right
CLI subcommand:

| `result` from dev-review | CLI sequence | Next action |
|---|---|---|
| `approved` | (none needed) | Go to Step 5. The state file stays in place until Step 5 finishes. |
| `rework` | `begin-rework <state-path> <feedback.json absolute path>` | Dispatch one rework agent per `rework_items[i]`, then `rework-done <state-path>`, then re-invoke `dev-review`. |
| `qa_required` | `mark-qa-pending <state-path>` | Answer in chat, ask the user to reset the question comments in the browser and reply `리뷰 완료`. After they do, `qa-resolved <state-path>`, then re-invoke `dev-review` (same round). |

All commands are `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs"
<subcommand> ...`. `begin-rework` records the feedback.json path; rounds
themselves are identified by the worktree HEAD's short SHA in the UI, not
by a counter.

For each `rework_items[i]`, dispatch
`Agent(subagent_type: item.dispatch_agent, ...)` with the prompt body from
**`references/prompts/rework-dispatch.md`** — substitute `{{worktree_path}}`,
`{{commit_short_sha}}`, `{{commit_subject}}`, and render `{{comments_block}}`
from `item.comments[]` per the format documented in that file. Rework
dispatches must be **foreground**.

The per-commit semantics, the parallel-vs-sequential rule, and the
feedback-file invariants live in
[`references/dev-review-flow.md`](references/dev-review-flow.md); read it
the first time a rework branch fires.

Do not advance past this gate on anything except `result = "approved"`. Do
not remove the worktree, do not merge, do not ask about merge until approval.

### Step 5. Clean up the worktree and ask the user

The plan is approved. The task branch holds every plan commit plus any
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
    3. `touch plans/<plan_key>/.merged` — this is the terminal marker the
       UserPromptSubmit hook reads on the next `/runner` to refuse re-entry.
    4. (optional) `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" reset <state.state_path> --confirm` — removes the state file and any sibling `feedback*.json` so the plan directory is empty. Skip if the user wants to keep the audit trail.
  - **"PR 생성"** — leave the task branch in place and invoke the `/pr` skill so it can `git push` the branch and open the PR. Do **not** touch `.merged` — the user may come back later to merge locally. The state file stays so a future `/runner` resume is clean.
  - **"나중에 처리"** — leave the task branch, do nothing. Same as PR: no `.merged` marker, state file stays.

Do not merge, checkout, or delete the task branch without explicit user
approval. HEAD must remain on `state.base_branch` at all times.

After merge, the `.merged` marker is the terminal record. The next time
`/runner` is invoked on this plan the UserPromptSubmit hook reads the
marker first, blocks entry, and tells the user to delete the marker if
they really want to re-run.

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
thinks is true, then check disk to see what is actually there:

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
  left off — the routing table reads `dev_review.phase` and disk state.

For deeper recovery (corrupted state JSON, renamed plan file, re-running
a merged plan), see
[`references/plan-state-recovery.md`](references/plan-state-recovery.md).

---

## Validation commands

```bash
# Inspect the current plan-state JSON
cat plans/<plan_key>/.runner-state.json

# Inspect worktree state
git worktree list --porcelain

# Verify HEAD hasn't drifted
git rev-parse --abbrev-ref HEAD

# Check if this plan is already merged
[ -f plans/<plan_key>/.merged ] && echo "merged" || echo "not merged"
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
