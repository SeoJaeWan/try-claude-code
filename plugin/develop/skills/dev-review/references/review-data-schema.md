# Review Data Schema

Three JSON artifacts live under `plans/{task_slug}/dev-review/`. They share a `schema_version` of `1` and are written with 2-space indentation.

| File | Writer | Reader | Lifecycle |
|---|---|---|---|
| `review-data.json` | skill (via helper + agent) | browser, skill on re-entry | regenerated every round; never edited by UI |
| `feedback.json` | server on reviewer action | browser, skill on `리뷰 완료` | editable live state; plan_signature-scoped |
| `review-history.json` | skill on round boundaries | browser, skill | append-only durable record |

The schemas below show every field. Fields marked **deterministic** are filled by the helper script; fields marked **interpretation** are filled by the interpretation agent and have fallback behavior on failure.

## review-data.json

```jsonc
{
  "schema_version": 1,

  "task_slug": "task-auth-login",              // deterministic
  "plan_path": "plans/task-auth-login/plan.md", // deterministic
  "plan_signature": "a3f1c...",                // deterministic — short hash of plan.md + phase files
  "base_branch": "main",                       // deterministic
  "task_branch": "task-auth-login",            // deterministic
  "task_head_sha": "def4569...",               // deterministic — full 40-char sha
  "worktree_path": "/abs/path/worktrees/task-auth-login", // deterministic — absolute path to the
                                                          // task worktree on the local machine. The
                                                          // dev-review server reads this to spawn
                                                          // a live preview dev server. Not portable
                                                          // across machines, but review-data is
                                                          // per-machine anyway.
  "review_iteration": 2,                       // deterministic — passed in by runner
  "generated_at": "2026-04-24T10:30:00Z",      // deterministic

  "available_agents": [                        // deterministic — for needs-change dropdown
    {
      "name": "frontend-developer",
      "description": "UI components, React/Next.js, Tailwind"
    },
    {
      "name": "backend-developer",
      "description": "API endpoints, DB, server logic"
    },
    {
      "name": "general-developer",
      "description": "Infra, DevOps, cross-cutting"
    }
  ],

  "preview": {                                 // skill — written by Step 3
                                                // The dev-review server reads this verbatim and
                                                // does no detection of its own. Re-decided every
                                                // round; never carried over.
    "supported": true,
    "package_path": "/abs/path/worktrees/task-x/apps/design-system",
                                                // absolute. The pool spawns the dev server with
                                                //   cwd = package_path
                                                //   cmd = {package_manager} dev
                                                //   env.PORT = <free port>
    "package_manager": "pnpm",                 // "pnpm" | "yarn" | "npm" | "bun"
    "framework_hint": "vite",                  // "next-app" | "next-pages" | "vite" | "cra" |
                                                //   "expo" | "unknown" — used by the browser to
                                                //   pick a route heuristic per commit
    "dev_command": "pnpm dev",                 // informational; pool ignores and uses
                                                //   `{package_manager} dev` directly
    "rationale": "packages/ui는 build-only 라이브러리(scripts.dev 없음). apps/design-system이 @repo/ui를 workspace:*로 소비하며 vite dev 보유."
                                                // why this package was chosen; surfaced in UI
                                                // tooltip / status area
  },
  // When no package qualifies:
  // "preview": {
  //   "supported": false,
  //   "reason": "no package with scripts.dev consumes packages/ui",  // shown verbatim in UI
  //   "rationale": "..."                                              // optional
  // }

  "overview": {
    "user_request": "로그인 기능 추가...",     // deterministic seed (string) | interpretation may
                                                // replace with array<string> of locked-request bullets
    "plan_summary": "JWT 기반 인증...",        // deterministic seed (string) | interpretation may
                                                // replace with array<string> of summary bullets
    "change_map": [                            // deterministic
      { "track": "backend", "files": 5, "additions": 142, "deletions": 23 },
      { "track": "frontend", "files": 3, "additions": 88, "deletions": 12 },
      { "track": "docs", "files": 1, "additions": 14, "deletions": 0 }
    ],
    "total_commits": 4,                        // deterministic
    "total_files_changed": 9,                  // deterministic

    "plan_vs_result": [                        // interpretation — empty on failure
      {
        "plan_item": "JWT 로그인 엔드포인트 추가",
        "status": "achieved",                  // "achieved" | "partial" | "missed"
        "evidence_short_sha": "abc123a",
        "note": ""
      }
    ],
    "deviations_summary": [                    // interpretation — empty on failure
      "token 만료값이 plan의 15분 대신 30분으로 설정됨"
    ],
    "open_risks": [                            // interpretation — empty on failure
      "refresh token revocation 미구현"
    ],

    "interpretation_skipped": false            // true when agent failed and fallbacks were used
  },

  "commits": [
    {
      "id": "C1",                              // deterministic — sequential
      "sha": "abc123a4b5c6...",                // deterministic — full 40-char
      "short_sha": "abc123a",                  // deterministic — first 7
      "message_subject": "feat(auth): implement JWT-based login",
      "message_body": "이유: 기존 세션 방식은...",
      "author": "SeoJaeWan",
      "author_email": "sjw7324@nanoit.kr",
      "timestamp": "2026-04-24T09:15:00Z",
      "additions": 64,
      "deletions": 8,
      "files_changed": [                       // deterministic
        {
          "path": "src/auth.ts",
          "kind": "modified",                  // "added" | "modified" | "deleted" | "renamed"
          "old_path": null,                    // set for "renamed"
          "additions": 42,
          "deletions": 3
          // NOTE: diff_hunks is intentionally NOT inlined here.
          // The browser fetches `assets/diffs/{short_sha}.diff` and parses
          // unified-diff text on demand. This collapses ~hundreds of KB of
          // duplicate state out of review-data.json and keeps a single
          // source of truth for the actual diff bytes.
        }
      ],
      "raw_diff_path": "assets/diffs/abc123a.diff", // deterministic — relative
                                                     // path the browser fetches+parses

      "cards": [                               // interpretation
        {
          "id": "abc123a.C1",
          "title": "JWT 서명 로직 추가",
          "description": "signToken이 옵션 객체로 만료 시간을 받도록 변경",
          "fallback": false,                   // true when substituted from _fallback_cards
          "evidence": [
            {
              "file": "src/auth.ts",
              "lines": "10-22",
              "note": "signToken이 두 번째 인자로 옵션 객체를 받도록 변경", // optional; surfaced verbatim in UI
              "snippet": "function signToken(user, opts = {}) {\n  ...",  // optional — when omitted, the
                                                                          // UI lazy-fills the code from the
                                                                          // commit's raw diff using
                                                                          // file:lines as the lookup key.
                                                                          // Provide only when you can quote
                                                                          // it verbatim from the diff.
              "language": "typescript"
            }
          ]
        }
      ],

      "tests_added": [                         // interpretation
        {
          "file": "__tests__/auth.test.ts",
          "asserts": [
            "로그인 성공 시 JWT를 반환한다",
            "잘못된 비밀번호는 401을 반환한다"
          ]
        }
      ],

      "deviations": [                          // interpretation
        "plan에 명시되지 않은 src/config.ts가 수정됨"
      ],

      "addressed_by_this_commit": [            // deterministic — computed from history
        {
          "prior_card_id": "xyz111b.C2",
          "prior_comment": "토큰 만료 15분으로",
          "prior_target": { "file": "src/auth.ts", "lines": "10-22" },
          "resolution_evidence": {
            "file": "src/auth.ts",
            "lines": "11-11",
            "snippet": "const exp = opts.exp ?? 15 * 60;"
          }
        }
      ],

      "raw_diff_path": "assets/diffs/abc123a.diff",

      "_fallback_cards": [                     // deterministic — stripped from final output
        {
          "id": "abc123a.C1",
          "title": "이 commit은 2개 파일을 수정했습니다 (+64/-8)",
          "description": "자동 생성된 요약입니다. 파일 변경 목록과 전체 diff를 참고하세요.",
          "fallback": true,
          "evidence": []
        }
      ]
    }
  ],

  "final": {
    "commit_log": [                            // deterministic
      {
        "short_sha": "abc123a",
        "subject": "feat(auth): implement JWT-based login",
        "author": "SeoJaeWan",
        "timestamp": "2026-04-24T09:15:00Z"
      }
    ],
    "merge_impact": [                          // deterministic — git diff base..task_head --name-status
      { "path": "src/auth.ts", "kind": "modified" },
      { "path": "__tests__/auth.test.ts", "kind": "added" }
    ]
  }
}
```

### Notes on `_fallback_cards`

The helper always emits `_fallback_cards` for every commit (at least one card: "this commit modified X files, +Y/-Z"). The skill's Step 3 merges the interpretation agent's `cards[]` with the fallback:

- Non-empty agent `cards[]` → use agent output, strip `_fallback_cards`
- Empty agent `cards[]` → copy `_fallback_cards` into `cards[]`, mark `fallback: true`
- Always strip `_fallback_cards` from the final artifact before writing

This preserves the "every commit step has at least one card" guarantee even if the agent fails.

### Card id collision

Card ids are `{short_sha}.C{index}` where `index` starts at 1. The helper enforces uniqueness within a commit. Across commits, short_sha differences prevent collision. If two commits share a short_sha (extremely rare), the helper falls back to 8-char sha; if still colliding, it panics (abort with explicit error).

## feedback.json

```jsonc
{
  "schema_version": 1,

  "task_slug": "task-auth-login",
  "plan_signature": "a3f1c...",                // must match review-data.json to be valid
  "task_head_sha": "def4569...",               // for drift detection
  "review_status": "in_progress",              // "in_progress" | "submitted"
  "updated_at": "2026-04-24T10:45:00Z",

  "cards": {
    "abc123a.C1": {
      "status": "approved",
      "comment": ""
    },
    "abc123a.C2": {
      "status": "needs-change",
      "comment": "에러 처리가 빠졌어요",
      "target": {
        "file": "src/auth.ts",
        "lines": "34-42"
      },
      "dispatch_agent": "backend-developer"
    },
    "def456b.C1": {
      "status": "question",
      "comment": "이 변경의 의도가 무엇인가요?",
      "target": null
    },
    "def456b.C2": {
      "status": "out-of-scope",
      "comment": "이건 별도 task로 분리합니다"
    }
  },

  "preview_routes": {                            // optional — written by the
                                                 // browser when the reviewer
                                                 // edits the live preview
                                                 // panel's route input on a
                                                 // commit. Keyed by
                                                 // commit.short_sha. Picked
                                                 // up on next entry to that
                                                 // commit step.
    "abc123a": "/users/42",
    "def456b": "/settings"
  }
}
```

### Field rules

- `status` is required on every card key present in the object. Cards absent from `cards` are treated as "unreviewed" by the skill.
- `comment` may be empty string.
- `target` is optional for any status; defaults to the first evidence entry of the card in `review-data.json` when absent.
- `dispatch_agent` is **required** when `status === "needs-change"`. The skill rejects a submitted feedback that has a `needs-change` card without `dispatch_agent`, treating it as a `question` card and asking the reviewer to reopen the browser to pick an agent.
- `preview_routes` is optional. Keys are commit `short_sha`; values are paths starting with `/`. The browser uses this to override the heuristic route for that commit's iframe. The dev-review skill ignores it for routing decisions — it is purely UI state.
- Unknown fields are preserved (forward-compat).

### Round boundary

On re-entry with `review_iteration > 1`:

- If `feedback.json.plan_signature === review-data.json.plan_signature`: preserve `approved` cards whose ids still exist; clear every other card's status. Retain comments so the reviewer can see their prior thinking.
- Otherwise: discard `feedback.json` entirely and write a fresh in-progress copy.

## review-history.json

```jsonc
{
  "schema_version": 1,

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
      "resolution_state": "resolved",           // "resolved" | "active" | "superseded"
      "summary": "R1 피드백 3건 중 2건을 재작업 commit으로 해결, 1건은 채팅에서 답변함",

      "items": [
        {
          "card_id": "abc123a.C2",
          "step_id": "C1",
          "step_label": "feat(auth): implement JWT-based login",
          "user_status": "needs-change",
          "user_comment": "토큰 만료 15분으로",
          "target": { "file": "src/auth.ts", "lines": "34-42" },
          "dispatch_agent": "backend-developer",
          "resolution_route": "rework",         // "rework" | "answer" | "out-of-scope"
          "action_summary": [
            "backend-developer 재디스패치",
            "src/config.ts:5 DEFAULT_TOKEN_EXP = 900 추가",
            "src/auth.ts:11 signToken이 DEFAULT_TOKEN_EXP 참조"
          ],
          "resulting_commit_sha": "def4569...",
          "resulting_diff_evidence": [
            {
              "file": "src/config.ts",
              "lines": "5-5",
              "snippet": "export const DEFAULT_TOKEN_EXP = 900;"
            }
          ],
          "resolution_summary": "config 상수로 분리 후 auth.ts에서 참조"
        },
        {
          "card_id": "abc123a.C3",
          "step_id": "C1",
          "step_label": "feat(auth): implement JWT-based login",
          "user_status": "question",
          "user_comment": "이 패턴을 왜 골랐나요?",
          "target": null,
          "dispatch_agent": null,
          "resolution_route": "answer",
          "action_summary": [
            "채팅에서 설계 근거 답변",
            "카드 status 초기화 후 동일 commit에서 재리뷰 요청"
          ],
          "resulting_commit_sha": null,
          "resulting_diff_evidence": [],
          "resolution_summary": "채팅 답변으로 해결"
        }
      ]
    }
  ]
}
```

### History rules

- Round ids are `R{N}` where N is 1-indexed. Never reused, even after `plan_signature` change.
- `resolution_state`:
  - `active` — this round produced non-approved items that are still being worked on
  - `resolved` — all non-approved items from this round have been addressed (new commit, answer, or out-of-scope recorded)
  - `superseded` — `plan_signature` changed mid-round, this round's feedback is no longer authoritative
- `rounds[]` is append-only. The skill never edits a prior round's body; it only adds new rounds and flips `resolution_state` on the round that just closed.
- `current_task_head_sha` and `current_plan_signature` track the latest head; history rounds keep their own `source_*` / `resulting_*` fields.
- When `plan_signature` changes, previous rounds remain visible in `rounds[]` but are marked `superseded`; a new round starts fresh.

## Generator-vs-agent ownership summary

| Field | Owner | Failure behavior |
|---|---|---|
| `task_slug`, `plan_path`, `plan_signature`, `base_branch`, `task_branch`, `task_head_sha`, `review_iteration`, `generated_at` | helper | fatal if missing |
| `available_agents` | helper | empty array if no agent files found; UI shows fallback note |
| `preview` | skill (Step 3) | `{ supported: false, reason: "..." }`; UI shows "프리뷰 비활성화" |
| `overview.user_request`, `plan_summary` | helper | empty strings if plan.md minimal |
| `overview.change_map`, `total_commits`, `total_files_changed` | helper | fatal if git parsing fails |
| `overview.plan_vs_result`, `deviations_summary`, `open_risks` | agent | empty arrays + `interpretation_skipped: true` |
| `commits[].sha`, `short_sha`, `message_*`, `author*`, `timestamp`, `additions`, `deletions`, `files_changed`, `addressed_by_this_commit`, `raw_diff_path` | helper | fatal if git parsing fails |
| `commits[].cards`, `tests_added`, `deviations` | agent | `_fallback_cards` substituted, `tests_added` / `deviations` left empty |
| `final.commit_log`, `merge_impact` | helper | fatal if git parsing fails |

The boundary is strict: the agent reads the partial JSON but does not overwrite any deterministic field. The skill verifies this before writing the final artifact.
