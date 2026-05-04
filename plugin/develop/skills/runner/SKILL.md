---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind stop-review and dev-review. Use when executing a finalized `*.plan.md` file. Each session owns exactly one worktree and one plan; multiple plans run in independent terminals. HEAD always stays on the base branch.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single self-contained `*.plan.md` artifact with one worktree and one agent dispatch. The agent reads the plan and produces every phase commit inside that one dispatch. After it returns, stop-review evaluates the whole plan, then dev-review collects per-commit reviewer feedback. HEAD remains on the base branch; the user is asked whether to merge after dev-review approves.
</Purpose>

<Instructions>
# plan-runner

Orchestrate one plan's execution: validate header, create one worktree, dispatch one agent, gate merge behind stop-review and dev-review.

---

## Why this workflow matters

A plan is a self-contained execution context for one agent. Phase boundaries inside a plan are commit boundaries the agent itself maintains; the runner is not a phase loop. Splitting a plan into multiple `Agent(...)` dispatches would multiply cold-start cost and lose intra-plan continuity for no benefit, since reviewers evaluate the plan as a whole. This skill therefore performs **one** Agent dispatch per plan, lets the agent commit phase by phase inside that dispatch, and runs review at the end of the plan rather than between phases.

`Agent(isolation: "worktree")` is not used — it does not support nested Agent calls and prevents post-work merge. Instead, this skill manages a worktree manually with `git worktree add`, dispatches one specialized agent into it, and removes the worktree after dev-review approves.

---

## Inputs

The caller supplies the absolute or repo-relative path to a single `*.plan.md` file. The plan begins with a YAML frontmatter block:

```yaml
---
plan_slug: login-frontend
branch: feat/login-frontend
owner_agent: frontend-developer
---
```

Required header fields:

- `plan_slug` — short identifier used as Agent.description suffix and as `task_slug` for dev-review.
- `branch` — name of the task branch the worktree will create.
- `owner_agent` — `subagent_type` for the dispatch.

The plan body below the frontmatter is opaque to runner — it is forwarded to the agent verbatim via the plan file path. Runner does not parse phase tables, scenarios, or any other body content.

---

## Commit convention

All commits made by the dispatched agent follow `plugin/develop/references/commit-convention.md`. The dispatch prompt below embeds the minimal guarantees inline (allowed types, no phase identity in subject, Korean WHY-body) because subagents often cannot reach external files.

---

## Core rules

1. plan-runner runs in the main conversation context (no agent binding).
2. Main HEAD stays on the base branch at all times — during and after execution.
3. Exactly one worktree is created per plan via `git worktree add -b`. One session owns one worktree.
4. Exactly one `Agent(...)` dispatch per plan. The agent commits phase by phase inside that dispatch.
5. Phase agents are dispatched without `isolation: "worktree"` — they work directly in the manually created worktree.
6. After the agent returns, runner ends its turn so the stop-review gate can evaluate the whole plan. After dev-review approves, runner removes the worktree and asks the user about merge — it never checks out the task branch.
7. plan-runner runs from the repository root, never from inside `worktrees/**`.
8. Multiple plans run in separate terminals as independent sessions. Sessions do not coordinate — each plan goes through stop-review and dev-review on its own.

---

## Branch model

```
X (base branch — HEAD stays here during execution)
│
└── git worktree add -b feat/login-frontend worktrees/feat-login-frontend X
    ├── commit: feat(login): add login form (phase 1)
    ├── commit: feat(login): add validation rules (phase 2)
    ├── commit: test(login): add scenario coverage (phase 3)
    ├── commit: fix(login): error message visibility (rework from dev-review R1)
    └── (dev-review approved)
    → worktree remove → ask user: merge into X? (HEAD stays on X)
```

- **Base branch (X):** Where HEAD is when plan-runner starts. HEAD stays here throughout the entire lifecycle.
- **Task branch:** Created by `git worktree add -b`. All commits accumulate on this branch inside the worktree. After dev-review approval, the worktree is removed and the user decides whether to merge.

---

## Execution workflow

### Step 1. Validate

- The plan file exists and is readable.
- The plan begins with a YAML frontmatter block (`---` ... `---`).
- The frontmatter contains `plan_slug`, `branch`, and `owner_agent`. All three must be non-empty.
- Current working directory is the repository root (not inside `worktrees/**`).
- Do NOT pre-check agent existence here — the `Agent` tool validates `subagent_type` at dispatch time and fails immediately if the agent is missing.
- If validation fails → report the failure as plain text and stop.

### Step 2. Set up

```bash
# Record the base branch
BASE=$(git rev-parse --abbrev-ref HEAD)

# Read header values from the plan frontmatter
PLAN_SLUG="{value of plan_slug}"
TASK_BRANCH="{value of branch}"
OWNER_AGENT="{value of owner_agent}"
PLAN_FILE_ABS="{absolute path to the plan file}"

# Worktree path: derive from branch, replacing slashes with dashes
WORKTREE_DIR="worktrees/$(printf %s "$TASK_BRANCH" | tr '/' '-')"

# Parallel-task awareness (informational — does NOT block).
# Multiple plans intentionally run in parallel terminals; this is just a heads-up.
OTHER_WORKTREES=$(git worktree list --porcelain \
  | awk '/^worktree / && $2 != ENVIRON["PWD"]' \
  | grep -v "$WORKTREE_DIR" || true)
if [ -n "$OTHER_WORKTREES" ]; then
  echo "ℹ️  Other active worktrees detected (informational, not blocking):" >&2
  echo "$OTHER_WORKTREES" >&2
  echo "  - If these are stale from a failed run: clean up with 'git worktree remove <path>'." >&2
  echo "  - If another plan is intentionally running in another terminal: proceed." >&2
fi

# Check for stale worktree from a previous failed run
if git worktree list --porcelain | grep -q "$WORKTREE_DIR"; then
  echo "Stale worktree found: $WORKTREE_DIR"
  git -C "$WORKTREE_DIR" log --oneline "$BASE".."$TASK_BRANCH" 2>/dev/null
  git -C "$WORKTREE_DIR" status --short 2>/dev/null
  # → Report existing commits/changes as plain text and end your turn.
  #   Options:
  #   - "정리하고 새로 시작" → remove worktree + delete branch, then recreate
  #   - "기존 worktree에서 이어서 진행" → skip creation, dispatch into existing worktree
  #   - "중단" → stop execution
fi

# Create the worktree with a new branch based on the base
git worktree add -b "$TASK_BRANCH" "$WORKTREE_DIR" "$BASE"
```

The plan file stays in the main repo. The worktree branch only contains real implementation commits made by the dispatched agent.

After this step, HEAD is still on `$BASE` in the main repo. The worktree has its own checkout of `$TASK_BRANCH` with no commits beyond `$BASE` yet.

### Step 3. Dispatch the plan agent (single Agent call)

Dispatch exactly one `Agent(...)` call. The agent is responsible for reading the plan file and producing every phase commit inside its single turn.

> **Contract**: The exact shape of `description` and the leading `prompt` headers below is a contract shared with `plugin/develop/scripts/lib/contract.mjs` (regexes and builder functions) and the hook tests. Do NOT alter the `"Plan: {plan_slug}"` description form, the `"## Working directory / You are working in: ..."` block, or the `"## Your plan / Read and execute the plan at: ..."` block. If you need a new shape, update contract.mjs and the unit tests together.

```
Agent(
  subagent_type: "{owner_agent}",
  description: "Plan: {plan_slug}",
  prompt: "
    ## Working directory
    You are working in: {repo_root}/{WORKTREE_DIR}
    cd to this directory before starting any work.

    ## Your plan
    Read and execute the plan at: {PLAN_FILE_ABS}
    (This is an absolute path in the main repo, outside your worktree. Read it as-is; do not try to resolve it relative to your cwd.)
    The plan is self-contained: every spec, boundary, acceptance criterion, and validation step you need is in that file.

    ## Rules
    - Work directly in your current directory.
    - Do NOT create additional worktrees or use EnterWorktree.
    - Treat phase boundaries inside the plan as commit boundaries: complete each phase, commit, then proceed to the next.
    - Do NOT commit-amend across phases — every phase produces its own commit.
    - Only implement what the plan describes. Do NOT pull in adjacent work.

    ## Commit rules (keep these exact — the dev-review UI reads them back)
    - Format: `{type}(scope): {description}`. scope is optional; description uses imperative mood and stays within ~72 characters.
    - Allowed types: feat / fix / refactor / docs / chore / style / test.
    - Do NOT include phase identity anywhere in the commit — no \"phase 2 — ...\", no \"[Phase 2] ...\", no \"2단계: ...\". Phase metadata is tracked outside the commit message.
    - Body is **required and written in Korean**, exactly 2 lines: Line 1 = 무엇 (이 커밋이 한 변경의 핵심), Line 2 = 왜 (동기·제약·맥락 — diff만으로 드러나지 않는 정보). Do NOT prefix labels like `작업:` / `이유:` — line position alone communicates the role. Subject stays English. The body is surfaced verbatim in the dev-review UI. Self-evident changes (typo, formatting, dep bump) may use a single Korean WHAT line as an escape hatch — use sparingly.
    - Commit when each phase is done: `git add -A && git commit -m '...'` using a HEREDOC or `-m`+`-m` for the body.
    - Full spec (footer rules, examples, rationale): `plugin/develop/references/commit-convention.md`.
  ",
)
```

**Before calling `Agent(...)`, run a self-check on the dispatch:**

1. The `description` field MUST be exactly `"Plan: {plan_slug}"` (literal word "Plan", a colon, a space, the slug). Examples that pass: `"Plan: login-frontend"`, `"Plan: backend-api"`. Examples that WILL break the hook contract: `"[Plan: login]"`, `"plan: login"` (lowercase), `"Plan login"` (no colon).
2. The `prompt` MUST contain a line reading exactly `"You are working in: <absolute_worktree_path>"`. Do not rename this header, do not translate it, and do not wrap the path in quotes.
3. The `prompt` MUST contain a line reading exactly `"Read and execute the plan at: <absolute_plan_path>"`. Same rules — no translation, no quotes.
4. Both paths above MUST be absolute. The agent's cwd is the worktree, so a relative path won't resolve to the right file.

If any check fails, fix the dispatch before calling `Agent`. The exact strings above are the shared contract with `scripts/lib/contract.mjs`; drift will cause the Stop hook to lose plan context silently.

After the agent returns, output a brief report as **plain text** and let your turn end naturally. Do NOT use `AskUserQuestion` — just output text so that `end_turn` triggers the Stop hook.

Report:
- `git -C "$WORKTREE_DIR" log --oneline "$BASE".."$TASK_BRANCH"` (commits produced by the plan)
- "Plan {plan_slug} 완료. Stop-review가 실행됩니다."

> **BLOCK handling is automatic.** When the stop-gate returns BLOCK, the hook injects a `[plan-runner: Plan: {slug}]` directive into the feedback. Follow that directive — it tells you to re-dispatch the same plan agent with the BLOCK reason. Do NOT fix the code yourself in the main session.

### Step 4. Developer review gate (browser)

After stop-review passes, invoke the `dev-review` skill to collect explicit per-commit reviewer approval before cleaning up the worktree. This gate always runs; the merge decision in Step 5 is only reached when every card is `approved` or `out-of-scope`. The worktree MUST stay alive through every rework round so the plan agent (or dispatched rework agents) can keep committing into it.

Pass these inputs to dev-review:

- `task_slug` — the plan_slug
- `plan_path` — absolute path to the plan file
- `worktree_path` — absolute path to the worktree
- `base_branch` — `$BASE`
- `task_branch` — `$TASK_BRANCH`
- `review_iteration` — `1` for the first gate entry, `N+1` for each re-entry after rework

The skill will generate `plans/{plan_slug}/dev-review/`, print the server command + URL, and end its turn so the user can review in the browser and say `리뷰 완료`.

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

  ## Target commit
  - Commit: {item.short_sha} — {item.message_subject}
  - This is the commit the reviewer flagged. The follow-up commit you create
    should address every line comment listed below.

  ## Feedback (line-anchored comments on this commit)
  {for each c in item.comments}
  - {c.file}:L{c.line_start}-L{c.line_end} (side: {c.side}): "{c.body}"
  {/for}

  ## Instructions
  Apply the feedback. Do NOT touch unrelated files. Do NOT rebase or amend
  existing commits.

  ## Commit rules (keep these exact — the dev-review UI reads them back)
  - Format: `{type}(scope): {description}`. Allowed types: feat / fix / refactor / docs / chore / style / test. Imperative mood, ~72 characters or less.
  - Do NOT include phase identity in the subject or body — no "phase N", no "[Phase N]", no rework-round prefix. Phase and round metadata are tracked outside the commit message.
  - Body is **required and written in Korean**, exactly 2 lines: Line 1 = 리뷰 피드백이 요구한 변경, Line 2 = 그 변경이 피드백을 어떻게 해소하는지. Do NOT prefix labels (`작업:` / `이유:`). Subject stays English. The body is surfaced verbatim in the dev-review UI.
  - Full spec: `plugin/develop/references/commit-convention.md`.
  ```

  Rework is **per-commit**: one `rework_items[i]` covers one flagged commit and aggregates every `needs-change` line comment on it. Multiple rework items may be dispatched sequentially (safe default) or in parallel when they target different commits AND those commits' files are disjoint. The rework dispatch's description is whatever the runtime produces (it is not a `Plan:` dispatch and will not retrigger plan-context loading). After all rework agents have committed, re-invoke `dev-review` with `review_iteration += 1` and loop.

- `result = "qa_required"` → answer the questions in chat, then re-invoke `dev-review` with the same `review_iteration` (the skill expects the reviewer to reset the relevant `question` comments in the browser) and ask the user to re-review.

Do not advance past this gate on anything except `result = "approved"`. Do not remove the worktree, do not merge, do not ask about merge until approval.

### Step 5. Clean up worktree and ask user

After Step 4 returns `result = "approved"`, the task branch holds every plan commit plus any rework commits. Remove the worktree but **stay on the base branch**. Then ask the user whether to merge.

```bash
# 1. Remove worktree (frees the branch)
git worktree remove "$WORKTREE_DIR" --force

# 2. HEAD stays on $BASE — do NOT checkout $TASK_BRANCH
git rev-parse --abbrev-ref HEAD  # should be $BASE
```

After cleanup, output the following as **plain text** and let your turn end naturally. Do NOT use `AskUserQuestion`:

- Summary of all commits: `git log --oneline $BASE..$TASK_BRANCH`
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

# Task branch should contain all plan commits
git log --oneline "$BASE".."$TASK_BRANCH"
```

---

## Error recovery

### Stale worktree from previous run

Handled in Step 2 — if the worktree directory already exists, existing commits and uncommitted changes are reported as plain text and the turn ends. The user chooses to clean up and restart, resume from existing state, or abort. Previous work is never destroyed without explicit user consent.

### Plan agent failure

If the plan agent fails or commits less than the plan expects:
1. Check `git -C "$WORKTREE_DIR" status` for partial changes.
2. Report what was committed vs. what is missing as plain text.
3. Decide with the user: re-dispatch the plan agent, repair manually, or abort. The worktree stays intact for inspection.

### Post-completion

After Step 5, HEAD is still on the base branch and the task branch exists with every plan commit. Depending on the user's choice:
1. If merged → task branch is deleted, all commits are on the base branch.
2. If PR → task branch remains for PR creation.
3. If deferred → task branch remains, user can merge later.

---

## Validation commands

```bash
# Inspect plan header (first frontmatter block)
sed -n '1,/^---$/p' <plan-path> | sed -n '/^---$/,/^---$/p'

# Inspect worktree state
git worktree list --porcelain

# Clean up stale worktrees
git worktree prune -n -v

# Verify HEAD hasn't drifted
git rev-parse --abbrev-ref HEAD
```

---

## Guardrails

1. Never pass `isolation: "worktree"` to Agent — it doesn't support nested Agent calls and prevents merge.
2. Never call `EnterWorktree` — it lacks mid-session exit, making merge impossible.
3. Never run plan-runner from inside `worktrees/**` — always from repository root.
4. Never delete task branches — the user decides when to merge and clean up.
5. Always verify the plan dispatch produced commits before proceeding to stop-review.
6. Always remove the worktree before asking the user about merge. Never checkout the task branch — HEAD must stay on the base branch.
7. Never reinterpret one request as multiple plan files or extra workstreams.
8. Never bypass Step 4 developer review. The worktree stays alive until dev-review returns `approved`; rework commits and question-answer cycles both happen inside that gate.
9. Never re-dispatch rework commits to a different `dispatch_agent` than the reviewer selected in the UI. The reviewer's choice is authoritative.
10. Never split one plan across multiple Agent dispatches. One plan = one Agent call. Phase boundaries are commit boundaries inside that one dispatch.

</Instructions>
</Skill_Guide>
