# planner-lite Worktree Isolation Simulation Report

## Overview

This document simulates the complete worktree lifecycle for executing a plan.md with 3 Phases, following the `planner-lite` skill defined at `skills/planner-lite/SKILL.md`.

### Simulated Plan

Since no `plan.md` file was found in the repository, a representative 3-phase plan was constructed using the available agents (`frontend-developer`, `backend-developer`, `doc-updater`) on the current branch `0.1.0`.

```
**Branch:** feature/plan-3phase

## Phase 1 — Backend scaffolding
- owner_agent: `backend-developer`
- Create API endpoints and data models

## Phase 2 — Frontend integration
- owner_agent: `frontend-developer`
- Build UI components consuming the API

## Phase 3 — Documentation update
- owner_agent: `doc-updater`
- Update project docs to reflect new feature
```

---

## Step 1: Validate

| Check | Result | Detail |
|---|---|---|
| `**Branch:**` header exists | PASS | Value: `feature/plan-3phase` |
| Phase 1 has `owner_agent` | PASS | `backend-developer` |
| Phase 2 has `owner_agent` | PASS | `frontend-developer` |
| Phase 3 has `owner_agent` | PASS | `doc-updater` |
| Agent file `agents/backend-developer.md` exists | PASS | File found |
| Agent file `agents/frontend-developer.md` exists | PASS | File found |
| Agent file `agents/doc-updater.md` exists | PASS | File found |
| CWD is repository root (not inside `.claude/worktrees/**`) | PASS | CWD: `C:/Users/sjw73/Desktop/dev/try-claude-code` |

**Validation outcome:** All checks passed. Proceeding to setup.

---

## Step 2: Set Up

### Commands (simulated)

```bash
# 1. Record the base branch
BASE=$(git rev-parse --abbrev-ref HEAD)
# BASE = "0.1.0"

# 2. Read task branch name from plan header
TASK_BRANCH="feature/plan-3phase"
WORKTREE_DIR=".claude/worktrees/feature/plan-3phase"

# 3. Check for stale worktree (none found — clean state)
git worktree list --porcelain | grep -q "$WORKTREE_DIR"
# Result: no match, skip cleanup

# 4. Create worktree with new branch
git worktree add -b "$TASK_BRANCH" "$WORKTREE_DIR" "$BASE"
# Result: worktree created at .claude/worktrees/feature/plan-3phase
#         new branch feature/plan-3phase based on 0.1.0
```

### State after setup

| Property | Value |
|---|---|
| Main repo HEAD | `0.1.0` (unchanged) |
| Worktree directory | `.claude/worktrees/feature/plan-3phase` |
| Worktree branch | `feature/plan-3phase` |
| Worktree base commit | Same as `0.1.0` HEAD (`bfb4c77`) |

---

## Step 3: Execute Phases

### Phase 1 — Backend scaffolding

**3a. Dispatch agent**

```
Agent(
  subagent_type: "backend-developer",
  prompt: "
    ## Working directory
    You are working in: C:/Users/sjw73/Desktop/dev/try-claude-code/.claude/worktrees/feature/plan-3phase
    cd to this directory before starting any work.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Only implement Phase 1 work described below. Do NOT redo prior phases.
    - Commit your work when done: git add -A && git commit -m 'Phase 1: Backend scaffolding'

    ## Task
    Create API endpoints and data models
  ",
  description: "Phase 1: Backend scaffolding"
)
```

**3b. Verify phase work (simulated)**

```bash
# Check branch
CURRENT_BRANCH=$(git -C "$WORKTREE_DIR" rev-parse --abbrev-ref HEAD)
# Result: "feature/plan-3phase" — PASS

# Check uncommitted changes
git -C "$WORKTREE_DIR" status --porcelain
# Result: empty (agent committed) — PASS

# Confirm latest commit
git -C "$WORKTREE_DIR" log --oneline -1
# Result: "abc1234 Phase 1: Backend scaffolding"
```

**Phase 1 verification:** PASS

---

### Phase 2 — Frontend integration

**3a. Dispatch agent**

```
Agent(
  subagent_type: "frontend-developer",
  prompt: "
    ## Working directory
    You are working in: C:/Users/sjw73/Desktop/dev/try-claude-code/.claude/worktrees/feature/plan-3phase
    cd to this directory before starting any work.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Only implement Phase 2 work described below. Do NOT redo prior phases.
    - Commit your work when done: git add -A && git commit -m 'Phase 2: Frontend integration'

    ## Task
    Build UI components consuming the API
  ",
  description: "Phase 2: Frontend integration"
)
```

**3b. Verify phase work (simulated)**

```bash
CURRENT_BRANCH=$(git -C "$WORKTREE_DIR" rev-parse --abbrev-ref HEAD)
# Result: "feature/plan-3phase" — PASS

git -C "$WORKTREE_DIR" status --porcelain
# Result: empty — PASS

git -C "$WORKTREE_DIR" log --oneline -1
# Result: "def5678 Phase 2: Frontend integration"
```

**Phase 2 verification:** PASS

---

### Phase 3 — Documentation update

**3a. Dispatch agent**

```
Agent(
  subagent_type: "doc-updater",
  prompt: "
    ## Working directory
    You are working in: C:/Users/sjw73/Desktop/dev/try-claude-code/.claude/worktrees/feature/plan-3phase
    cd to this directory before starting any work.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Only implement Phase 3 work described below. Do NOT redo prior phases.
    - Commit your work when done: git add -A && git commit -m 'Phase 3: Documentation update'

    ## Task
    Update project docs to reflect new feature
  ",
  description: "Phase 3: Documentation update"
)
```

**3b. Verify phase work (simulated)**

```bash
CURRENT_BRANCH=$(git -C "$WORKTREE_DIR" rev-parse --abbrev-ref HEAD)
# Result: "feature/plan-3phase" — PASS

git -C "$WORKTREE_DIR" status --porcelain
# Result: empty — PASS

git -C "$WORKTREE_DIR" log --oneline -1
# Result: "ghi9012 Phase 3: Documentation update"
```

**Phase 3 verification:** PASS

---

## Step 4: Merge

### Worktree branch state before merge

```
feature/plan-3phase (3 commits ahead of 0.1.0):
  abc1234 Phase 1: Backend scaffolding
  def5678 Phase 2: Frontend integration
  ghi9012 Phase 3: Documentation update
```

### Commands (simulated)

```bash
# 1. Remove worktree (frees the branch for merge)
git worktree remove "$WORKTREE_DIR" --force
# Result: worktree removed

# 2. Merge task branch into base (HEAD is on 0.1.0)
git merge "feature/plan-3phase" --no-ff -m "Merge feature/plan-3phase: 3-phase plan execution"
# Result: merge commit created, no conflicts

# 3. Clean up task branch
git branch -d "feature/plan-3phase"
# Result: branch deleted
```

**Merge outcome:** SUCCESS (no conflicts)

---

## Step 5: Verify Completion

```bash
# 1. Worktree should be gone
git worktree list --porcelain
# Result: only main worktree listed — PASS

# 2. HEAD should be on base branch
git rev-parse --abbrev-ref HEAD
# Result: "0.1.0" — PASS

# 3. Task branch should be deleted
git branch --list "feature/plan-3phase"
# Result: empty — PASS
```

**Final verification:** All checks passed.

---

## Commit Graph (final state)

```
0.1.0 (HEAD)
│
├── Merge feature/plan-3phase: 3-phase plan execution
│   ├── ghi9012 Phase 3: Documentation update
│   ├── def5678 Phase 2: Frontend integration
│   └── abc1234 Phase 1: Backend scaffolding
│
└── bfb4c77 docs: remove github mcp references from help-try FAQ (previous HEAD)
```

---

## Guardrails Compliance

| Guardrail | Respected |
|---|---|
| No `isolation: "worktree"` passed to Agent | Yes |
| No `EnterWorktree` used | Yes |
| planner-lite never ran from inside `.claude/worktrees/**` | Yes |
| Task branch preserved on merge failure (N/A — no failure) | N/A |
| Phase commits verified before proceeding | Yes (3/3) |
| Worktree removed before merge | Yes |
| No concurrent sessions on same branch | Yes (single session) |

---

## Summary

The planner-lite worktree isolation workflow was simulated end-to-end for a 3-phase plan. Each phase was dispatched to a specialized agent working within a single shared worktree directory. Phases committed sequentially to the task branch. After all 3 phases completed, the worktree was removed, the task branch was merged with `--no-ff` into the base branch `0.1.0`, and the task branch was cleaned up. All 5 steps (validate, setup, execute, merge, verify) completed successfully.
