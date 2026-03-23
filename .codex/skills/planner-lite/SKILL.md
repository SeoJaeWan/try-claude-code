---
name: planner-lite
description: Deterministic plan orchestrator with per-task worktree isolation, sequential phase commits, per-phase user approval, and task branch checkout. Use when executing plan.md artifacts that coordinate multiple agents across sequential or parallel phases. Waits for user confirmation after each phase, and after all phases complete checks out the task branch — does not merge automatically.
---

<Skill_Guide>
<Purpose>
Execute plan.md artifacts with task-level worktree isolation and sequential phase commits. Each task gets one worktree for its entire lifecycle — phases commit sequentially within it, and after completion the worktree is cleaned up and the task branch is checked out for review. No automatic merge is performed.
</Purpose>

<Instructions>
# planner-lite

Orchestrate plan.md execution with task-level worktree isolation and commit-based phase progression.

---

## Why this workflow matters

`Agent(isolation: "worktree")` doesn't support nested Agent calls inside the worktree, so phase-level agent specialization is impossible with it. Using it when planner-lite is already in a worktree also causes nesting (`worktrees/A/worktrees/B`). And `EnterWorktree` has no mid-session exit, making post-work merge impossible.

This skill uses manual `git worktree` management: one worktree per task, phase agents commit sequentially within it, and the task branch is checked out after completion for user review. This gives full control over the worktree lifecycle while supporting different specialized agents per phase.

---

## Inputs

1. Plan file path (`plans/{task-name}/plan.md` or `plans/{task-name}/plan-{track}.md`)
2. Plan headers:
    - `**Branch:** {task-branch}` — the name for this task's worktree and branch
3. Phase/task blocks with `- owner_agent: \`{agent-name}\``

---

## Core rules

1. planner-lite runs in the main conversation context (no agent binding).
2. The main context HEAD stays on the base branch during phase execution, then switches to the task branch after completion.
3. Task branches are created via `git worktree add -b` (one per task, not per phase).
4. Phase agents are dispatched via `Agent` without `isolation: "worktree"` — they work directly in the worktree directory.
5. Each phase ends with a commit. After the final phase, planner-lite checks out the task branch (no merge).
6. planner-lite runs from the repository root, never from inside `worktrees/**`.

---

## Branch model

```
X (base branch — HEAD stays here during execution)
│
└── git worktree add -b task-A worktrees/task-A X
    ├── commit: feat(auth): implement JWT-based login
    ├── commit: feat(auth): add token refresh middleware
    └── commit: test(auth): add integration tests for login flow
    → worktree remove → checkout task-A (ready for review/PR)
```

- **Base branch (X):** Where HEAD is when planner-lite starts. It stays here during phase execution.
- **Task branch:** Created by `git worktree add -b`. All phase commits accumulate on this branch inside the worktree. After completion, HEAD switches to this branch.

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

# Clean up stale worktree if it exists from a previous failed run
if git worktree list --porcelain | grep -q "$WORKTREE_DIR"; then
  git worktree remove "$WORKTREE_DIR" --force
  git branch -D "$TASK_BRANCH" 2>/dev/null
fi

# Create worktree with a new branch based on the base
git worktree add -b "$TASK_BRANCH" "$WORKTREE_DIR" "$BASE"
```

After this step, HEAD is still on `$BASE` in the main repo. The worktree has its own checkout of `$TASK_BRANCH`.

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
    - Commit your work when done using Conventional Commits format:
      git add -A && git commit -m '{type}({scope}): {description}'
      Types: feat, fix, refactor, test, docs, chore, style, perf, ci, build
      Scope: the module or area you changed (e.g., auth, api, ui, db)
      Description: concise summary of what you did, in imperative mood
      Example: feat(auth): implement JWT-based login

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
# Use Conventional Commits: {type}({scope}): {description}
# Infer type from the phase content (feat/fix/refactor/test/docs/chore/style/perf/ci/build)
if [ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]; then
  git -C "$WORKTREE_DIR" add -A
  git -C "$WORKTREE_DIR" commit -m "{type}({scope}): {description from phase content}"
fi

# 3. Confirm latest commit
git -C "$WORKTREE_DIR" log --oneline -1
```

If verification fails → stop execution and report the error. Do not proceed to the next phase.

#### 3c. Wait for user approval

After verification passes, report the phase results to the user and wait for approval before continuing. Use `AskUserQuestion` to present:

- What was completed in this phase (changed files, commit summary)
- Validation results
- Options: "다음 phase 진행" / "중단"

Do not proceed to the next phase until the user explicitly approves. If the user chooses to stop, keep the worktree intact for inspection — do not clean up.

### Step 4. Checkout task branch

After all phases complete, the task branch has all phase commits. Remove the worktree and switch to the task branch so the user can review, test, and decide when to merge:

```bash
# 1. Remove worktree (frees the branch)
git worktree remove "$WORKTREE_DIR" --force

# 2. Checkout the task branch (do NOT merge)
git checkout "$TASK_BRANCH"
```

Do not merge into the base branch. Do not delete the task branch. The user will decide when and how to merge (e.g., via PR or manual merge).

### Step 5. Verify completion

```bash
# Worktree should be gone
git worktree list --porcelain

# HEAD should be on the task branch
git rev-parse --abbrev-ref HEAD  # should be $TASK_BRANCH

# Task branch should contain all phase commits
git log --oneline "$BASE".."$TASK_BRANCH"
```

---

## Error recovery

### Stale worktree from previous run

Handled in Step 2 — if the worktree directory already exists, it's force-removed before recreation.

### Phase agent failure

If a phase agent fails or produces no work:
1. Check `git -C "$WORKTREE_DIR" status` for partial changes
2. Decide: retry the phase, skip it, or stop execution
3. The worktree remains intact for inspection

### Post-completion

After Step 4, HEAD is on the task branch with all phase commits. The user can:
1. Review changes: `git log --oneline $BASE..$TASK_BRANCH`
2. Create a PR, or merge manually when ready
3. Return to base: `git checkout $BASE`

---

## Parallel execution

When running multiple tasks (A, B, C) in parallel from the same base branch X, each task runs in a **separate planner-lite session**.

### How it works

Each session independently:
1. Reads its own plan's `**Branch:**` value
2. Creates its own worktree from the shared base branch X
3. Dispatches phase agents to its own worktree
4. Checks out its own task branch after completion (no merge)

| Session 1 | Session 2 | Session 3 |
|---|---|---|
| HEAD on X | HEAD on X | HEAD on X |
| worktree: task-A from X | worktree: task-B from X | worktree: task-C from X |
| Phases → commits | Phases → commits | Phases → commits |
| Remove worktree → checkout task-A | Remove worktree → checkout task-B | Remove worktree → checkout task-C |

### Isolation guarantees

| Rule | Why |
|---|---|
| Each task has its own worktree directory | Separate directories, separate branches |
| HEAD stays on X in every session | No drift — all tasks branch from the same base |
| No `isolation: "worktree"` in Agent calls | Prevents nested worktree creation |
| Each task only commits to its own branch | No cross-contamination between parallel tasks |

### Final integration

Each session leaves HEAD on its own task branch. The user or a separate orchestrator can merge when ready:

```bash
# After all sessions complete (each on its own task branch)
git checkout X
git merge task-A --no-ff -m "Merge task A"
git merge task-B --no-ff -m "Merge task B"
git merge task-C --no-ff -m "Merge task C"
git branch -d task-A task-B task-C
```

This final integration step is outside planner-lite's scope — the user decides when to merge.

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
6. Always remove the worktree before checking out the task branch.
7. Never run two planner-lite sessions against the same `**Branch:**` value concurrently.

</Instructions>
</Skill_Guide>
