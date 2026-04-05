---
name: planner-lite
description: Deterministic plan orchestrator with per-task worktree isolation, sequential phase commits, and per-phase user approval. Use when executing a finalized single `plan.md` whose phases must run in order. Waits for user confirmation after each phase, and after all phases complete asks user whether to merge — HEAD always stays on the base branch.
model: opus
---

<Skill_Guide>
<Purpose>
Execute plan.md artifacts with task-level worktree isolation and sequential phase commits. Each task gets one worktree for its entire lifecycle — phases commit sequentially within it, and after completion the worktree is cleaned up. HEAD always remains on the base branch; the user is asked whether to merge the task branch.
</Purpose>

<Instructions>
# planner-lite

Orchestrate plan.md execution with task-level worktree isolation and commit-based phase progression.

---

## Why this workflow matters

`Agent(isolation: "worktree")` doesn't support nested Agent calls inside the worktree, so phase-level agent specialization is impossible with it. Using it when planner-lite is already in a worktree also causes nesting (`worktrees/A/worktrees/B`). And `EnterWorktree` has no mid-session exit, making post-work merge impossible.

This skill uses manual `git worktree` management: one worktree per task, phase agents commit sequentially within it, and after completion the worktree is removed while HEAD stays on the base branch. The user is then asked whether to merge. This gives full control over the worktree lifecycle while supporting different specialized agents per phase in a strict sequential workflow.

---

## Inputs

1. Plan file path (`plans/{task-name}/plan.md`)
2. Plan headers:
    - `**Branch:** {task-branch}` — the name for this task's worktree and branch
3. Phase/task blocks with `- owner_agent: \`{agent-name}\``

---

## Core rules

1. planner-lite runs in the main conversation context (no agent binding).
2. The main context HEAD stays on the base branch at all times — during and after execution. Never checkout the task branch automatically.
3. Task branches are created via `git worktree add -b` (one per task, not per phase).
4. Phase agents are dispatched via `Agent` without `isolation: "worktree"` — they work directly in the worktree directory.
5. Each phase ends with a commit. After the final phase, planner-lite removes the worktree and asks the user whether to merge — it never checks out the task branch.
6. planner-lite runs from the repository root, never from inside `worktrees/**`.

---

## Branch model

```
X (base branch — HEAD stays here during execution)
│
└── git worktree add -b task-A worktrees/task-A X
    ├── commit: docs(plan): add plan and test contracts for task-A  ← plan + materialized tests (auto)
    ├── commit: feat(auth): implement JWT-based login
    ├── commit: feat(auth): add token refresh middleware
    └── commit: test(auth): add integration tests for login flow
    → worktree remove → ask user: merge into X? (HEAD stays on X)
```

- **Base branch (X):** Where HEAD is when planner-lite starts. HEAD stays here throughout the entire lifecycle — during and after execution.
- **Task branch:** Created by `git worktree add -b`. All phase commits accumulate on this branch inside the worktree. After completion, the worktree is removed and the user decides whether to merge.

---

## Execution workflow

### Step 1. Validate

- Ensure `**Branch:**` header exists in the plan file.
- Ensure each phase block includes `- owner_agent: \`{agent-name}\``.
- Ensure every `owner_agent` maps to an existing agent in `agents/{owner_agent}.md`.
- Ensure current working directory is the repository root (not inside `worktrees/**`).
- If validation fails → stop immediately.

### Step 2. Set up

```bash
# Record the base branch
BASE=$(git rev-parse --abbrev-ref HEAD)

# Read task branch name from plan header
TASK_BRANCH="{value from **Branch:**}"
WORKTREE_DIR="worktrees/${TASK_BRANCH}"

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

After creating the worktree, copy plan artifacts and materialized test files into it and commit as the first commit on the task branch. This ensures the plan and its test contracts are included when the task branch is merged.

```bash
# Copy the plan file (preserve directory structure)
PLAN_DIR="plans/{task-name}"
PLAN_PATH="$PLAN_DIR/plan.md"
mkdir -p "$WORKTREE_DIR/$PLAN_DIR"
cp "$PLAN_PATH" "$WORKTREE_DIR/$PLAN_PATH"

# Copy materialize.md if it exists
MATERIALIZE_PATH="$PLAN_DIR/materialize.md"
if [ -f "$MATERIALIZE_PATH" ]; then
  cp "$MATERIALIZE_PATH" "$WORKTREE_DIR/$MATERIALIZE_PATH"
fi
```

Then check if `materialize.md` exists adjacent to the plan. If it does, parse its target file entries and copy each test file into the worktree. `materialize.md` lists test files in its `target file` column — extract the paths and copy them while preserving directory structure:

```bash
# Copy materialized test files into worktree
if [ -f "$MATERIALIZE_PATH" ]; then
  # Extract target file paths from materialize.md table rows
  # (lines containing .test. or .spec. with a file path)
  grep -oP '(?<=\| )[^\|]+\.(?:test|spec)\.[^\|\s]+' "$MATERIALIZE_PATH" | while read -r TEST_FILE; do
    TEST_FILE=$(echo "$TEST_FILE" | xargs)  # trim whitespace
    if [ -f "$TEST_FILE" ]; then
      mkdir -p "$WORKTREE_DIR/$(dirname "$TEST_FILE")"
      cp "$TEST_FILE" "$WORKTREE_DIR/$TEST_FILE"
    fi
  done
fi

# Commit plan + test contracts as the first commit
git -C "$WORKTREE_DIR" add -A
git -C "$WORKTREE_DIR" commit -m "docs(plan): add plan and test contracts for {task-name}"
```

After this step, HEAD is still on `$BASE` in the main repo. The worktree has its own checkout of `$TASK_BRANCH` with the plan and materialized test files as the first commit.

### Step 3. Execute phases

For each phase in plan order:

#### 3a. Dispatch agent

Call the Agent tool without `isolation: "worktree"`. The agent is told to work in the worktree directory:

```
Agent(
  subagent_type: "{owner_agent}",
  prompt: "
    ## Working directory
    You are working in: {repo_root}/{WORKTREE_DIR}
    cd to this directory before starting any work.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Only implement Phase {N} work described below. Do NOT redo prior phases.
    - Commit your work when done using Conventional Commits format with phase tag:
      git add -A && git commit -m '{type}({scope}): {description} [Phase {N}]'
      Types: feat, fix, refactor, test, docs, chore, style, perf, ci, build
      Scope: the module or area you changed (e.g., auth, api, ui, db)
      Description: concise summary of what you did, in imperative mood
      [Phase {N}]: MUST include — the stop-gate reviewer uses this to identify the current phase
      Example: feat(auth): implement JWT-based login [Phase 2]

    ## Task
    {phase content}
  ",
  description: "Phase {N}: {short summary}"
)
```

#### 3b. Verify phase work

After the agent completes, verify from the repo root:

```bash
# 1. Check the agent committed to the correct branch
CURRENT_BRANCH=$(git -C "$WORKTREE_DIR" rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$TASK_BRANCH" ]; then
  echo "ERROR: Agent switched branches. Expected $TASK_BRANCH, got $CURRENT_BRANCH"
  # Stop execution
fi

# 2. Check for uncommitted changes and commit if needed
# Use Conventional Commits with phase tag: {type}({scope}): {description} [Phase {N}]
# Infer type from the phase content (feat/fix/refactor/test/docs/chore/style/perf/ci/build)
if [ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]; then
  git -C "$WORKTREE_DIR" add -A
  git -C "$WORKTREE_DIR" commit -m "{type}({scope}): {description from phase content} [Phase {N}]"
fi

# 3. Confirm latest commit
git -C "$WORKTREE_DIR" log --oneline -1
```

If verification fails → stop execution and report the error. Do not proceed to the next phase.

#### 3c. End turn for stop-gate review

After verification passes, output the following as **plain text** and let your turn end naturally. Do NOT use `AskUserQuestion` — just output text so that your turn ends with `end_turn`, which triggers the Stop hook to review the worktree commits automatically.

Report:
- What was completed in this phase (changed files, commit summary)
- Validation results
- "Phase {N} 완료. Stop-gate review가 실행됩니다. 계속하려면 답장해주세요."

Do not proceed to the next phase until the user explicitly replies. If the user chooses to stop, keep the worktree intact for inspection — do not clean up.

#### 3d. Handle stop-gate BLOCK

If the stop-gate review returns a BLOCK, re-dispatch the **same phase agent** with the BLOCK feedback. Do NOT fix the code yourself in the main context.

```
Agent(
  subagent_type: "{owner_agent}",
  prompt: "
    ## Working directory
    You are working in: {repo_root}/{WORKTREE_DIR}
    cd to this directory before starting any work.

    ## Stop-gate review feedback
    Your previous commit was BLOCKED by the stop-gate reviewer:
    {BLOCK reason}

    ## Rules
    - Fix the issues described in the review feedback above.
    - Do NOT rewrite unrelated code — only address the feedback.
    - Commit your fix using Conventional Commits with phase tag:
      git add -A && git commit -m '{type}({scope}): {description} [Phase {N}]'
      Example: fix(auth): add token expiry validation [Phase 2]

    ## Original task (for reference)
    {phase content}
  ",
  description: "Phase {N} fix: {short BLOCK reason}"
)
```

After the fix agent completes, run the same verification steps (3b) and end turn (3c) to trigger another stop-gate review. Repeat until ALLOW.

### Step 4. Clean up worktree and ask user

After all phases complete, the task branch has all phase commits. Remove the worktree but **stay on the base branch**. Then ask the user whether to merge:

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

### Step 5. Verify completion

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

After Step 4, HEAD is still on the base branch. The task branch exists with all phase commits. Depending on the user's choice:
1. If merged → task branch is deleted, all commits are on the base branch
2. If PR → task branch remains for PR creation
3. If deferred → task branch remains, user can merge later

---

## Validation commands

```bash
# Check plan headers
rg -n "^\*\*Branch:\*\*" <plan-path>
rg -n "owner_agent:" <plan-path>

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
3. Never run planner-lite from inside `worktrees/**` — always from repository root.
4. Never delete task branches — the user decides when to merge and clean up.
5. Always verify phase commits and branch before starting the next phase.
6. Always remove the worktree before asking the user about merge. Never checkout the task branch — HEAD must stay on the base branch.
7. Never reinterpret one request as multiple plan files or extra workstreams.

</Instructions>
</Skill_Guide>
