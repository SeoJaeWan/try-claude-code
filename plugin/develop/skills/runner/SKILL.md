---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind dev-review. Use when executing a finalized plan file (either `*.plan.md` or a folder's `plan.md`). Each session owns exactly one plan per `/runner` invocation; multiple plans run in independent terminals. HEAD always stays on the base branch and the plan-state JSON at `plans/{plan_key}/.runner-state.json` holds the identity fields the dev-review skill needs.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single plan artifact end-to-end — either `*.plan.md` or a folder's
canonical `plan.md` — in one worktree, one plan-agent dispatch, gated by
dev-review (browser). The UserPromptSubmit hook does a thin sanity check on
the plan path before this skill is engaged (file exists, name matches
`*.plan.md` or `plan.md`) and emits a `[runner-skill bootstrap]` line
carrying just `plan_path`. Everything else — frontmatter parsing, state
derivation, base-branch capture, routing — is the skill's job. Step 1 below
validates the plan, builds the state record, and persists it to disk;
subsequent Steps infer where to go from disk (worktree presence, commits,
feedback.json) and keep `dev_review.phase` in sync with the dev-review loop.
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

- **Plan-state JSON edits**: the initial create happens once in Step 1
  (via `Write` on a freshly built record). After that, any `dev_review.phase`
  mutation must go through a `runner-state-cli.mjs` subcommand — never inline
  `node -e` snippets or `Edit`/`Write` on the file. The CLI bundles load +
  mutate + atomic save in one place; a hand-edit may silently lose the
  dev-review feedback path.
- **Worktree mutations from the main session**: don't. The agent commits
  the plan; main session inspects (read-only `git`). If you slip and edit
  a file inside the worktree, the next agent's `git add -A` may swallow
  it into a phase commit — visible in dev-review, but the attribution is
  lost. The cost is a confused review round, not silent corruption.

The CLI subcommand catalogue and the rationale for the slim plan-state JSON
live in [`references/enforcement.md`](references/enforcement.md).

## Bootstrap context

When the user invokes `/runner <plan-path>` the UserPromptSubmit hook fires
**before** this skill is engaged. The hook performs **only** a thin sanity
check (the path resolves to a real file whose name is `*.plan.md` or
`plan.md`) and emits a single context line:

```
[runner-skill bootstrap]
  plan_path: <abs path to the plan file>
```

That is the entire contract. Every other field — `plan_slug`, `branch`,
`owner_agent`, `task_branch`, `worktree_path`, `base_branch`,
`dev_review.phase` — is derived by Step 1 below from the plan file's
frontmatter, git state, and the on-disk state JSON if one exists.

If the bootstrap line is missing, the user did not enter through `/runner`.
Tell them so and stop — do not synthesize a plan from chat.

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
| `"qa"` | present | ≥1 | any | **Step 4 — Q&A pause** — answer the reviewer's questions in chat, write the answers to `round-responses.json`, run `qa-resolved`, then re-invoke `dev-review` (it closes the qa round into History and reopens a fresh round automatically). End your turn so the reviewer can review again. |
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

### Step 1. Validate & build state

The hook handed off `plan_path` only. Step 1 produces the state record on
disk — loaded from `state_path` (resume) or freshly built and written
(fresh) — so every subsequent Step (including a future resume) sees the
same identity fields. Do this **before any other action this turn**.

1. **Capture `base_branch`** — the very first thing, before any user
   exchange or other git command. From the repo root:

   ```bash
   git rev-parse --abbrev-ref HEAD
   ```

   If HEAD is detached or the command fails, ask the user to check out the
   intended base branch first; do not guess. The captured value is the
   `base_branch` for this plan — losing it later (user switches branches)
   is the reason this step runs first.

2. **Derive `state_path`** from `plan_path`:

   - `<dir>/plan.md` → `<dir>/.runner-state.json`; `plan_key = basename(dir)`.
   - `<dir>/<name>.plan.md` → `<dir>/<name>/.runner-state.json`;
     `plan_key = basename(dir) + "/" + name`.

   See [`references/glossary.md`](references/glossary.md) for nested-plan
   edge cases.

3. **Load or build state**:

   - **If `state_path` exists** (resume): read it with
     `cat <state_path>` (or `runner-state.loadState` via `node -e` if you
     need typed parsing). Then read the plan's frontmatter once and verify
     `state.plan_slug === frontmatter.plan_slug` and
     `state.base_branch === <captured HEAD>`. Either mismatch is an error —
     stop and tell the user before doing anything destructive (typical
     cause: plan was renamed or the user checked out a different branch
     after `/runner`).

   - **If `state_path` does not exist** (fresh): read the plan's
     frontmatter. Require three fields:
     - `plan_slug` — must match `[A-Za-z0-9._-]+` (it becomes part of the
       state file path).
     - `branch` — the task branch.
     - `owner_agent` — agent dispatched in Step 3.

     Any missing or malformed field is an error — stop and tell the user
     what to fix. Then build the state record:

     ```
     plan_slug     = frontmatter.plan_slug
     plan_path     = <abs plan path from bootstrap>
     owner_agent   = frontmatter.owner_agent
     base_branch   = <captured HEAD>
     task_branch   = frontmatter.branch
     worktree_path = <repo_root>/worktrees/<branch with "/" → "-">
     dev_review    = { phase: null, last_feedback_path: null }
     ```

     **Persist the record to `state_path` now**, after validation has
     succeeded (use the `Write` tool — the file is small and atomicity is
     not critical here). Writing here, not later, makes the file the source
     of truth from this point on — so if the turn is interrupted between
     Steps 2 and 4 (agent dispatch fails, user aborts, etc.) the next
     `/runner` invocation finds the state on disk and resumes with the
     original `base_branch`, not whatever HEAD the user happens to be on.

4. **Continue to the action implied by the routing table.** Use
   `state.dev_review.phase` (always `null` for a freshly written record) and
   the disk inspection columns to choose Step 2, 3, or 4.

### Step 2. Set up the worktree

Use the state record from Step 1. You need: `plan_path`, `task_branch`,
`worktree_path`, `base_branch`.

```bash
# Confirm HEAD is still on the base branch Step 1 captured.
git rev-parse --abbrev-ref HEAD
```

If HEAD is not on `state.base_branch`, do not proceed — Step 1 captured the
base at the start of this turn, and the worktree must branch from that exact
commit. Ask the user before doing anything destructive.

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
   the plan's `owner_agent` before re-running `/runner`. If a state file
   already exists at `state.state_path` (resume case), delete it first so
   the corrected frontmatter is re-read on the next run. Do not call
   `Agent`.

2. **Dispatch the agent foreground.** The prompt body is
   **`references/prompts/plan-dispatch.md` — read it and substitute the
   placeholders before sending**:

```
Agent(
  subagent_type: <state.owner_agent>,
  description: "Plan: <state.plan_slug>",
  prompt: <contents of references/prompts/plan-dispatch.md with
           {{worktree_path}}, {{plan_path}}, {{state_path}},
           {{author_notes_dir}} substituted>,
)
```

`{{author_notes_dir}}` is `dirname(state_path) + "/dev-review/author-notes-input"`
(absolute) — where the agent drops its line-anchored AI rationale notes. The
dev-review helper reads that directory on the next round and resolves each
snippet to a diff line.

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

When the plan-agent returns (Step 3) or the routing table sends you back
here from a resume, invoke the `dev-review` skill with the state path:

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
| `rework` | `begin-rework <state-path> <feedback.json absolute path>` | Dispatch one rework agent per `rework_items[i]`, write `round-responses.json` (see below), then `rework-done <state-path>`, then re-invoke `dev-review`. |
| `qa_required` | `mark-qa-pending <state-path>` | Answer the questions in chat, write the answers to `round-responses.json` (see below), then `qa-resolved <state-path>`, then re-invoke `dev-review`. The re-entry closes the qa round (questions + answers go to History) and opens a fresh round automatically — the reviewer does **not** manually reset anything. |

**Writing `round-responses.json`.** Before re-invoking `dev-review` for a `rework` or `qa_required` result, write `plans/{plan_key}/dev-review/round-responses.json` so the response each comment received lands in History (schema: `references/review-data-schema.md` → "round-responses.json"):

- For each `qa_required` `question_items[].comments[]` → `{ "<id>": { "route": "answer", "summary": "<your chat answer to that question>", "resulting_commit_sha": null } }`. This is the **only** way chat answers reach History — required.
- For each `rework_items[].comments[]` → `{ "<id>": { "route": "rework", "summary": "<what the rework commit changed>", "resulting_commit_sha": "<follow-up commit sha>" } }`. Optional — if omitted, the skill derives it from the follow-up commit — but writing it gives accurate per-comment attribution.

Set `for_task_head_sha` to the worktree's current HEAD short sha (the round being closed). The skill consumes and deletes this file on re-entry.

All commands are `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs"
<subcommand> ...`. `begin-rework` records the feedback.json path; rounds
themselves are identified by the worktree HEAD's short SHA in the UI, not
by a counter.

For each `rework_items[i]`, dispatch
`Agent(subagent_type: item.dispatch_agent, ...)` with the prompt body from
**`references/prompts/rework-dispatch.md`** — substitute `{{worktree_path}}`,
`{{commit_short_sha}}`, `{{commit_subject}}`, `{{author_notes_dir}}`
(same value as the plan dispatch), and render `{{comments_block}}`
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
    3. (optional) `node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" reset <state.state_path> --confirm` — removes the state file and any sibling `feedback*.json` so the plan directory is empty. Skip if the user wants to keep the audit trail.
  - **"PR 생성"** — leave the task branch in place and invoke the `/pr` skill so it can `git push` the branch and open the PR. The state file stays so a future `/runner` resume is clean.
  - **"나중에 처리"** — leave the task branch, do nothing. The state file stays.

Do not merge, checkout, or delete the task branch without explicit user
approval. HEAD must remain on `state.base_branch` at all times.

If the user later re-runs `/runner` on the same plan, behaviour depends on
which option they picked:

- **Merged + reset state**: the next `/runner` is a fresh start. Step 1
  writes a new state file; Step 2 tries `git worktree add -b <task_branch>
  ...` and fails with "branch already exists" because the merged task
  branch is still around. That git error is the natural signal that this
  plan is already complete — the user can delete the branch and start a
  genuinely fresh run, or pick a different plan.
- **Merged, state kept** / **PR** / **나중에**: the state file still
  exists. The routing table's "Post-Step-5 re-entry" row handles it — the
  skill asks the user whether to re-create the worktree, abandon the plan
  (`rm <state-path>`), or merge from the existing task branch.

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
  hook did not fire, errored, or the user invoked the skill some other way.
  Tell them to enter through `/runner <plan-path>`; do not synthesize state
  from chat.
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
