# Review Data Schema (v2)

Three JSON artifacts live under `plans/{key}/dev-review/`, where `key` is the plan directory's relative path under `plans/` (so `foo/bar` for a nested plan at `plans/foo/bar.plan.md`). They share a `schema_version` of `2` and are written with 2-space indentation.

| File | Writer | Reader | Lifecycle |
|---|---|---|---|
| `review-data.json` | helper script (deterministic only) | browser, skill on re-entry | regenerated every round; never edited by UI |
| `feedback.json` | server on each reviewer action | browser, skill on `리뷰 완료` | editable live state; plan_signature-scoped |
| `review-history.json` | skill on round boundaries | browser, skill | append-only durable record |

The v2 model drops the interpretation agent entirely. `review-data.json` is now flat, deterministic git/plan output. The reviewer's input lives in `feedback.json` as **line-anchored comments + per-commit verdict + viewed-flags**, modeled after GitHub PR review.

A `schema_version < 2` artifact found at regeneration time is treated as stale: the helper wipes the data folder before writing the new package (one-time migration).

## review-data.json

```jsonc
{
  "schema_version": 2,

  "task_slug": "task-auth-login",
  "plan_path": "plans/task-auth-login/plan.md",
  "plan_signature": "a3f1c...",                // short hash of plan.md + phase files
  "base_branch": "main",
  "task_branch": "task-auth-login",
  "task_head_sha": "def4569...",               // full 40-char sha
  "worktree_path": "/abs/path/worktrees/task-auth-login", // local-machine only
  "review_iteration": 2,
  "generated_at": "2026-04-24T10:30:00Z",

  "available_agents": [                        // for needs-change dropdown
    { "name": "frontend-developer", "description": "UI components, React/Next.js, Tailwind" },
    { "name": "backend-developer",  "description": "API endpoints, DB, server logic" },
    { "name": "general-developer",  "description": "Infra, DevOps, cross-cutting" }
  ],

  "totals": {
    "total_commits": 4,
    "total_files_changed": 9,
    "additions": 244,
    "deletions": 35
  },

  "commits": [                                 // sidebar order = this array order = oldest first
    {
      "id": "C1",                              // sequential, 1-indexed
      "sha": "abc123a4b5c6...",                // full 40-char
      "short_sha": "abc123a",                  // first 7
      "message_subject": "feat(auth): implement JWT-based login",
      "message_body": "기존 세션 방식은 모바일 환경에서 토큰 갱신이 까다로워 JWT로 전환.\n15분 만료 + refresh token으로 만료 처리.",
      "author": "SeoJaeWan",
      "author_email": "sjw7324@nanoit.kr",
      "timestamp": "2026-04-24T09:15:00Z",
      "additions": 64,
      "deletions": 8,
      "files_changed": [
        {
          "path": "src/auth.ts",
          "kind": "modified",                  // "added" | "modified" | "deleted" | "renamed"
          "old_path": null,                    // set for "renamed"
          "additions": 42,
          "deletions": 3,
          "binary": false                      // true skips diff rendering, comments disabled
        }
      ],
      "raw_diff_path": "assets/diffs/abc123a.diff"  // browser fetches + parses on demand
    }
  ]
}
```

### Field ownership

Every field is **deterministic** (helper script). There is no interpretation step. If the helper cannot derive a field (rare — e.g. binary diff parse), it emits the field with safe defaults: `additions: 0`, `deletions: 0`, `binary: true`, etc.

### Why no overview / final / cards

The v1 model had a stepper UI (Overview → C1 → C2 → ... → Final) and an interpretation agent that grouped diff hunks into "cards". The v2 UI is GitHub-style (sidebar of commits + Files Changed view per commit), so:

- **Overview / Final** sections — the sidebar exposes commit list directly; the commit body holds the WHY without a separate summary step.
- **Cards** — line-anchored comments replace cards. The reviewer drags a line range and writes a comment, the way GitHub PR reviews work.
- **plan_vs_result / deviations / open_risks** — these were interpretation-only; without the agent they no longer exist as fields. Reviewers compare against `plan.md` directly if needed.
- **change_map / track classification** — removed. The sidebar already shows per-commit additions/deletions; the totals block carries the aggregate.

### addressed_by_this_commit

Removed from v2. The runner's rework loop is now per-commit (one needs-change verdict + N line comments → one re-dispatch), so cross-round card linking is unnecessary. `review-history.json` records what each round asked for; the reviewer can scroll history if they want to see a prior round's request.

## feedback.json

```jsonc
{
  "schema_version": 2,

  "task_slug": "task-auth-login",
  "plan_signature": "a3f1c...",                // must match review-data.json
  "task_head_sha": "def4569...",               // for drift detection
  "review_status": "in_progress",              // "in_progress" | "submitted"
  "updated_at": "2026-04-24T10:45:00Z",

  "comments": [
    {
      "id": "cm_001",                          // server-assigned, monotonic per task
      "commit_sha": "abc123a4b5c6...",         // full sha (matches review-data.json.commits[].sha)
      "file": "src/auth.ts",
      "side": "new",                           // "new" | "old" — anchor side in the diff
      "line_start": 42,
      "line_end": 45,                          // inclusive; equal to line_start for single-line
      "type": "needs-change",                  // "needs-change" | "question" | "out-of-scope"
      "body": "에러 처리가 빠졌어요",
      "dispatch_agent": "backend-developer",   // required iff type === "needs-change"
      "created_at": "2026-04-24T10:32:00Z",
      "updated_at": "2026-04-24T10:32:00Z"
    }
  ],

  "commit_status": {
    "abc123a4b5c6...": {                       // keyed by FULL sha
      "viewed": true,                          // GitHub "Viewed" checkbox
      "out_of_scope": false                    // true marks the entire commit out-of-scope
    },
    "def4569...": {
      "viewed": false,
      "out_of_scope": false
    }
  }
}
```

### Field rules

- **`comments[].id`** — server-assigned, never reused, format `cm_{6-digit-padded}`. Stable across edits; deletes remove the entry.
- **`comments[].side`** — `"new"` for added/context lines (right side of split view), `"old"` for deleted/context lines (left side). Required.
- **`comments[].line_start`/`line_end`** — line numbers in the diff hunk (1-based, matches the side). The browser computes these from the drag range.
- **`comments[].type`** — three values, no plain "comment" type. A neutral note has no place in this workflow because every comment is either actionable (needs-change/question) or recorded-but-ignored (out-of-scope).
- **`comments[].dispatch_agent`** — required iff `type === "needs-change"`. Submit endpoint rejects a `needs-change` comment without it.
- **`commit_status[sha].viewed`** — reviewer's "I've reviewed this commit" toggle. Defaults `false`. Resets to `false` when new follow-up commits are added in a later round (see Round boundary).
- **`commit_status[sha].out_of_scope`** — convenience flag for "this entire commit is out of my review scope". When true, all `needs-change` comments on this commit are ignored at submit time. Mutually independent from `viewed`.

### Verdict (derived, not stored)

The skill computes per-commit verdict at submit time:

| Condition | Verdict |
|---|---|
| `commit_status[sha].out_of_scope === true` | `out-of-scope` |
| Has any `type === "needs-change"` comment | `needs-change` |
| Has any `type === "question"` comment (no needs-change) | `question` |
| Otherwise | `approved` |

The gate passes iff every commit's verdict is `approved` or `out-of-scope`.

### Round boundary

On re-entry with `review_iteration > 1` and matching `plan_signature`:

- **Comments** — all `needs-change` comments on commits that received any new follow-up commit are auto-marked `resolved` (moved to `review-history.json`'s round entry, removed from `feedback.json.comments`). `question` comments stay if the reviewer hasn't reset them. `out-of-scope` comments are recorded in history and removed from live feedback.
- **commit_status[sha].viewed** — preserved for commits that haven't received new follow-up commits in this round; reset to `false` for any commit that did.
- **commit_status[sha].out_of_scope** — preserved as-is.

When `plan_signature` differs, `feedback.json` is discarded entirely and a fresh in-progress copy is written.

## review-history.json

```jsonc
{
  "schema_version": 2,

  "task_slug": "task-auth-login",
  "current_task_head_sha": "def4569...",
  "current_plan_signature": "a3f1c...",

  "rounds": [
    {
      "id": "R1",
      "submitted_at": "2026-04-24T09:50:00Z",
      "source_task_head_sha": "abc123a...",
      "source_plan_signature": "a3f1c...",
      "resulting_task_head_sha": "def4569...",
      "resulting_plan_signature": "a3f1c...",
      "resolution_state": "resolved",          // "resolved" | "active" | "superseded"

      "commits_snapshot": [                    // copy of the round's commits[] (sha + subject + author + timestamp)
        { "short_sha": "abc123a", "subject": "feat(auth): implement JWT-based login", "author": "SeoJaeWan", "timestamp": "2026-04-24T09:15:00Z" }
      ],

      "comments_snapshot": [                   // every comment as it stood at submit time
        {
          "id": "cm_001",
          "commit_sha": "abc123a4b5c6...",
          "file": "src/auth.ts",
          "side": "new",
          "line_start": 42,
          "line_end": 45,
          "type": "needs-change",
          "body": "에러 처리가 빠졌어요",
          "dispatch_agent": "backend-developer",
          "resolution_route": "rework",        // "rework" | "answer" | "out-of-scope"
          "resulting_commit_sha": "def4569...", // populated after rework agent commits
          "resolution_summary": "try/catch 추가 + 401 응답 처리"
        }
      ],

      "commit_verdicts_snapshot": {            // verdict computed at submit time
        "abc123a4b5c6...": "needs-change",
        "1f3a7c2...": "approved"
      }
    }
  ]
}
```

### History rules

- Round ids are `R{N}` where N is 1-indexed. Never reused, even after `plan_signature` change.
- `resolution_state`:
  - `active` — this round produced non-approved comments still being worked on
  - `resolved` — all non-approved comments addressed (rework commit, chat answer, or out-of-scope recorded)
  - `superseded` — `plan_signature` changed mid-round, this round's feedback no longer authoritative
- `rounds[]` is append-only. The skill never edits a prior round's body; it only adds new rounds and flips `resolution_state` on the round that just closed.
- When `plan_signature` changes, previous rounds remain visible but are marked `superseded`; a new round starts fresh.

## Generator-vs-skill ownership summary

| Field | Owner | Failure behavior |
|---|---|---|
| `task_slug`, `plan_path`, `plan_signature`, `base_branch`, `task_branch`, `task_head_sha`, `review_iteration`, `generated_at` | helper | fatal if missing |
| `available_agents` | helper | empty array if no agent files found; UI shows "no agents discovered" warning and disables needs-change submit |
| `totals.*` | helper | fatal if git parsing fails |
| `commits[].sha`, `short_sha`, `message_subject`, `message_body`, `author*`, `timestamp`, `additions`, `deletions`, `files_changed`, `raw_diff_path` | helper | fatal if git parsing fails for a non-empty range |
| `feedback.json.*` | server (per reviewer action) | server validates types and rejects malformed writes |
| `review-history.json.rounds[]` | skill on `리뷰 완료` | append-only |

The boundary is strict: the helper never touches `feedback.json` / `review-history.json`, the server never touches `review-data.json`, and the skill never edits prior history rounds.
