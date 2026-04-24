---
name: dev-review
description: "Browser-based developer review gate for runner-executed tasks. Triggered after runner finishes all phase commits and QA verification, before the merge/PR/later decision. Generates a commit-based review package (Overview preview → per-commit cards → Final preview) served over localhost, collects per-card status/comment/dispatch_agent feedback from the reviewer, and routes non-approved feedback back into the runner's worktree as rework, Q&A, or out-of-scope records. Invoke when runner reaches Step 3.7, when the user says '리뷰 완료', when re-running developer review after a rework round, or when the user asks '개발 리뷰', 'dev review', or 'runner 리뷰'."
model: sonnet
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

<Skill_Guide>
<Purpose>
Collect explicit developer review of code changes produced by `runner` before the merge decision. The reviewer sees a browser stepper that walks Overview → per-commit cards → Final, leaves per-card feedback (approved / needs-change / question / out-of-scope) with an optional `dispatch_agent` selection, and the runner turns non-approved cards into another rework round inside the same worktree. The review package is regenerated each round so previously-approved cards are preserved and newly-added commits appear as new steps.
</Purpose>

<Instructions>

# dev-review

A developer review gate owned by the runner. The skill itself does not modify production code — it generates review artifacts, serves the UI, reads back feedback, and tells the runner what to do next.

This skill mirrors `.codex/skills/orchestrator` developer review, but reviews **implementation** (already-committed code) instead of **planning** (a plan.md proposal). The two are intentionally different UIs: planning review explains intent, implementation review exposes what the code actually does.

## When runner invokes this skill

The runner calls dev-review at its Step 3.7, after Step 3.5 QA verification and before Step 4 merge/PR/later. The worktree at `worktrees/{task-branch}` is still present and contains all phase commits plus (optionally) a QA commit.

Runner should invoke dev-review again after each rework round: when a `needs-change` card triggers re-dispatch, the re-dispatched agent writes new commits into the same worktree, and then dev-review regenerates the package against the new `task_head_sha`.

## Inputs from the caller

The runner passes a handoff packet containing:

- `task_slug` — plan folder name under `plans/`
- `plan_path` — `plans/{task_slug}/plan.md`
- `worktree_path` — absolute path, usually `worktrees/{task_branch}`
- `base_branch` — branch the runner started on (HEAD stays here)
- `task_branch` — branch name inside the worktree
- `qa_report_path` — `plans/{task_slug}/qa/report.md` when Step 3.5 ran, otherwise null
- `review_iteration` — 1 on first call, N+1 on each re-entry

The skill infers `task_head_sha` from the worktree, derives `plan_signature` from plan artifacts, and reads prior `feedback.json` / `review-history.json` when they exist for the same `task_slug`.

## Artifacts the skill owns

All artifacts live under `plans/{task_slug}/dev-review/`:

```text
plans/{task_slug}/dev-review/
├── index.html              # copied from assets/
├── review-data.json        # read by the browser, regenerated each round
├── feedback.json           # written by the server as the reviewer clicks
├── review-history.json     # append-only record of prior rounds
└── assets/
    ├── diffs/              # raw-diff .diff files keyed by short_sha
    └── vendor/             # highlight.js bundle
```

## Workflow

### Step 0. Validate prerequisites

- `plan_path` exists and `worktree_path` contains the `task_branch` checked out.
- `task_head_sha = git -C {worktree_path} rev-parse HEAD`.
- There is at least one commit in `base_branch..task_head_sha`. An empty commit range is a caller bug — stop and report.
- `.codex/tools/developer-review-server.mjs` exists. If missing, stop and report the blocker (the skill reuses this generic static server from the orchestrator tooling).
- `assets/index.html` and `assets/vendor/highlight.min.js` under this skill directory are readable.

If validation fails, do not write partial artifacts. Report the exact blocker so the runner can surface it to the user.

### Step 1. Run the deterministic generator

Call the helper script with absolute paths:

```bash
node {CLAUDE_PLUGIN_ROOT}/develop/skills/dev-review/scripts/generate-review-data.mjs \
  --task-slug "{task_slug}" \
  --plan-path "{plan_path}" \
  --worktree "{worktree_path}" \
  --base "{base_branch}" \
  --task-branch "{task_branch}" \
  --qa-report "{qa_report_path_or_empty}" \
  --iteration {review_iteration} \
  --out "plans/{task_slug}/dev-review/review-data.partial.json"
```

The helper populates every field that can be derived from git, the plan file, the QA report, and prior review artifacts. It also emits fallback cards (one per commit with at least a file-count summary) so Step 2 has a valid shape to merge into even on full interpretation failure.

Helper failure is fatal — the runner cannot continue without deterministic data. Propagate the exit code.

See `references/helper-contract.md` for the full input/output contract.

### Step 2. Run the interpretation agent

Dispatch a generic planning-style sub-agent with the generator's partial JSON as context. The agent's job is to add human-readable interpretation, not to discover new facts.

```
Agent(
  subagent_type: "general-purpose",
  description: "dev-review interpretation for {task_slug} round {review_iteration}",
  prompt: "
    You are adding interpretation to a pre-built dev-review JSON. The deterministic
    generator already collected every commit, file, diff hunk, and plan excerpt.
    Your only job is to layer semantic labels on top.

    ## Inputs
    - partial JSON path: plans/{task_slug}/dev-review/review-data.partial.json
    - plan: {plan_path}
    - worktree: {worktree_path}

    ## Tasks
    For each commit in `commits[]`:
    - Produce `cards[]` (title, description, evidence[]) grouping meaningful change
      units. Evidence `file` + `lines` must exist in that commit's actual diff —
      the generator's `files_changed` list is authoritative, anything outside it
      is hallucination.
    - Rewrite `tests_added[].asserts[]` into natural-language sentences
      (e.g., 'login with valid password returns JWT').
    - Fill `deviations[]` when the commit touches files or behavior outside
      plan.file_impacts / plan.major_changes.

    For `overview`:
    - Fill `plan_vs_result[]`: for each plan.major_changes item, mark achieved
      / partial / missed, with one evidence commit short_sha.
    - Fill `deviations_summary[]` and `open_risks[]`.

    ## Rules
    - Do NOT invent files, lines, or commits not in the partial JSON.
    - Do NOT modify any field the generator already filled (sha, message,
      files_changed, diff_hunks, change_map, qa_verdict, etc.).
    - Return the merged JSON as your final message (path or inline — the caller
      will write it).
    - If you cannot produce cards for a commit, leave that commit's `cards`
      empty — the generator's fallback card already lives under
      `_fallback_cards`. The caller will substitute.
  "
)
```

Treat any output that fails JSON.parse, modifies a generator-owned field, or references a file outside `files_changed` as interpretation failure. On failure, fall back to `_fallback_cards` for every affected commit and leave `overview.plan_vs_result` / `deviations_summary` / `open_risks` empty with a UI hint that automatic interpretation was skipped.

### Step 3. Write final artifacts

- Merge agent output with the partial JSON. For each commit: if `cards[]` is empty, substitute `_fallback_cards`. Strip `_fallback_cards` from the final JSON.
- Write `plans/{task_slug}/dev-review/review-data.json`.
- Copy `assets/index.html` and `assets/vendor/` into `plans/{task_slug}/dev-review/` (overwrite each round).
- Raw diffs (one file per commit, named `{short_sha}.diff`) are already written by the generator under `assets/diffs/`.

### Step 4. Initialize or merge feedback

Read any existing `feedback.json`:

- If `plan_signature` differs or the file is missing, create a fresh one with `review_status = "in_progress"` and `cards = {}`.
- If `plan_signature` matches (same round continuing), preserve existing per-card status. This keeps `approved` cards from round N stable when the reviewer re-opens the browser.
- When a new round starts (re-entry after rework), preserve `approved` cards from the prior round's `feedback.json` for commit IDs that still exist in the new `review-data.json`. New commits start with empty status.

Write `feedback.json` with `updated_at = now`.

### Step 5. Append to review history

On each re-entry (`review_iteration > 1`), append a round entry to `review-history.json` summarizing what the previous round asked for and what the runner did in response. See `references/review-data-schema.md` for the exact shape.

On the very first call (`review_iteration == 1`), create `review-history.json` with an empty `rounds[]` array.

### Step 6. Serve and hand off to the user

Instruct the user (in Korean, since this skill runs in a Korean-first workflow) with:

1. The server command:

   ```
   node .codex/tools/developer-review-server.mjs plans/{task_slug}/dev-review
   ```

2. The default URL `http://localhost:8787`.

3. The instruction: "브라우저에서 리뷰를 마치고 submit을 누른 뒤 채팅에 `리뷰 완료`라고 답장해주세요."

End your turn after this instruction. Do not poll `feedback.json`. Do not use `AskUserQuestion` — plain text lets the runtime's Stop hook behave normally.

### Step 7. Interpret feedback on re-entry

When the user replies `리뷰 완료`, re-enter this skill and read `feedback.json`:

- If `plan_signature` differs from the current one, the reviewer submitted stale data. Regenerate the package (back to Step 1) and ask them to review again.
- If `review_status != "submitted"`, ask the reviewer to press submit in the browser.
- Otherwise, classify each card and produce a routing summary for the runner:

| Card status | Route |
|---|---|
| `approved` | Nothing to do for this card |
| `needs-change` | Runner re-dispatches `dispatch_agent` with the card's target + comment |
| `question` | Runner answers in chat, then resets this card's status to empty and re-runs dev-review |
| `out-of-scope` | Record in `review-history.json`, treat as approved for gate purposes |

Return a terminal summary to the runner:

```json
{
  "result": "approved" | "rework" | "qa_required",
  "task_head_sha": "...",
  "plan_signature": "...",
  "rework_items": [
    {
      "card_id": "abc123a.C1",
      "target": {"file": "...", "lines": "..."},
      "comment": "...",
      "dispatch_agent": "..."
    }
  ],
  "question_items": [
    {"card_id": "...", "comment": "...", "target": {...}}
  ],
  "out_of_scope_items": [
    {"card_id": "...", "comment": "..."}
  ]
}
```

- `result = "approved"` when every card is `approved` or `out-of-scope`.
- `result = "rework"` when at least one `needs-change` card exists. Runner re-dispatches each `rework_items[i].dispatch_agent` in parallel when items are independent, else sequentially.
- `result = "qa_required"` only when `question_items` is non-empty and there are no `needs-change` cards. Runner answers in chat, resets those cards via this skill (same `plan_signature`, status cleared), and reserves the user for another `리뷰 완료`.

## Dispatch agent selection (reviewer-driven)

Cards with `status = "needs-change"` must carry `dispatch_agent`. The browser UI reads `review-data.json.available_agents` (populated by the generator from `plugin/develop/agents/*.md` and `.claude/agents/*.md`) and presents a required dropdown the moment the reviewer picks `needs-change`.

If a reviewer submits a `needs-change` card without `dispatch_agent` (possible if the form was bypassed), treat the card as `question` and ask the user to reopen the browser and pick an agent. Do not guess — `plan.file_impacts`-based auto-matching was considered and rejected because it misroutes for plan-external files.

## Re-dispatch prompt shape (for the runner)

When runner runs re-dispatch for a `rework_items[i]`, it should build the phase-agent prompt roughly like:

```
## Working directory
You are working in: {worktree_path}
cd to this directory before starting any work.

## Context
You are revising prior work based on reviewer feedback. The code already exists
in this worktree; build on it, do not redo prior commits.

## Feedback
- Card: {card_id}
- Target: {target.file}:{target.lines}
- Comment: "{comment}"

## Instructions
Apply the feedback. Commit with Conventional Commits and include one or two
lines of rationale in the commit body (why you made this change, not what).
Do NOT touch other files unless the feedback requires it. Do NOT rebase or
amend existing commits.
```

The runner owns the actual Agent dispatch. This skill just hands back the items.

## Failure handling

| Failure | Handling |
|---|---|
| Helper script non-zero exit | Stop, propagate exit code. Runner should surface the error and not advance. |
| Interpretation agent returns invalid JSON | Use `_fallback_cards` for every commit, leave overview interpretation fields empty with UI hints. |
| `feedback.json` missing or malformed on re-entry | Treat as in-progress; ask the user to submit in the browser. |
| `plan_signature` drift between `review-data.json` and `feedback.json` | Regenerate the package, warn the reviewer. |
| Worktree disappeared | Stop, report controller error (the runner must keep the worktree alive until approved). |
| Server port 8787 in use | The server supports `--port`; advise the user and wait. |

## Guardrails

- Do NOT modify production code from inside this skill — its role is review infrastructure only.
- Do NOT remove the worktree or switch branches in the main repo; the runner owns worktree lifecycle.
- Do NOT treat a `needs-change` card as approved just because the reviewer left the comment empty. Empty comment + `needs-change` is valid (the target already localizes the issue); only `dispatch_agent` is required for rework.
- Do NOT re-dispatch from this skill; return items to the runner and let the runner issue `Agent(...)`. This keeps dev-review side-effect-free over code.
- Do NOT rewrite or delete `review-history.json` rounds; append only. History is the record the UI shows for "what changed since last round".
- Do NOT try to auto-map files to `dispatch_agent`. The reviewer picks it in the UI.
- Do NOT polled-wait for `feedback.json` changes — end your turn and let the user say `리뷰 완료`.
- Do NOT add phase-based grouping (commit trailers, phase hooks, `.phase-context`). The review is commit-based.
- Do NOT reuse `approved` status across `plan_signature` changes; regenerate the package and require a fresh review.
- Do NOT write `dev-review` artifacts outside `plans/{task_slug}/dev-review/`.

## References

- `references/ui-contract.md` — browser UI contract (page layout, cards, diff rendering, highlight.js, dispatch_agent dropdown).
- `references/review-data-schema.md` — JSON shape of review-data / feedback / review-history.
- `references/helper-contract.md` — generator script CLI, inputs, outputs, fallback card rules.

</Instructions>
</Skill_Guide>
