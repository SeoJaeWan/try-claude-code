---
name: planner-lite
description: Deterministic plan orchestrator with per-task worktree isolation, sequential phase commits, and final merge. Use when executing plan.md artifacts that coordinate multiple agents across sequential or parallel phases.
model: opus
---

<Skill_Guide>
<Purpose>
Execute plan.md artifacts with task-level worktree isolation, sequential phase commits, and a single final merge. Each task gets one worktree for its entire lifecycle — phases commit sequentially within it, and the worktree is cleaned up after the final merge.
</Purpose>

<Instructions>
# planner-lite

Orchestrate plan.md execution with task-level worktree isolation and commit-based phase progression.

---

## Why this workflow matters

`Agent(isolation: "worktree")` doesn't support nested Agent calls inside the worktree, so phase-level agent specialization is impossible with it. Using it when planner-lite is already in a worktree also causes nesting (`.claude/worktrees/A/.claude/worktrees/B/`). And `EnterWorktree` has no mid-session exit, making post-work merge impossible.

This skill uses manual `git worktree` management: one worktree per task, phase agents commit sequentially within it, and the worktree branch is merged once at the end. This gives full control over the worktree lifecycle while supporting different specialized agents per phase.

---

## Inputs

1. Plan file path (`.claude/try-claude/plans/{task-name}/plan.md` or `.claude/try-claude/plans/{task-name}/plan-{track}.md`)
2. Plan headers:
    - `**Branch:** {task-branch}` — the name for this task's worktree and branch
3. Phase/task blocks with `- owner_agent: \`{agent-name}\``

---

## Core rules

1. planner-lite runs in the main conversation context (no agent binding).
2. The main context HEAD stays on the base branch throughout execution.
3. Task branches are created via `git worktree add -b` (one per task, not per phase).
4. Phase agents are dispatched via `Agent` without `isolation: "worktree"` — they work directly in the worktree directory.
5. Each phase ends with a commit. Only after the final phase does planner-lite merge.
6. planner-lite runs from the repository root, never from inside `.claude/worktrees/**`.

---

## Branch model

```
X (base branch — HEAD stays here throughout)
│
└── git worktree add -b task-A .claude/worktrees/task-A X
    ├── commit: Phase 1 work
    ├── commit: Phase 2 work
    └── commit: Phase 3 work
    → worktree remove → merge task-A into X → branch cleanup
```

- **Base branch (X):** Where HEAD is when planner-lite starts. It does not move.
- **Task branch:** Created by `git worktree add -b`. All phase commits accumulate on this branch inside the worktree.

---

## Execution workflow

### Step 1. Validate

- Ensure `**Branch:**` header exists in the plan file.
- Ensure each phase block includes `- owner_agent: \`{agent-name}\``.
- Ensure every `owner_agent` maps to an existing agent in `agents/{owner_agent}.md`.
- Ensure current working directory is the repository root (not inside `.claude/worktrees/**`).
- If validation fails → stop immediately.

### Step 2. Set up

```bash
# Record the base branch
BASE=$(git rev-parse --abbrev-ref HEAD)

# Read task branch name from plan header
TASK_BRANCH="{value from **Branch:**}"
WORKTREE_DIR=".claude/worktrees/${TASK_BRANCH}"

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
    - Commit your work when done: git add -A && git commit -m 'Phase {N}: {summary}'

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
if [ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]; then
  git -C "$WORKTREE_DIR" add -A
  git -C "$WORKTREE_DIR" commit -m "Phase {N}: {short summary}"
fi

# 3. Confirm latest commit
git -C "$WORKTREE_DIR" log --oneline -1
```

If verification fails → stop execution and report the error. Do not proceed to the next phase.

### Step 4. Merge

After all phases complete, the task branch has all phase commits. A branch checked out in a worktree cannot be merged elsewhere, so the worktree must be removed first:

```bash
# 1. Remove worktree (frees the branch for merge)
git worktree remove "$WORKTREE_DIR" --force

# 2. Merge task branch into base
git merge "$TASK_BRANCH" --no-ff -m "Merge ${TASK_BRANCH}: {task summary}"

# 3. Clean up task branch
git branch -d "$TASK_BRANCH"
```

If merge conflicts occur:
- Print conflict details and stop.
- Do not delete the task branch — keep it for manual resolution.
- Run `git merge --abort` if the user wants to cancel.

### Step 5. Verify completion

```bash
# Worktree should be gone
git worktree list --porcelain

# HEAD should be on base branch
git rev-parse --abbrev-ref HEAD  # should be $BASE

# Task branch should be deleted (after successful merge)
git branch --list "$TASK_BRANCH"  # should be empty
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

### Merge conflict

If merge conflicts occur in Step 4:
1. The worktree is already removed at this point
2. The task branch still exists with all phase commits
3. Resolve conflicts manually, then run `git commit` to complete the merge
4. Clean up: `git branch -d "$TASK_BRANCH"`

---

## Parallel execution

When running multiple tasks (A, B, C) in parallel from the same base branch X, each task runs in a **separate planner-lite session**.

### How it works

Each session independently:
1. Reads its own plan's `**Branch:**` value
2. Creates its own worktree from the shared base branch X
3. Dispatches phase agents to its own worktree
4. Merges its own task branch after completion

| Session 1 | Session 2 | Session 3 |
|---|---|---|
| HEAD on X | HEAD on X | HEAD on X |
| worktree: task-A from X | worktree: task-B from X | worktree: task-C from X |
| Phases → commits | Phases → commits | Phases → commits |
| Remove worktree → merge | Remove worktree → merge | Remove worktree → merge |

### Isolation guarantees

| Rule | Why |
|---|---|
| Each task has its own worktree directory | Separate directories, separate branches |
| HEAD stays on X in every session | No drift — all tasks branch from the same base |
| No `isolation: "worktree"` in Agent calls | Prevents nested worktree creation |
| Each task only commits to its own branch | No cross-contamination between parallel tasks |

### Final integration

If sessions merge independently, later merges may conflict. For safer integration, defer merge to a single orchestrator:

```bash
# After all sessions complete (worktrees already removed by each session)
git checkout X
git merge task-A --no-ff -m "Merge task A"
git merge task-B --no-ff -m "Merge task B"
git merge task-C --no-ff -m "Merge task C"
git branch -d task-A task-B task-C
```

This final integration step is outside planner-lite's scope.

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
3. Never run planner-lite from inside `.claude/worktrees/**` — always from repository root.
4. Never delete task branches on merge failure — keep them for manual resolution.
5. Always verify phase commits and branch before starting the next phase.
6. Always remove the worktree before merging — a branch checked out in a worktree cannot be merged elsewhere.
7. Never run two planner-lite sessions against the same `**Branch:**` value concurrently.

</Instructions>
</Skill_Guide>
