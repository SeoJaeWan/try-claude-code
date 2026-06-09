---
name: dev-review
description: "Browser-based developer review gate for runner-executed plans. Triggered after the runner's plan agent finishes committing every phase, before the merge/PR/later decision. Generates a GitHub-style commit list + Files Changed UI served over localhost; reviewer drags lines to attach `needs-change` / `question` / `out-of-scope` comments per commit, optionally selects a `dispatch_agent` for needs-change. The skill reads back feedback.json and routes non-approved comments into the runner's worktree as rework, Q&A, or out-of-scope records. Invoke when runner reaches Step 4, when the user says '리뷰 완료', when re-running developer review after a rework round, or when the user asks '개발 리뷰', 'dev review', or 'runner 리뷰'."
model: sonnet
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

<Skill_Guide>
<Purpose>
Collect explicit developer review of code changes produced by `runner` before the merge decision. The reviewer sees a GitHub-style page: a sidebar of commits + a Files Changed panel, with line-anchored comments. The runner turns non-approved comments into another rework round inside the same worktree. The review package is regenerated each round; previously-resolved comments are archived to history and removed from live feedback.
</Purpose>

<Instructions>

# dev-review (v2)

A developer review gate owned by the runner. The skill itself does not modify production code — it generates review artifacts, serves the UI, reads back feedback, and tells the runner what to do next.

This skill mirrors `.codex/skills/orchestrator` developer review at the workflow level (gate before merge, browser surface, `리뷰 완료` re-entry), but the **review object** is implementation (already-committed code), not a plan proposal. The schema and UI are intentionally GitHub-PR-shaped.

## When runner invokes this skill

The runner calls dev-review at its Step 4, after the plan agent has finished committing every phase and before Step 5 merge/PR/later. The worktree at `worktrees/{task-branch}` is still present and contains all plan commits.

Runner re-invokes after each rework round: when a `needs-change` comment triggers re-dispatch, the re-dispatched agent writes new commits into the same worktree, then dev-review regenerates the package against the new `task_head_sha`.

## Input from the caller

The runner passes a single absolute path:

- `state_path` — `plans/{plan_key}/.runner-state.json` (`plan_key` is the plan dir's relative path under `plans/`; `auth/login` for a nested plan, just the filename stem for a flat one)

Everything the skill used to receive as separate flags (`task_slug`,
`plan_path`, `worktree_path`, `base_branch`, `task_branch`) is read from
that state file via the runner-state library. The skill therefore does
not negotiate identity with the caller — there is one source of truth
and it lives on disk.

The skill infers `task_head_sha` from the worktree the state points at,
derives `plan_signature` via the helper, and reads prior `feedback.json` /
`review-history.json` when they exist.

### A round closes on every submit, not only when HEAD changes

There is no `current_round` integer in plan-state. The UI labels rounds by
the live `task_head_sha` short SHA, but a **round** is one
`in_progress → submitted → processed` cycle of `feedback.json`. Every
`리뷰 완료` closes the current round: Step 2/3 snapshot **all** of the
just-submitted comments — together with the response each one received —
into `review-history.json`, then reset `feedback.json` to a fresh
`in_progress` round so the reviewer can review **every** commit again.

This holds whether or not HEAD moved:

- **rework** re-dispatch lands new commits → the regenerated round reviews a
  new HEAD; prior comments are archived with `resolution_route: "rework"`.
- **qa** answers happen in chat with **no new commits** → the round still
  closes; prior comments are archived with `resolution_route: "answer"`.

So `submitted` is never a terminal state for anything except `approved`.
The reviewer is never stranded in a locked review — re-entry always
reopens, and the browser also exposes a manual **Reopen** button
(`POST /api/reopen`) for the "I submitted too early, let me keep editing
before saying 리뷰 완료" case (that path does not snapshot history).

`feedback.json` is a single live working file that the server overwrites
on each reviewer action. When the runner re-invokes this skill after a
round is processed, Step 2 below snapshots the soon-to-be-replaced
`feedback.json` into `review-history.json` and then resets the live file.

## Artifacts the skill owns

```text
plans/{key}/dev-review/              ← data-root; `key` is the plan dir's
                                       relative path under `plans/`. For a
                                       nested plan `plans/foo/bar.plan.md`
                                       it is `foo/bar`; for a folder-style
                                       plan `plans/foo/plan.md` it is `foo`
                                       (the directory IS the plan_key).
├── review-data.json                # written by helper; deterministic; regenerated each round
├── feedback.json                   # live working file; overwritten by server on each reviewer action
├── review-history.json             # append-only record of prior rounds (snapshot taken at re-entry)
├── round-responses.json            # OPTIONAL; written by the runner before re-entry; maps the
│                                   # just-closed round's comment ids → the response they received
│                                   # (route / summary / resulting_commit_sha). Consumed + deleted in Step 2.
├── author-notes.json               # written by helper; resolved AI rationale notes; read-only in UI
├── author-notes-input/             # written by author/rework agent; snippet-anchored input (one per commit)
└── assets/
    └── diffs/                      # raw-diff .diff files keyed by short_sha

plugin/develop/skills/dev-review/    ← html-root (one global copy)
└── assets/
    ├── index.html                  # served at "/"
    └── vendor/
        ├── diff2html.min.js
        ├── diff2html.min.css
        ├── highlight.min.js
        └── highlight-theme.css
```

## Workflow

### Step 0. Validate prerequisites

- `state_path` exists and parses with `runner-state.loadState`. Anything
  beyond schema validation lives in the helper, but the skill verifies the
  file is loadable before doing anything else.
- The state's `worktree_path` exists on disk and has `task_branch` checked
  out. `task_head_sha = git -C {state.worktree_path} rev-parse HEAD`.
- There is at least one commit in `state.base_branch..task_head_sha`. An
  empty range is a caller bug — stop and report.
- The plugin's dev-review server `${CLAUDE_PLUGIN_ROOT}/skills/dev-review/scripts/server.mjs` exists. This server is plugin-internal — do not reference the orchestrator's server.
- The plugin html-root is readable: `${CLAUDE_PLUGIN_ROOT}/skills/dev-review/assets/index.html` AND the diff2html / highlight.js bundles under `assets/vendor/`. If any vendor file is missing, stop — the plugin install is broken.

If validation fails, do not write partial artifacts. Report the exact blocker.

### Step 1. Run the deterministic generator

Call the helper with the state path. Every per-plan field (slug, plan path,
worktree, branches) is read from the state JSON inside the helper:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/dev-review/scripts/generate-review-data.mjs" \
  --state-path "{state_path}" \
  --available-agents-dir "${CLAUDE_PLUGIN_ROOT}/agents"
```

`--out` is optional; when omitted the helper writes
`{state-dir}/dev-review/review-data.json` next to the state file, which is
where the rest of this skill expects to find it.

The helper writes the **final** `review-data.json` directly. There is no `.partial.json` and no merge step. If a stale (`schema_version < 2`) artifact exists in the data folder, the helper wipes it before regenerating (one-time migration).

The same helper run also resolves the author/rework agent's AI rationale notes: it reads `author-notes-input/*.json` (snippet-anchored), maps each snippet to a new-side diff line, and writes `author-notes.json`. This is deterministic and read-only — the AI notes never enter `feedback.json` and never gate the merge. Unresolvable anchors are dropped with a `warn`; a missing input directory yields an empty `notes[]`. See `references/review-data-schema.md` → "author-notes.json".

Pass `--available-agents-dir` so `available_agents` is populated even when
`CLAUDE_PLUGIN_ROOT` does not propagate. Without it the dispatch dropdown is
empty and reviewers cannot route `needs-change` comments.

Helper failure is fatal — propagate the exit code. The runner cannot continue without deterministic data.

See `references/helper-contract.md` for the full CLI and exit-code contract.

### Step 2. Close the prior round and reset `feedback.json`

There is no interpretation agent in v2. After the helper writes
`review-data.json`, the skill prepares a **fresh** `feedback.json` for the
new round. Unlike v1, the live file is never "carried over" — every round
starts clean so the reviewer can re-review every commit. The just-closed
round (its comments + the response each received) is preserved in
`review-history.json` by Step 3.

- **First round (no prior `feedback.json`)** → write a fresh skeleton:

  ```json
  {
    "schema_version": 2,
    "task_slug": "{task_slug}",
    "plan_signature": "<copy from review-data.json>",
    "task_head_sha": "<copy from review-data.json>",
    "review_status": "in_progress",
    "updated_at": "<now ISO>",
    "comments": [],
    "commit_status": {}
  }
  ```

- **Subsequent round (prior `feedback.json` exists, `plan_signature` matches)** → close it and open a clean one:

  - Read the prior `feedback.json` (its absolute path is in `state.dev_review.last_feedback_path`). Step 3 archives **all** of its comments to history (this is what the reviewer sees as the closed round) — none are carried forward into the live file.
  - Write the new live `feedback.json` as the first-round skeleton above, with **two** carry-overs from the prior file's `commit_status`:
    - `viewed` → reset to `false` for every commit (the reviewer re-reviews the whole change set each round).
    - `out_of_scope` → **preserved** per sha (a commit the reviewer ruled out of scope stays out of scope until they change it).
  - Set `review_status: "in_progress"` and `task_head_sha` to the new head; bump `updated_at`. **Resetting `review_status` is mandatory** — the prior file is `submitted`, and copying that value forward is exactly the bug that used to strand the reviewer in a locked review.

- **`plan_signature` mismatch** → discard prior `feedback.json` entirely; write the first-round skeleton (no `commit_status` carry-over).

Write `feedback.json` atomically.

### Step 3. Append the closed round to review history (with responses)

On the very first call (no prior feedback file), create `review-history.json` with an empty `rounds[]` array — there is no closed round yet.

On re-entry (prior feedback file exists), append a round entry that captures **everything** the reviewer submitted last round plus the response each comment received:

```jsonc
{
  "id": "R-<prior task_head_sha short>",  // the round that just closed
  "submitted_at": "<prior feedback file updated_at, or now>",
  "source_task_head_sha": "<prior task_head_sha>",
  "source_plan_signature": "<prior plan_signature>",
  "resulting_task_head_sha": "<current task_head_sha>",  // == source when the round was qa-only (no new commits)
  "resulting_plan_signature": "<current plan_signature>",
  "resolution_state": "resolved",
  "commits_snapshot": [ /* commits[] subset from prior review-data.json */ ],
  "comments_snapshot": [ /* EVERY prior comment, each annotated with its response (see below) */ ],
  "commit_verdicts_snapshot": { /* derived verdicts at submit time of prior round */ }
}
```

**Annotating each comment with its response.** For every comment in the prior `feedback.json`, copy it into `comments_snapshot[]` and attach `resolution_route` / `resolution_summary` / `resulting_commit_sha`:

1. **Preferred source — `round-responses.json`.** If `{data-root}/round-responses.json` exists, it is a map written by the runner before this re-entry: `{ "<comment_id>": { "route": "rework"|"answer"|"out-of-scope", "summary": "<text>", "resulting_commit_sha": "<sha|null>" } }`. Use it verbatim for any comment id it covers, then **delete the file** after a successful history write (it belongs to exactly one round). This is the only way `question` answers (chat text) reach history.
2. **Fallback by type** for any comment the map does not cover:
   - `type === "needs-change"` → `route: "rework"`. Try to fill `resulting_commit_sha` + `resolution_summary` from a follow-up commit: a commit in the new `commits[]`, chronologically after the flagged commit, that touches a file in the flagged comment's commit. Use that commit's short sha and its Korean message body as the summary. If none is found, leave `resulting_commit_sha: null` and `resolution_summary: null`.
   - `type === "question"` → `route: "answer"`, `resolution_summary: null` (the answer lived in chat and was not captured — the runner should have written `round-responses.json`; note it but do not block).
   - `type === "out-of-scope"` → `route: "out-of-scope"`, fixed `resolution_summary: "리뷰어가 범위 외로 표시"`.

`plan_signature` mismatch flips the prior round's `resolution_state` to `superseded`.

See `references/review-data-schema.md` for the full history shape.

### Step 3.5. Record the feedback file in plan-state

After Steps 1–3 produce the round's artifacts, write the feedback file path
back into the plan-state so the runner skill (and the next `/runner` resume)
can find it without re-deriving the location:

- Load the state via `runner-state.loadState(state_path)`.
- Set `state.dev_review.last_feedback_path` to the absolute path of the
  freshly initialized `feedback.json`.
- Save with `runner-state.saveState`. This bumps `updated_at` automatically.

### Step 4. Auto-start the server and hand off to the user

The skill boots the review server itself — do NOT ask the user to run any `node` command. Use `Bash` with `run_in_background: true` so the process keeps serving across turn boundaries.

The plugin's dev-review server is **multi-review** and **discovery-based**: on every request it walks `plans/` and serves any directory containing `dev-review/review-data.json`. The URL key is the directory's POSIX-relative path under `plans/` — so a nested plan at `plans/foo/bar.plan.md` is served at `/review/foo/bar/`, and a folder-style plan at `plans/foo/plan.md` is served at `/review/foo/`. Parallel Claude sessions reuse the same port (the second session's health-check finds the first one).

1. Health-check first to avoid duplicate launches:

   ```bash
   node -e "fetch('http://localhost:9797/api/health').then(r=>r.json()).then(j=>process.exit(j.ok && j.kind==='dev-review' ? 0 : 1)).catch(()=>process.exit(1))"
   ```

   - exit `0` → compatible dev-review server already up. Skip launching.
   - exit non-zero → continue to step 2. (200 with a different `kind` indicates port collision; launch on `--port 9798` and tell the user the alternate URL.)

2. Launch the plugin's dev-review server in the background from the repo root:

   ```
   Bash(
     command: "node \"${CLAUDE_PLUGIN_ROOT}/skills/dev-review/scripts/server.mjs\"",
     run_in_background: true,
     description: "Start dev-review server in background"
   )
   ```

   After dispatch, re-run the health-check briefly to verify the port is bound. The server's `/api/health` returns `kind: "dev-review"`. If the second health-check still fails, surface the background output to diagnose (port collision, missing artifacts) instead of giving the user a broken URL.

3. Tell the user (Korean) — the URL key is the plan's relative directory under
   `plans/` with `/` separators. For a flat plan it is just the slug; for a
   nested plan like `plans/foo/bar.plan.md` it is `foo/bar`; for a folder-style
   plan `plans/foo/plan.md` it is `foo`. When in doubt, point them at the
   picker page (`http://localhost:9797/`):

   ```
   리뷰 서버가 백그라운드에서 실행 중입니다.
   브라우저에서 http://localhost:9797/review/{review_key}/ 를 열어 리뷰를 진행해주세요.
   (어떤 키인지 모르면 http://localhost:9797/ 에서 골라주세요.)
   - 사이드바에서 커밋을 선택하고, diff에서 라인을 드래그해 코멘트를 남길 수 있습니다.
   - needs-change / question / out-of-scope 중 타입을 선택해주세요.
   - 모든 needs-change에 dispatch agent를 지정한 뒤, 사이드바 하단의 Submit을 누르고 채팅에 `리뷰 완료`라고 답장해주세요.
   - 제출 직후 더 고치고 싶으면 Submit 자리의 `Reopen for another round` 버튼으로 다시 편집할 수 있습니다.
   - 이전 라운드의 코멘트와 그에 대한 응답은 사이드바 `History`에서 펼쳐볼 수 있습니다.
   ```

End your turn after this instruction. Do NOT poll `feedback.json`. Do NOT use `AskUserQuestion` — plain text lets the runtime's Stop hook behave normally. The background server stays alive across re-entries; only restart it (re-run step 2) if the health-check on re-entry shows it's gone or returns a non-dev-review `kind`.

### Step 5. Interpret feedback on re-entry (`리뷰 완료`)

When the user replies `리뷰 완료`, re-enter this skill and read `feedback.json`:

- If `plan_signature` differs from `review-data.json`'s, the reviewer submitted stale data. Regenerate the package (back to Step 1) and ask them to review again.
- If `review_status !== "submitted"`, ask the reviewer to press Submit in the browser.
- Otherwise, classify each commit by deriving its verdict:

  | Condition | Verdict |
  |---|---|
  | `commit_status[sha].out_of_scope === true` | `out-of-scope` |
  | Any `comments[]` with `type === "needs-change"` and `commit_sha === sha` | `needs-change` |
  | Any `comments[]` with `type === "question"` and `commit_sha === sha` (no needs-change) | `question` |
  | Otherwise | `approved` |

- Validate every `needs-change` comment carries `dispatch_agent` matching some `available_agents[].name`. A missing or unknown agent flips that single comment to `question` and the result becomes `qa_required` (asking the reviewer to fix it in the browser).

Return a terminal summary to the runner:

```jsonc
{
  "result": "approved" | "rework" | "qa_required",
  "task_head_sha": "...",
  "plan_signature": "...",
  "rework_items": [
    {
      "commit_sha": "abc123a4b5c6...",
      "short_sha": "abc123a",
      "message_subject": "feat(auth): implement JWT-based login",
      "dispatch_agent": "backend-developer",   // unanimous: same agent across all needs-change comments on this commit (see note)
      "comments": [
        { "id": "cm_001", "file": "src/auth.ts", "side": "new", "line_start": 42, "line_end": 45, "body": "..." }
      ]
    }
  ],
  "question_items": [
    { "commit_sha": "...", "comments": [ /* line-anchored question comments */ ] }
  ],
  "out_of_scope_items": [
    { "commit_sha": "...", "reason": "commit-level out_of_scope" | "comment-level", "comments": [ /* if any */ ] }
  ]
}
```

- `result = "approved"` when every commit's verdict is `approved` or `out-of-scope`.
- `result = "rework"` when at least one commit's verdict is `needs-change`. Runner builds one re-dispatch per commit (not per comment), aggregating its `comments[]` into the prompt.
- `result = "qa_required"` when there are `question` comments but no `needs-change`. The runner answers in chat, records each answer into `round-responses.json` (so it lands in history), then re-invokes this skill. That re-entry runs Step 2/3 even though HEAD did not move: the qa round closes (its questions + answers archived) and a fresh `in_progress` round opens for the reviewer. The reviewer no longer has to manually reset `question` comments — re-entry always reopens.

> **What re-entry does after each result.** `approved` → the runner proceeds to merge; the skill does not regenerate. `rework` / `qa_required` → the runner acts (dispatch / answer), writes `round-responses.json`, and re-invokes this skill, which runs Steps 1–3: regenerate `review-data.json` (HEAD may be new for rework, unchanged for qa), archive the closed round with its responses, and reset `feedback.json` to a clean `in_progress` round.

> **Per-commit dispatch_agent unanimity.** When multiple `needs-change` comments on the same commit pick different `dispatch_agent` values, the runner cannot dispatch them all at once — they share the same worktree and would interleave commits. Detect this in Step 5 and flip those comments to `question` with a generated body: `"이 커밋의 needs-change 코멘트가 서로 다른 dispatch_agent를 가리킵니다. 하나로 통일해주세요."` — turning the round into `qa_required` so the reviewer reconciles in the browser.

## Re-dispatch prompt shape (for the runner)

When runner runs re-dispatch for a `rework_items[i]`, it builds a rework-agent prompt roughly like:

```
## Working directory
You are working in: {worktree_path}
cd to this directory before starting any work.

## Context
You are revising prior work based on reviewer feedback. The code already exists
in this worktree; build on it, do not redo prior commits.

## Target commit
- Commit: {short_sha} — {message_subject}
- This is the commit the reviewer flagged. The follow-up commit you create
  should address the comments below.

## Feedback (line-anchored comments on this commit)
- {file}:L{line_start}-L{line_end} (side: {new|old}): "{body}"
- {file}:L{line_start}-L{line_end} (side: {new|old}): "{body}"
- ...

## Instructions
Apply the feedback. Do NOT touch unrelated files. Do NOT rebase or amend
existing commits.

## Commit rules (keep these exact — the dev-review UI reads them back)
- Format: `{type}(scope): {description}`. Allowed types: feat / fix / refactor / docs / chore / style / test. Imperative mood, ~72 characters or less.
- Do NOT include phase identity or rework-round prefix in the subject or body. Metadata is tracked outside the commit message.
- Body is **required and written in Korean**, exactly 2 lines: Line 1 = 리뷰 피드백이 요구한 변경, Line 2 = 그 변경이 피드백을 어떻게 해소하는지. Do NOT prefix labels (`작업:` / `이유:`). Subject stays English. The body is surfaced verbatim in the dev-review UI.
- Full spec: `plugin/develop/references/commit-convention.md`.
```

The runner owns the actual Agent dispatch. This skill just hands back `rework_items[]`.

## Failure handling

| Failure | Handling |
|---|---|
| Helper script non-zero exit | Stop, propagate exit code. Runner should surface the error. |
| `feedback.json` missing or malformed on re-entry | Treat as in-progress; ask the user to submit in the browser. |
| `plan_signature` drift between `review-data.json` and `feedback.json` | Regenerate the package, warn the reviewer. |
| Worktree disappeared | Stop, report controller error (the runner must keep the worktree alive until approved). |
| Server port 9797 in use by an unrelated process | Health-check returns 200 with `kind != "dev-review"`. Retry launch with `--port 9798` (or next free port). Tell the user the alternate URL. |
| `needs-change` comment references a `dispatch_agent` no longer in `available_agents[]` | Flip to `question` with a generated body. Result becomes `qa_required`. |
| Multiple `needs-change` comments on one commit pick different `dispatch_agent` | Flip all of them to `question`. Result becomes `qa_required`. |

## Guardrails

- Do NOT modify production code from inside this skill — its role is review infrastructure only.
- Do NOT remove the worktree or switch branches in the main repo; the runner owns worktree lifecycle.
- Do NOT re-dispatch from this skill; return items to the runner.
- Do NOT rewrite or delete `review-history.json` rounds; append only.
- Do NOT auto-map files to `dispatch_agent`. The reviewer picks it in the UI.
- Do NOT poll-wait for `feedback.json` changes — end your turn and let the user say `리뷰 완료`.
- Do NOT reuse v1 schema fields (`overview`, `cards`, `_fallback_cards`, `tests_added`, `deviations`, `addressed_by_this_commit`, `final`). The schema is v2.
- Do NOT support comment threads / replies in the UI surface; this skill assumes single-comment-per-anchor.
- Do NOT advance past Step 5 on anything except `result === "approved"`.
- Do NOT carry `review_status: "submitted"` into the new round's `feedback.json`. Step 2 always opens the round as `in_progress`; a stale `submitted` is what strands the reviewer.
- Do NOT keep `round-responses.json` after Step 3 consumes it. It describes exactly one closed round — delete it once the history write succeeds so the next round does not re-read stale responses.
- Do NOT route AI author notes (`author-notes.json`) into rework, history, or submit gating. They are deterministic, read-only review context the helper resolves from the agent's `author-notes-input/`; the skill neither edits them nor treats them as reviewer feedback.

## References

- `references/ui-contract.md` — browser UI contract (sidebar, files-changed view, drag-to-comment, diff2html integration).
- `references/review-data-schema.md` — JSON shape of review-data / feedback / review-history.
- `references/helper-contract.md` — generator script CLI, inputs, outputs.

</Instructions>
</Skill_Guide>
