---
name: dev-review
description: "Browser-based developer review gate for runner-executed tasks. Triggered after runner finishes all phase commits, before the merge/PR/later decision. Generates a commit-based review package (Overview preview → per-commit cards → Final preview) served over localhost, collects per-card status/comment/dispatch_agent feedback from the reviewer, and routes non-approved feedback back into the runner's worktree as rework, Q&A, or out-of-scope records. Invoke when runner reaches Step 4, when the user says '리뷰 완료', when re-running developer review after a rework round, or when the user asks '개발 리뷰', 'dev review', or 'runner 리뷰'."
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

The runner calls dev-review at its Step 4, after all plan phases complete and before Step 5 merge/PR/later. The worktree at `worktrees/{task-branch}` is still present and contains all phase commits.

Runner should invoke dev-review again after each rework round: when a `needs-change` card triggers re-dispatch, the re-dispatched agent writes new commits into the same worktree, and then dev-review regenerates the package against the new `task_head_sha`.

## Inputs from the caller

The runner passes a handoff packet containing:

- `task_slug` — plan folder name under `plans/`
- `plan_path` — `plans/{task_slug}/plan.md`
- `worktree_path` — absolute path, usually `worktrees/{task_branch}`
- `base_branch` — branch the runner started on (HEAD stays here)
- `task_branch` — branch name inside the worktree
- `review_iteration` — 1 on first call, N+1 on each re-entry

The skill infers `task_head_sha` from the worktree, derives `plan_signature` from plan artifacts, and reads prior `feedback.json` / `review-history.json` when they exist for the same `task_slug`.

## Artifacts the skill owns

The data folder under `plans/{task_slug}/dev-review/` is **data-only**. HTML and the syntax-highlight vendor bundle live exclusively in the plugin and are served directly from there — they never get copied per-task. This keeps the data folder small, lets a single UI bug fix propagate to every prior task without re-running anything, and removes the surface for stray helper scripts to land alongside the data.

```text
plans/{task_slug}/dev-review/        ← data-root (per-task)
├── review-data.json                # read by the browser, regenerated each round
├── feedback.json                   # written by the server as the reviewer clicks
├── review-history.json             # append-only record of prior rounds
└── assets/
    └── diffs/                      # raw-diff .diff files keyed by short_sha

plugin/develop/skills/dev-review/    ← html-root (one global copy)
└── assets/
    ├── index.html                  # served at "/"
    └── vendor/
        ├── highlight.min.js        # served at "/vendor/..."
        └── highlight-theme.css
```

## Workflow

### Step 0. Validate prerequisites

- `plan_path` exists and `worktree_path` contains the `task_branch` checked out.
- `task_head_sha = git -C {worktree_path} rev-parse HEAD`.
- There is at least one commit in `base_branch..task_head_sha`. An empty commit range is a caller bug — stop and report.
- The plugin's dev-review server `${CLAUDE_PLUGIN_ROOT}/skills/dev-review/scripts/server.mjs` exists. This server is **plugin-internal** — it is intentionally separate from `.codex/tools/developer-review-server.mjs` (which belongs to the orchestrator). Do not reference the orchestrator's server from this skill.
- The plugin html-root is readable: `${CLAUDE_PLUGIN_ROOT}/skills/dev-review/assets/index.html` AND `${CLAUDE_PLUGIN_ROOT}/skills/dev-review/assets/vendor/highlight.min.js`. If either is missing, stop — the plugin install is broken and there's no point regenerating data the browser can't render.

If validation fails, do not write partial artifacts. Report the exact blocker so the runner can surface it to the user.

### Step 1. Run the deterministic generator

Call the helper script with absolute paths:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/dev-review/scripts/generate-review-data.mjs" \
  --task-slug "{task_slug}" \
  --plan-path "{plan_path}" \
  --worktree "{worktree_path}" \
  --base "{base_branch}" \
  --task-branch "{task_branch}" \
  --iteration {review_iteration} \
  --available-agents-dir "${CLAUDE_PLUGIN_ROOT}/agents" \
  --out "plans/{task_slug}/dev-review/review-data.partial.json"
```

The helper populates every field that can be derived from git, the plan file, and prior review artifacts. It also emits fallback cards (one per commit with at least a file-count summary) so Step 2 has a valid shape to merge into even on full interpretation failure.

The `--available-agents-dir` flag is **required** so `available_agents` is populated even when `CLAUDE_PLUGIN_ROOT` does not propagate into the helper's process env. Without it the dispatch dropdown in the browser is empty and reviewers cannot route `needs-change` cards.

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
    - Produce `cards[]` (id, title, description, evidence[]) grouping meaningful
      change units. Evidence `file` + `lines` must exist in that commit's actual
      diff — the generator's `files_changed` list is authoritative, anything
      outside it is hallucination.
      - Each card MUST carry an `id` field formatted exactly as
        `${commit.short_sha}.C${index+1}` (1-indexed within that commit's
        cards). Example: for commit `b0a530e` the cards become `b0a530e.C1`,
        `b0a530e.C2`, ... The browser keys per-card feedback by this id, so a
        missing or duplicate id collapses every reviewer click into the same
        empty-string bucket.
      - Each evidence item should carry `file`, `lines`, and a short `note`
        explaining what to look at. `snippet` is optional — when omitted the
        UI shows just file:lines + note (no empty code block). Only include
        `snippet` if you can quote it verbatim from the actual diff.
    - Rewrite `tests_added[].asserts[]` into natural-language sentences
      (e.g., 'login with valid password returns JWT').
    - Fill `deviations[]` when the commit touches files or behavior outside
      plan.file_impacts / plan.major_changes.

    For `overview`:
    - If `overview.user_request` is empty, missing, looks like raw plan
      metadata (e.g. starts with "**Branch:**"), or is otherwise not a
      reader-friendly statement of what the user asked for, REPLACE it with a
      short bulleted array of the actual locked requests (you can pull these
      from plan.md's "사전 합의" / agreements table or equivalent). Same
      treatment applies to `overview.plan_summary` — fill it from plan
      "Overview"/"Summary"/"Scope" sections or the agreements table when the
      generator left it empty.
    - Fill `plan_vs_result[]`: for each plan.major_changes item, mark achieved
      / partial / missed, with one evidence commit short_sha.
    - Fill `deviations_summary[]` and `open_risks[]`.

    ## Output language (Korean prose, English identifiers)
    Every prose field you write MUST be Korean — `cards[].title`,
    `cards[].description`, `evidence[].note`, `tests_added[].asserts[]`,
    `deviations[]`, `overview.user_request` (when you rewrite it),
    `overview.plan_summary` (when you rewrite it),
    `overview.deviations_summary[]`, `overview.open_risks[]`, and
    `overview.plan_vs_result[].note`.

    Keep these English INSIDE the Korean prose, verbatim:
    - file/folder paths (`apps/design-system/src/app/router.tsx`, `packages/ui/`)
    - function / variable / type / hook / class names (`componentRenderMap`, `useDocsSnapshot`, `DocsShell`)
    - library / framework / language / tool / database names (`Vite`, `React Router`, `Tailwind v4`, `pnpm`, `mysql`, `Playwright`)
    - CLI flags, commands, env vars (`pnpm --filter ...`, `git rev-parse`, `CLAUDE_PLUGIN_ROOT`)
    - file extensions, package specifiers, import paths (`.docs.ts`, `@repo/ui/~*`)

    Conceptual / descriptive phrases — even when they sound technical —
    MUST be translated to Korean. Common offenders:
    - "render delegate" → "렌더 위임"
    - "supported family" → "지원 family" 또는 "지원 컴포넌트군" (when "family"
      is used as a code-domain term in the plan, keeping `family` is OK; when
      it's plain English description, translate)
    - "rework round" → "재작업 라운드"
    - "controls / preview / current code triad" → "Controls / Preview /
      Current Code 3종" (when the section names match the UI literally),
      otherwise "컨트롤 / 미리보기 / 현재 코드 3종"
    - "fallback" → "폴백" (technical term loanword is acceptable)
    - "snapshot" → "스냅샷"
    - "validation boundary" → "검증 경계"

    Do NOT keep entire English clauses just because they read fine —
    e.g. "render delegate를 정의해 componentRenderMap" should become
    "렌더 위임을 `componentRenderMap`에 정의" (Korean prose, identifier
    inline). The reviewer is reading Korean.

    JSON field names, status enums (`achieved` / `partial` / `missed`),
    file kinds (`added` / `modified` / `deleted` / `renamed`), and
    schema-level constants stay English — those are the schema, not prose.

    ## Rules
    - Do NOT invent files, lines, or commits not in the partial JSON.
    - Do NOT modify generator-owned commit-level fields (sha, message,
      files_changed, change_map, raw_diff_path, etc.).
    - You MAY rewrite `overview.user_request` and `overview.plan_summary` —
      these are seeded by a heuristic that often misses the real value, and
      this skill explicitly delegates curation of those two fields to you.
    - Return the merged JSON as your final message (path or inline — the caller
      will write it).
    - If you cannot produce cards for a commit, leave that commit's `cards`
      empty — the generator's fallback card already lives under
      `_fallback_cards`. The caller will substitute.
  "
)
```

Treat any output that fails JSON.parse, modifies a generator-owned field, or references a file outside `files_changed` as interpretation failure. On failure, fall back to `_fallback_cards` for every affected commit and leave `overview.plan_vs_result` / `deviations_summary` / `open_risks` empty with a UI hint that automatic interpretation was skipped.

### Step 3. Write final artifacts and clean intermediates

- Merge agent output with the partial JSON. For each commit: if `cards[]` is empty, substitute `_fallback_cards`. Strip `_fallback_cards` from the final JSON.
- Enforce card `id` deterministically. After merge, walk every commit's final `cards[]` and overwrite each `cards[idx].id` to `${commit.short_sha}.C${idx+1}` (1-indexed) regardless of whether the interpretation agent provided one. The Step 2 prompt asks the agent to set this id, but treat that as a hint — interpretation occasionally drops the field, returns duplicates, or returns a typo'd shape, and any of those collapse the browser's per-card feedback into a single empty-key bucket. Resetting the id at merge time is cheap and makes the contract independent of agent reliability.
- Write `plans/{task_slug}/dev-review/review-data.json`.
- Raw diffs (one file per commit, named `{short_sha}.diff`) are already written by the generator under `assets/diffs/`.
- Do NOT copy `index.html` or `assets/vendor/` into the data folder. The server now serves those from the plugin html-root (see Step 6). The data folder is data-only — keeping it free of UI assets means a UI bug fix in the plugin propagates to every prior task without re-running anything.
- Delete `review-data.partial.json` from the data folder once the final JSON has been written. Leaving the 800KB+ partial behind confuses reviewers and bloats the PR diff if the dev-review folder is committed.
- Delete legacy UI assets from the data folder if they exist from prior rounds of the older self-contained layout: `index.html`, the entire `assets/vendor/` directory. These are served from the plugin path now and any local copy will silently shadow newer UI fixes if the legacy single-root server mode is ever reused.
- Delete any other files in `plans/{task_slug}/dev-review/` that are not in the artifact list (`review-data.json`, `feedback.json`, `review-history.json`, `assets/diffs/`). The interpretation agent occasionally drops helper scripts (`build_review.py`, scratch JSON, etc.) into the data folder; those are not part of the spec and must be removed before handoff.

### Step 4. Initialize or merge feedback

Read any existing `feedback.json`:

- If `plan_signature` differs or the file is missing, create a fresh one with `review_status = "in_progress"` and `cards = {}`.
- If `plan_signature` matches (same round continuing), preserve existing per-card status. This keeps `approved` cards from round N stable when the reviewer re-opens the browser.
- When a new round starts (re-entry after rework), preserve `approved` cards from the prior round's `feedback.json` for commit IDs that still exist in the new `review-data.json`. New commits start with empty status.

Write `feedback.json` with `updated_at = now`.

### Step 5. Append to review history

On each re-entry (`review_iteration > 1`), append a round entry to `review-history.json` summarizing what the previous round asked for and what the runner did in response. See `references/review-data-schema.md` for the exact shape.

On the very first call (`review_iteration == 1`), create `review-history.json` with an empty `rounds[]` array.

### Step 6. Auto-start the server and hand off to the user

The skill is responsible for booting the review server itself — do NOT ask the user to run any `node` command. Use the `Bash` tool with `run_in_background: true` so the process keeps serving across the turn boundary while the reviewer works in the browser.

The plugin's dev-review server is **multi-review**: one server process hosts every task review under `/review/{task-slug}`. This is critical for parallel Claude sessions — if session A already started the server for task-A, session B finds it on the same port (via health-check) and just opens its own `/review/{task-B-slug}` URL on the same process. No port juggling, no per-session servers.

1. Health-check first to avoid duplicate launches:

   ```bash
   node -e "fetch('http://localhost:9797/api/health').then(r=>r.json()).then(j=>process.exit(j.ok && j.kind==='dev-review' ? 0 : 1)).catch(()=>process.exit(1))"
   ```

   - exit `0` → a compatible dev-review server is already up. Skip launching, reuse it. Both your task and any other in-flight task will be served by it.
   - exit non-zero → continue to step 2. (A 200 response with a different `kind` indicates port collision with a non-dev-review process; in that case launch on `--port 9798` and tell the user the alternate URL.)

2. Launch the plugin's dev-review server in the background from the repo root (NOT from inside the worktree). The server auto-resolves its html-root from `__dirname` and uses `${cwd}/plans` as the plans-root, so no positional task argument is needed — multiple sessions add their own `/review/{slug}` to the running process by simply existing under `plans/`:

   ```
   Bash(
     command: "node \"${CLAUDE_PLUGIN_ROOT}/skills/dev-review/scripts/server.mjs\"",
     run_in_background: true,
     description: "Start dev-review server in background"
   )
   ```

   Do NOT use `.codex/tools/developer-review-server.mjs` here — that is the orchestrator's server, a separate process for planning review with its own URL scheme and HTML. The dev-review skill must always use its own plugin-internal server.

   After dispatch, briefly verify the port is bound by re-running the health-check. The dev-review server's `/api/health` returns `kind: "dev-review"`; treat any other shape as a foreign process. If the second health-check still fails, surface the background process output to diagnose (port collision, missing artifacts, etc.) instead of silently telling the user a broken URL.

3. Tell the user (Korean — this skill runs in a Korean-first workflow), using the per-task URL:

   ```
   리뷰 서버가 백그라운드에서 실행 중입니다.
   브라우저에서 http://localhost:9797/review/{task_slug} 를 열어 리뷰를 진행해주세요.
   submit을 누른 뒤 채팅에 `리뷰 완료`라고 답장해주세요.
   ```

End your turn after this instruction. Do not poll `feedback.json`. Do not use `AskUserQuestion` — plain text lets the runtime's Stop hook behave normally. The background server stays alive across re-entries and across sessions; only restart it (re-run step 2) if the health-check on re-entry shows it's gone or returns a non-dev-review `kind`.

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
Apply the feedback. Do NOT touch other files unless the feedback requires it.
Do NOT rebase or amend existing commits.

## Commit rules (keep these exact — the dev-review UI reads them back)
- Format: `{type}(scope): {description}`. Allowed types: feat / fix / refactor / docs / chore / style / test. Imperative mood, ~72 characters or less.
- Do NOT include phase identity or rework-round prefix in the subject or body. Metadata is tracked outside the commit message.
- Include a 1~2 line WHY body explaining what the reviewer feedback asked for and why this change addresses it. The body is surfaced verbatim in the dev-review UI.
- Full spec: `plugin/develop/references/commit-convention.md`.
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
| Server port 9797 in use by an unrelated process | The launcher's first health-check returns 0 only when the dev-review server is already there (route `/api/health` returns `kind: "dev-review"`); the orchestrator's server returns `mode: "multi-review"` and a foreign process returns whatever else. If `/api/health` returns 200 but `kind != "dev-review"`, treat it as port collision and retry the launch with `--port 9798` (or the next free port). Tell the user the alternate URL. |

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
