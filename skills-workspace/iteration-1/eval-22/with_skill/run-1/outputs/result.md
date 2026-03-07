# Planner-Lite Skill Simulation: auth-feature Plan

## Overview

This document records a simulated execution of the `planner-lite` skill against a hypothetical plan at `.claude/try-claude/plans/auth-feature/plan.md` with worktree isolation.

**Note:** The plan file does not exist in the repository. This simulation walks through exactly what the skill would do, step by step, using a representative auth-feature plan structure and the agents available in the repo (`backend-developer`, `frontend-developer`, etc.).

---

## Assumed Plan Structure

For simulation purposes, the following plan was assumed:

```markdown
**Branch:** auth-feature

## Phase 1 - Backend auth scaffolding
- owner_agent: `backend-developer`
- Create auth middleware, JWT token utilities, login/register routes

## Phase 2 - Frontend auth UI
- owner_agent: `frontend-developer`
- Create login/register pages, auth context, protected route wrapper

## Phase 3 - Documentation update
- owner_agent: `doc-updater`
- Update project docs to reflect new auth endpoints and usage
```

---

## Simulated Execution

### Step 1: Validate

| Check | Result |
|---|---|
| `**Branch:**` header exists | PASS (value: `auth-feature`) |
| Each phase has `owner_agent` | PASS (3 phases, 3 agents) |
| All owner_agents map to existing agents | PASS (`backend-developer.md`, `frontend-developer.md`, `doc-updater.md` all exist in `agents/`) |
| CWD is repo root (not inside `.claude/worktrees/`) | PASS |

**Tool calls:** 1x Read (plan file), 1x Glob (verify agent files), 1x Bash (pwd check)

---

### Step 2: Set Up Worktree

Commands that would execute:

```bash
BASE=$(git rev-parse --abbrev-ref HEAD)   # -> "0.1.0"
TASK_BRANCH="auth-feature"
WORKTREE_DIR=".claude/worktrees/auth-feature"

# Check for stale worktree
git worktree list --porcelain | grep -q "$WORKTREE_DIR"
# (none found — skip cleanup)

# Create worktree
git worktree add -b "auth-feature" ".claude/worktrees/auth-feature" "0.1.0"
```

**Outcome:** New worktree at `.claude/worktrees/auth-feature` on branch `auth-feature`, forked from `0.1.0`. Main repo HEAD remains on `0.1.0`.

**Tool calls:** 3x Bash (rev-parse, worktree list check, worktree add)

---

### Step 3: Execute Phases

#### Phase 1 — Backend auth scaffolding (`backend-developer`)

**Dispatch:** Agent tool called with:
- `subagent_type: "backend-developer"`
- Working directory: `{repo_root}/.claude/worktrees/auth-feature`
- Instructions: implement auth middleware, JWT utils, login/register routes
- No `isolation: "worktree"` (per guardrail)

**Verify phase work:**
```bash
git -C ".claude/worktrees/auth-feature" rev-parse --abbrev-ref HEAD
# -> "auth-feature" (correct)
git -C ".claude/worktrees/auth-feature" status --porcelain
# -> (empty — agent committed)
git -C ".claude/worktrees/auth-feature" log --oneline -1
# -> "abc1234 Phase 1: Backend auth scaffolding"
```

**Tool calls:** 1x Agent, 3x Bash (branch check, status check, log verify)

---

#### Phase 2 — Frontend auth UI (`frontend-developer`)

**Dispatch:** Agent tool called with:
- `subagent_type: "frontend-developer"`
- Working directory: `{repo_root}/.claude/worktrees/auth-feature`
- Instructions: create login/register pages, auth context, protected routes
- Explicit instruction: "Only implement Phase 2. Do NOT redo Phase 1."

**Verify phase work:**
```bash
git -C ".claude/worktrees/auth-feature" rev-parse --abbrev-ref HEAD
# -> "auth-feature" (correct)
git -C ".claude/worktrees/auth-feature" status --porcelain
# -> (empty — agent committed)
git -C ".claude/worktrees/auth-feature" log --oneline -1
# -> "def5678 Phase 2: Frontend auth UI"
```

**Tool calls:** 1x Agent, 3x Bash

---

#### Phase 3 — Documentation update (`doc-updater`)

**Dispatch:** Agent tool called with:
- `subagent_type: "doc-updater"`
- Working directory: `{repo_root}/.claude/worktrees/auth-feature`
- Instructions: update docs for new auth endpoints and usage

**Verify phase work:**
```bash
git -C ".claude/worktrees/auth-feature" rev-parse --abbrev-ref HEAD
# -> "auth-feature" (correct)
git -C ".claude/worktrees/auth-feature" status --porcelain
# -> (empty — agent committed)
git -C ".claude/worktrees/auth-feature" log --oneline -1
# -> "ghi9012 Phase 3: Documentation update"
```

**Tool calls:** 1x Agent, 3x Bash

---

### Step 4: Merge

```bash
# Remove worktree (frees branch for merge)
git worktree remove ".claude/worktrees/auth-feature" --force

# Merge task branch into base
git merge "auth-feature" --no-ff -m "Merge auth-feature: JWT auth with login/register, frontend UI, and docs"

# Clean up task branch
git branch -d "auth-feature"
```

**Outcome:** All 3 phase commits merged into `0.1.0` via a no-fast-forward merge commit. Task branch deleted.

**Tool calls:** 3x Bash (worktree remove, merge, branch delete)

---

### Step 5: Verify Completion

```bash
git worktree list --porcelain       # No auth-feature worktree
git rev-parse --abbrev-ref HEAD     # -> "0.1.0"
git branch --list "auth-feature"    # -> (empty)
```

**Outcome:** All clean. HEAD on `0.1.0`, no stale worktrees, no leftover branches.

**Tool calls:** 3x Bash

---

## Summary

| Metric | Value |
|---|---|
| Phases executed | 3 |
| Agents dispatched | 3 (`backend-developer`, `frontend-developer`, `doc-updater`) |
| Commits on task branch | 3 (one per phase) |
| Merge strategy | `--no-ff` into base branch `0.1.0` |
| Worktree isolation | Yes (`.claude/worktrees/auth-feature`) |
| Guardrails respected | No `isolation: "worktree"` in Agent calls, no `EnterWorktree`, no nested worktrees |

## Key Observations

1. **The plan file did not exist** at the specified path. In a real execution, the skill would fail at Step 1 (Validate) and stop immediately.
2. **The skill design is sound** for sequential multi-phase work: one worktree per task, phase agents commit sequentially, worktree removed before merge.
3. **Available agents** in the repo (`backend-developer`, `frontend-developer`, `doc-updater`) align well with the assumed auth-feature phases.
4. **Total simulated tool calls: 22** (1 Read + 1 Glob + 3 Agent + 17 Bash). See `metrics.json` for breakdown.
