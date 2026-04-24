---
name: runner
description: Deterministic plan orchestrator with per-task worktree isolation, sequential phase commits, and per-phase user approval. Use when executing a finalized single `plan.md` whose phases must run in order. Waits for user confirmation after each phase, and after all phases complete asks user whether to merge — HEAD always stays on the base branch.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute plan.md artifacts with task-level worktree isolation and sequential phase commits. Each task gets one worktree for its entire lifecycle — phases commit sequentially within it, and after completion the worktree is cleaned up. HEAD always remains on the base branch; the user is asked whether to merge the task branch.
</Purpose>

<Instructions>
# plan-runner

Orchestrate plan.md execution with task-level worktree isolation and commit-based phase progression.

---

## Why this workflow matters

`Agent(isolation: "worktree")` doesn't support nested Agent calls inside the worktree, so phase-level agent specialization is impossible with it. Using it when plan-runner is already in a worktree also causes nesting (`worktrees/A/worktrees/B`). And `EnterWorktree` has no mid-session exit, making post-work merge impossible.

This skill uses manual `git worktree` management: one worktree per task, phase agents commit sequentially within it, and after completion the worktree is removed while HEAD stays on the base branch. The user is then asked whether to merge. This gives full control over the worktree lifecycle while supporting different specialized agents per phase in a strict sequential workflow.

---

## Inputs

1. Plan file path (`plans/{task-name}/plan.md`)
2. Plan headers:
    - `**Branch:** {task-branch}` — the name for this task's worktree and branch
    - optional top routing table `| # | Phase | Agent |` for quick phase-to-agent mapping
3. Linked phase detail files with `- owner_agent: \`{agent-name}\``

---

## Commit convention

Conventional Commits: `{type}({scope}): {description}`

Types: `feat` · `fix` · `refactor` · `docs` · `chore`

Phase tracking is automatic (hook system) — do NOT put phase numbers in commit messages.

---

## Core rules

1. plan-runner runs in the main conversation context (no agent binding).
2. The main context HEAD stays on the base branch at all times — during and after execution. Never checkout the task branch automatically.
3. Task branches are created via `git worktree add -b` (one per task, not per phase).
4. Phase agents are dispatched via `Agent` without `isolation: "worktree"` — they work directly in the worktree directory.
5. Each phase ends with a commit. After the final phase + dev-review approval (every card approved or out-of-scope), plan-runner removes the worktree and asks the user whether to merge — it never checks out the task branch. The worktree stays alive through every dev-review rework round so phase agents can keep committing into it.
6. plan-runner runs from the repository root, never from inside `worktrees/**`.

---

## Branch model

```
X (base branch — HEAD stays here during execution)
│
└── git worktree add -b task-A worktrees/task-A X
    ├── commit: docs(plan): add plan and test contracts for task-A  ← plan folder contents + materialized tests (auto)
    ├── commit: feat(auth): implement JWT-based login
    ├── commit: feat(auth): add token refresh middleware
    ├── commit: test(auth): add integration tests for login flow
    ├── commit: fix(auth): token exp 15m (rework from dev-review R1) ← Step 4 rework commits (0..N rounds)
    └── (dev-review approved)
    → worktree remove → ask user: merge into X? (HEAD stays on X)
```

- **Base branch (X):** Where HEAD is when plan-runner starts. HEAD stays here throughout the entire lifecycle — during and after execution.
- **Task branch:** Created by `git worktree add -b`. All phase commits accumulate on this branch inside the worktree. After completion, the worktree is removed and the user decides whether to merge.

---

## Execution workflow

### Step 1. Validate

- Ensure `**Branch:**` header exists in the plan file.
- Ensure the Phase Index table (`| # | Phase | Agent |`) exists near the top of plan.md — this is the primary routing source.
- Ensure every phase file path listed in the table exists under the plan folder.
- Ensure current working directory is the repository root (not inside `worktrees/**`).
- Do NOT pre-check agent existence here — the `Agent` tool validates `subagent_type` at dispatch time and fails immediately if the agent is missing.
- If validation fails → stop immediately.

### Step 2. Set up

```bash
# Record the base branch
BASE=$(git rev-parse --abbrev-ref HEAD)

# Read task branch name from plan header
TASK_BRANCH="{value from **Branch:**}"
WORKTREE_DIR="worktrees/${TASK_BRANCH}"

# Parallel-task awareness (informational — does NOT block execution).
# If other worktrees are already active, surface them so the user (or you)
# can decide whether another task is intentionally in progress or whether
# those are stale leftovers from a previous failed run. Intentional parallel
# work is allowed; the stop-gate only tracks the first worktree in the diff
# list, so running two tasks at once will lose phase context for one of them.
OTHER_WORKTREES=$(git worktree list --porcelain \
  | awk '/^worktree / && $2 != ENVIRON["PWD"]' \
  | grep -v "$WORKTREE_DIR" || true)
if [ -n "$OTHER_WORKTREES" ]; then
  echo "ℹ️  Other active worktrees detected (informational, not blocking):" >&2
  echo "$OTHER_WORKTREES" >&2
  echo "  - If these are stale from a failed run: clean up with 'git worktree remove <path>'." >&2
  echo "  - If another task is intentionally in progress: proceed, but note that" >&2
  echo "    stop-gate phase tracking covers only one worktree per session." >&2
fi

# Check for stale worktree from a previous failed run
if git worktree list --porcelain | grep -q "$WORKTREE_DIR"; then
  echo "Stale worktree found: $WORKTREE_DIR"
  git -C "$WORKTREE_DIR" log --oneline "$BASE".."$TASK_BRANCH" 2>/dev/null
  git -C "$WORKTREE_DIR" status --short 2>/dev/null
  # → Report existing commits/changes as plain text and end your turn.
  #   Options:
  #   - "정리하고 새로 시작" → remove worktree + delete branch, then recreate
  #   - "기존 worktree에서 이어서 진행" → skip creation, resume from last completed phase
  #   - "중단" → stop execution
fi

# Create worktree with a new branch based on the base
git worktree add -b "$TASK_BRANCH" "$WORKTREE_DIR" "$BASE"
```

After creating the worktree, copy the entire plan folder into it and commit as the first commit on the task branch. This ensures the plan, test contracts, and any other artifacts under the plan folder are included when the task branch is merged.

```bash
# Copy the entire plan folder into the worktree. Uses a Node helper instead
# of `cp -r` / `mkdir -p` so this works identically on Windows (cmd/PowerShell),
# macOS, and Linux without requiring Bash-specific utilities.
PLAN_DIR="plans/{task-name}"
node "${CLAUDE_PLUGIN_ROOT}/scripts/plan-copy.mjs" "$PLAN_DIR" "$WORKTREE_DIR/$PLAN_DIR"

# Commit plan artifacts as the first commit
git -C "$WORKTREE_DIR" add -A
git -C "$WORKTREE_DIR" commit -m "docs(plan): add plan and test contracts for {task-name}"
```

After this step, HEAD is still on `$BASE` in the main repo. The worktree has its own checkout of `$TASK_BRANCH` with the plan folder contents as the first commit.

### Step 3. Execute phases

Read the Phase Index table from the top of plan.md to get the ordered list of `(phase_file_path, owner_agent)` pairs. For each row in order, dispatch the phase agent and then end your turn so the stop-gate can review.

The agent's job is to read its own phase file and execute it — don't inline the phase content into the prompt. The phase file lives inside the worktree (it was copied there in Step 2), so the agent can read it directly from the working directory.

> **Contract**: The exact shape of `description` and the leading `prompt` header below is a contract shared with `plugin/develop/scripts/lib/contract.mjs` (regexes and builder functions) and the hook CI tests. Do NOT alter the `"Phase N: ..."` description form or the `"## Working directory / You are working in: ..."` block. If you need a new shape, update contract.mjs and the unit tests together.

```
Agent(
  subagent_type: "{owner_agent}",
  prompt: "
    ## Working directory
    You are working in: {repo_root}/{WORKTREE_DIR}
    cd to this directory before starting any work.

    ## Your phase
    Read and execute the phase contract at: {phase_file_path}
    That file contains your complete task spec, boundary, acceptance criteria, and validation checklist.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Only implement the phase described in your phase file. Do NOT redo prior phases.
    - Commit when done: git add -A && git commit -m '{type}({scope}): {description}'
    - Include a 1~2 line commit body explaining WHY (not what). This body is surfaced verbatim in the developer-review UI at Step 4, so it should read as rationale for the change, not a summary of the diff.
  ",
  description: "Phase {N}: {short summary}"
)
```

**Before calling `Agent(...)`, run a self-check on the dispatch:**

1. The `description` field MUST start with `"Phase N:"` (literal word "Phase", a space, the phase number, a colon). Examples of correctly formatted descriptions: `"Phase 1: implement login"`, `"Phase 10: final cleanup"`. Examples that WILL break the hook contract: `"[Phase 1] …"`, `"1단계: …"`, `"phase one: …"`.
2. The `prompt` MUST include a line reading exactly `"You are working in: <absolute_worktree_path>"`. Do not rename this header, do not translate it, and do not wrap the path in quotes.

If either check fails, fix the dispatch before calling `Agent`. These strings are the shared contract with `scripts/lib/contract.mjs`; drift will cause the Stop hook to lose phase context silently.

After the agent returns, output a brief report as **plain text** and let your turn end naturally. Do NOT use `AskUserQuestion` — just output text so that `end_turn` triggers the Stop hook.

Report:
- `git -C "$WORKTREE_DIR" log --oneline -1` (latest commit)
- "Phase {N} 완료. Stop-gate review가 실행됩니다. 계속하려면 답장해주세요."

Do not proceed to the next phase until the user explicitly replies. If the user chooses to stop, keep the worktree intact for inspection.

> **BLOCK handling is automatic.** When the stop-gate returns BLOCK, the hook injects a `[plan-runner workflow directive]` into the feedback. Follow that directive — it tells you to re-dispatch the same phase agent with the BLOCK reason. Do NOT fix the code yourself in the main session.

### Step 4. Developer review gate (browser)

After all plan phases complete, invoke the `dev-review` skill to collect explicit per-card reviewer approval before cleaning up the worktree. This gate always runs; the merge decision in Step 5 is only reached when every card is `approved` or `out-of-scope`. The worktree MUST stay alive through every rework round so phase agents can keep committing into it.

Dispatch the skill with the runtime's skill invocation (or `Agent(subagent_type: "general-purpose", ...)` wrapping the `dev-review` skill) and pass:

- `task_slug` — plan folder name
- `plan_path` — `plans/{task-name}/plan.md`
- `worktree_path` — absolute path to the worktree
- `base_branch` — `$BASE`
- `task_branch` — `$TASK_BRANCH`
- `review_iteration` — `1` for the first gate entry, `N+1` for each re-entry after rework

The skill will generate `plans/{task-name}/dev-review/`, print the server command + URL, and end its turn so the user can review in the browser and say `리뷰 완료`.

On user `리뷰 완료`, re-enter the skill; it reads `feedback.json` and returns a terminal summary:

- `result = "approved"` → proceed to Step 5.
- `result = "rework"` → for each item in `rework_items[]`, dispatch `Agent(subagent_type: item.dispatch_agent, ...)` with a prompt shaped like:

  ```
  ## Working directory
  You are working in: {worktree_path}
  cd to this directory before starting any work.

  ## Context
  You are revising prior work based on reviewer feedback. The code already exists
  in this worktree; build on it, do not redo prior commits.

  ## Feedback
  - Card: {item.card_id}
  - Target: {item.target.file}:{item.target.lines}
  - Comment: "{item.comment}"

  ## Instructions
  Apply the feedback. Commit with Conventional Commits and include a 1~2 line body
  explaining WHY (not what). Do NOT touch unrelated files. Do NOT rebase or amend
  existing commits.
  ```

  Rework items may be dispatched sequentially (safe default) or in parallel when they touch disjoint files. After all rework agents have committed, re-invoke `dev-review` with `review_iteration += 1` and loop.

- `result = "qa_required"` → answer the questions in chat, then re-invoke `dev-review` with the same `review_iteration` (the skill clears the relevant cards) and ask the user to re-review in the browser.

Do not advance past this gate on anything except `result = "approved"`. Do not remove the worktree, do not merge, do not ask about merge until approval.

### Step 5. Clean up worktree and ask user

After Step 4 returns `result = "approved"`, the task branch has all phase commits and any rework commits from review rounds. Remove the worktree but **stay on the base branch**. Then ask the user whether to merge:

```bash
# 1. Remove worktree (frees the branch)
git worktree remove "$WORKTREE_DIR" --force

# 2. HEAD stays on $BASE — do NOT checkout $TASK_BRANCH
# Verify HEAD is still on base
git rev-parse --abbrev-ref HEAD  # should be $BASE
```

After cleanup, output the following as **plain text** and let your turn end naturally. Do NOT use `AskUserQuestion`:

- Summary of all phase commits: `git log --oneline $BASE..$TASK_BRANCH`
- Changed files: `git diff --stat $BASE..$TASK_BRANCH`
- Options the user can choose:
  - "base 브랜치($BASE)에 병합" → `git merge $TASK_BRANCH --no-ff -m "merge: $TASK_BRANCH into $BASE"` then `git branch -d $TASK_BRANCH`
  - "PR 생성" → leave the task branch for PR creation
  - "나중에 처리" → leave the task branch, do nothing

Do not merge, checkout, or delete the task branch without explicit user approval. HEAD must remain on $BASE at all times.

### Step 6. Verify completion

```bash
# Worktree should be gone
git worktree list --porcelain

# HEAD should still be on the base branch
git rev-parse --abbrev-ref HEAD  # should be $BASE

# Task branch should contain all phase commits
git log --oneline "$BASE".."$TASK_BRANCH"
```

---

## Error recovery

### Stale worktree from previous run

Handled in Step 2 — if the worktree directory already exists, existing commits and uncommitted changes are reported as plain text and the turn ends. The user chooses to clean up and restart, resume from existing state, or abort. Previous work is never destroyed without explicit user consent.

### Phase agent failure

If a phase agent fails or produces no work:
1. Check `git -C "$WORKTREE_DIR" status` for partial changes
2. Decide: retry the phase, skip it, or stop execution
3. The worktree remains intact for inspection

### Post-completion

After Step 5, HEAD is still on the base branch. The task branch exists with all phase commits. Depending on the user's choice:
1. If merged → task branch is deleted, all commits are on the base branch
2. If PR → task branch remains for PR creation
3. If deferred → task branch remains, user can merge later

---

## Validation commands

```bash
# Check plan headers and Phase Index table
rg -n "^\*\*Branch:\*\*" <plan-path>
rg -n "^\| # \| Phase \| Agent" <plan-path>

# Check phase files exist
ls <plan-dir>/phases/

# Inspect worktree state
git worktree list --porcelain

# Clean up stale worktrees
git worktree prune -n -v

# Verify HEAD hasn't drifted
git rev-parse --abbrev-ref HEAD
```

---

## Guardrails

1. Never pass `isolation: "worktree"` to Agent — it doesn't support nested Agent calls, making phase-level specialization impossible.
2. Never call `EnterWorktree` — it lacks mid-session exit, making merge impossible.
3. Never run plan-runner from inside `worktrees/**` — always from repository root.
4. Never delete task branches — the user decides when to merge and clean up.
5. Always verify phase commits and branch before starting the next phase.
6. Always remove the worktree before asking the user about merge. Never checkout the task branch — HEAD must stay on the base branch.
7. Never reinterpret one request as multiple plan files or extra workstreams.
8. Never bypass Step 4 developer review. The worktree stays alive until dev-review returns `approved`; rework commits and question-answer cycles both happen inside that gate.
9. Never re-dispatch rework commits to a different `dispatch_agent` than the reviewer selected in the UI. The reviewer's choice is authoritative.

</Instructions>
</Skill_Guide>
