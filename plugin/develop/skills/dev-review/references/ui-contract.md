# Dev Review UI Contract (v2)

Use this reference when the dev-review server hands a fresh `review-data.json` to the browser. It defines what the SPA renders, which interactions produce feedback, and how navigation behaves.

The v2 UI is **GitHub-style PR review**: a sidebar of commits + a Files Changed panel for the selected commit, with line-anchored comments. The v1 stepper (Overview → Commit → Final) is gone.

This is the implementation-review counterpart to `.codex/skills/orchestrator/references/planning-docs-ui.md`. The two UIs intentionally differ: planning review explains intent; implementation review exposes what the code actually does.

## Paths

The runner's dev-review uses a **two-root layout**: per-task data under the plan folder; HTML + vendor bundle live exclusively in the plugin and are served straight from there.

```text
plans/{key}/dev-review/              ← data-root (per-task; `key` is the
                                       plan dir's POSIX-relative path under
                                       `plans/`, can contain `/`)
├── review-data.json                 # regenerated every round, deterministic
├── feedback.json                    # written by server on each reviewer action
├── review-history.json              # append-only record of prior rounds
├── author-notes.json                # resolved AI rationale notes (helper-written, read-only)
├── author-notes-input/              # agent-written snippet-anchored input (one file per commit)
│   └── {short_sha}.json
└── assets/
    └── diffs/
        └── {short_sha}.diff         # one raw unified diff per commit

plugin/develop/skills/dev-review/    ← html-root (one global copy)
└── assets/
    ├── index.html                   # served at "/"
    └── vendor/
        ├── diff2html.min.js         # diff renderer
        ├── diff2html.min.css
        ├── highlight.min.js         # syntax highlighting (used by diff2html)
        └── highlight-theme.css
```

Serve with the **plugin-internal** dev-review server (NOT the orchestrator's). The dev-review skill auto-starts it in the background on port `9797`:

```text
node "${CLAUDE_PLUGIN_ROOT}/develop/skills/dev-review/scripts/server.mjs"
```

The server is **multi-review** and **discovery-based**: it walks `plans/` on every request and serves any directory containing `dev-review/review-data.json`, including nested plans (`plans/foo/bar/dev-review/...` is reachable at `/review/foo/bar/`). The URL key is the directory's POSIX-relative path under `plans/`, so URL paths can contain `/`. Parallel Claude sessions share the same port.

## URL routing

`{key}` below is the review's relative path under `plans/` and may contain
slashes (e.g. `foo`, `foo/bar`). The router resolves it by longest-prefix
match against the discovered set; nothing else parses or validates it.

```text
GET    /api/health                                  # server diagnostic; kind:"dev-review"
GET    /                                            # picker page — lists every discovered review
GET    /review/{key}/                               # SPA shell, with <base href="/review/{key}/">
GET    /review/{key}/vendor/{...}                   # plugin html-root assets
GET    /review/{key}/review-data.json               # data-root JSON (proxied)
GET    /review/{key}/feedback.json                  # data-root JSON (proxied)
GET    /review/{key}/review-history.json            # data-root JSON (proxied)
GET    /review/{key}/author-notes.json              # data-root JSON (proxied; read-only AI notes)
GET    /review/{key}/assets/diffs/{short_sha}.diff  # data-root raw diff
GET    /review/{key}/api/health                     # per-review diagnostic
GET    /review/{key}/api/review-data                # JSON proxy
GET    /review/{key}/api/feedback                   # JSON proxy

POST   /review/{key}/api/comment                   # create line comment (optional in_reply_to: {round_id, comment_id})
PATCH  /review/{key}/api/comment/{id}              # edit comment body / type / dispatch_agent
DELETE /review/{key}/api/comment/{id}              # delete comment
POST   /review/{key}/api/commit-status             # toggle viewed / out_of_scope
POST   /review/{key}/api/submit                    # finalize: review_status = "submitted"
POST   /review/{key}/api/reopen                    # unlock: review_status = "in_progress" (no history write)
```

The HTML uses purely relative URLs; the server injects `<base href="/review/{key}/">` per request so every fetch resolves correctly.

The reviewer finishes by saying `리뷰 완료` in chat. The UI does not signal completion to the shell directly — the skill polls `feedback.json.review_status` only on re-entry, never mid-turn.

## Page model

### Layout

```
┌────────────────────┬──────────────────────────────────────────────┐
│ Sidebar            │ Main panel                                    │
│ ──────────────     │ ───────────────────────────────────────────   │
│ Task title         │ Commit header                                 │
│ Round badge        │  • short_sha · subject · meta-line            │
│                    │  • message_body (collapsible if >2 lines)     │
│ Commits            │                                               │
│ ▣ abc123a (●2)     │ Files changed                                 │
│ ▢ 1f3a7c2 ✓        │  ▸ src/auth.ts (+42/-3)                       │
│ ▢ 7d8e1aa (?1)     │  ▸ __tests__/auth.test.ts (+22/-0)            │
│ ▢ b0a530e          │                                               │
│                    │ Diff (unified | split toggle)                 │
│ History (collapse) │  hunk @@ -10,3 +10,5 @@                       │
│  R1 · 2026-04-24   │  - removed line                               │
│  R2 · 2026-04-25   │  + added line                                 │
│                    │       └── inline comment widget               │
│ ─────────────      │                                               │
│ [Submit review]    │                                               │
└────────────────────┴──────────────────────────────────────────────┘
```

### Sidebar

- **Task header** at top: `task_slug`, `@{short_task_head_sha}` badge.
- **Commits list** (scrollable):
  - Order = `review-data.json.commits[]` order (oldest first, matches `git log --reverse`).
  - Each item: viewed checkbox · short_sha · subject (line-clamped to 2 lines) · status badge.
  - Status badge derived from comments + commit_status:
    - `out_of_scope: true` → `out-of-scope` badge (gray)
    - has `needs-change` comment → red dot + `(N)` count
    - has `question` comment (no needs-change) → amber dot + `(N)` count
    - otherwise + `viewed: true` → green ✓
    - otherwise → no badge (unreviewed)
  - Active commit highlighted with accent border.
- **History** (collapsible `<details>` below commits): newest round first. Each round is itself an expandable `<details>` — header is `R{N}` · `resolution_state` · `submitted_at` · short comment tally; expanding shows every comment from that round (type badge + `file:Lline` + body) and, under each, the **response it received** (`↳ rework` / `↳ 답변` / `↳ out-of-scope`, the resulting commit short sha, and the summary). Read-only.
- **Submit button** (sticky bottom):
  - Enabled when no `type === "needs-change"` comment is missing `dispatch_agent`.
  - Click triggers `POST /api/submit`.
  - If any commit has `viewed: false` and is not marked `out_of_scope`, show confirm dialog: `"커밋 N개를 보지 않았습니다. 그래도 제출하시겠습니까?"` (proceed-allowed warning).
- **Reopen button** (sticky bottom, only while `review_status === "submitted"`):
  - Click triggers `POST /api/reopen` → `review_status` back to `in_progress`, re-enabling edits on the current round. For the "I submitted too early" case before saying `리뷰 완료`. Does not touch history.

### Main panel — commit view

1. **Commit header**
   - Row 1: short_sha badge · author · ISO timestamp · `+additions / -deletions` · file count.
   - Row 2: `message_subject` (h2).
   - Row 3: `message_body` rendered as `<pre>`-style block (whitespace preserved, no markdown). Collapsed when ≥ 3 lines, with "전체 보기" toggle.

2. **Per-commit verdict toolbar** (sticky just under the header)
   - Two controls only:
     - **`Viewed` checkbox** — toggles `commit_status[sha].viewed`. Auto-saves via `POST /api/commit-status`.
     - **`Out of scope` toggle** — toggles `commit_status[sha].out_of_scope`. When enabled, shows muted "이 커밋은 리뷰 범위 외로 표시됨" and visually dims the diff (still browsable). Any existing `needs-change` comments on this commit are visually annotated "out-of-scope으로 인해 무시됨" but not deleted.
   - Verdict (approved / needs-change / question / out-of-scope) is derived from comments — no explicit verdict button.

3. **Files changed list** (collapsible, default expanded)
   - Per-file row: `▸ {path} ({kind}) (+{add}/-{del})`. Click scrolls to that file's diff section in the panel.
   - Binary files: badge "binary" · diff section shows placeholder "Binary file — diff not rendered. Comments disabled."

4. **Diff sections** (one per file, in `files_changed[]` order)
   - Toggle in file header: `Unified` (default) / `Split`. Per-file scope, persisted to `localStorage` (`devreview.diffMode = "unified" | "split"`).
   - Rendered via `diff2html`'s `Diff2HtmlUI` from the raw diff fetched from `assets/diffs/{short_sha}.diff`. Pass options:
     - `outputFormat: "line-by-line"` for unified, `"side-by-side"` for split.
     - `drawFileList: false` (we render our own file list above).
     - `highlight: true` and ensure `hljs` is loaded.
   - Each row has `data-line-number-new` / `data-line-number-old` from diff2html. We attach our drag handlers to these.

5. **Inline comment widgets**
   - Existing comments for this commit — fetch from `feedback.json.comments[]` filtered by `commit_sha === commit.sha`.
   - For each comment, find the row in the diff with `(file, side, line_start, line_end)` and inject a sibling `<tr class="comment-thread">` directly below the deepest anchored row.
   - Comment widget shows: type badge · body · `(dispatch_agent)` if needs-change · edit/delete buttons. A comment carrying `in_reply_to` also shows a `↳ {round_id}의 코멘트에 대한 후속 지시` chip above its body.
   - Multi-line comments: highlight the entire range (background tint) on the anchored side.

5b. **Inline past-round history (read-only)**
   - Past-round reviewer comments come from `review-history.json.rounds[].comments_snapshot[]`, filtered by `commit_sha === commit.sha`. They render inline on the **same** anchored line as a `<tr class="history-thread">` (muted/gray, left-bordered), grouped per anchor, oldest round first.
   - The anchored commit is immutable, so the snapshot's line numbers stay valid across rounds — no snippet re-resolution needed (unlike AI notes).
   - Each past comment shows: round badge (`R1`) · type badge · anchor · original body · the response it received (`↳ rework / ↳ 답변 / ↳ out-of-scope`, the resulting commit short sha, and the summary). When the past comment itself carried `in_reply_to`, a `↳ {round_id} 후속` chip is shown.
   - **Reply (B-lite follow-up).** While `review_status !== "submitted"`, each past comment has a `후속 지시 달기` button. It opens the standard comment popup **pre-filled with the same anchor** (`commit_sha / file / side / line range`) and sets `in_reply_to = { round_id, comment_id }` pointing at that past comment. The reviewer picks a type and writes a body; the result is an ordinary current-round live comment that simply carries `in_reply_to`. There is no nested thread store — the link is one field, and the visual "chain" is just past widgets and the new live comment sharing one line.
   - The history layer is **read-only**: no edit/delete on past comments, and it never enters `feedback.json` or gates submit. It is the same record the sidebar `History` panel renders, shown inline for context.

6. **AI author notes (read-only)**
   - The author/rework agent's "왜 이렇게 했는지" rationale, fetched from `author-notes.json.notes[]` filtered by `commit_sha === commit.sha`. Anchored on the **new** side only.
   - Rendered with the same `<tr>`-injection machine as comments, but as `<tr class="ai-note-thread">` with a distinct indigo style. The widget is intentionally minimal: **just the note body** — no badge, no category chip, no anchor text. The indigo left-border container is the only marker distinguishing an AI note from a reviewer comment. The `category` field is kept in the data but not displayed as text; a `리뷰 요청` note still gets a subtle amber left-border (`ai-note-inner.has-review-request`) as a non-text cue, nothing more.
   - **Read-only**: no edit/delete, no popup. The reviewer adds their own comment separately if they want to respond. AI notes are NOT part of `feedback.json`, do NOT count toward submit gating, and are NOT archived to `review-history.json`.
   - When a reviewer comment, an AI note, and past-round history all land on the same line, render order top-to-bottom is `code row → AI note → past-round history (oldest→newest) → live comment`. All three layers insert at the code row's `nextSibling`, so the renderer inserts live comments first, then history, then notes (the last insert lands closest to the code). A single `renderInlineLayers(root, commit)` tears out and rebuilds all three layers so the order is identical on the full render and the incremental feedback refresh.

## Drag-to-comment interaction

GitHub-style. Triggered on the diff's gutter (line-number column).

1. **Hover** a line gutter on either side → `+` button appears (small button overlaid on the gutter).
2. **Click `+`** on line N → opens new-comment popup anchored at line N (start = end = N).
3. **Drag** from line N to line M on the same side → range selection [N, M] with visual highlight, then opens popup.
4. **Shift-click** on line M after a click on line N → same range as drag.
5. **Cross-side / cross-file / cross-hunk** drags are blocked (drag is cancelled, no popup).

### Popup contents

- Anchor display: `{file} L{start}` or `{file} L{start}–L{end}`, side badge.
- `body` textarea (auto-grow). Empty body allowed.
- **Type radio**: `needs-change` / `question` / `out-of-scope`. Required.
- **Dispatch agent dropdown**: shown ONLY when type === `needs-change`. Options from `available_agents[]`. Required for `needs-change`.
- Buttons: `Save` (POST /api/comment) · `Cancel`.
- Editing an existing comment uses the same popup (PATCH instead of POST). Delete button triggers DELETE.

## Comment thread (single comment, no nested replies)

The v2 model is single-comment-per-anchor with **no nested reply store**. Within a round, edit/delete only; multiple comments may share one anchor as independent entries. The one cross-round link is `in_reply_to`: a follow-up comment is a normal current-round comment that records `{ round_id, comment_id }` pointing at a past comment (created via the `후속 지시 달기` button on an inline history widget). This is a flat link for display + agent context, not a recursive thread — there is no reply-to-a-reply UI, and the data stays single-comment-per-anchor.

## Submit flow

- Submit button on sidebar bottom; also pinned to the top of main panel after scroll.
- Disabled when any `needs-change` comment is missing `dispatch_agent` (server-side enforcement matches).
- Warning (proceed-allowed) when any commit has `viewed: false` and `out_of_scope: false`.
- On click → `POST /api/submit` → server sets `feedback.json.review_status = "submitted"` and stamps `updated_at`.
- After submit, banner: `"리뷰가 제출되었습니다. 채팅에 '리뷰 완료'를 입력해주세요."` Comments and verdicts become read-only on this page until next round. A `Reopen for another round` button appears so the reviewer can unlock the current round without hand-editing JSON (`POST /api/reopen`).

## Diff rendering details

### Unified vs split

- diff2html handles both. Toggle is per-file, not global.
- Default unified for first viewing; remembered per browser via `localStorage`.

### Line numbers / sides

- diff2html attaches `data-line-number` and `data-side` (`new`/`old`) to each row. Our drag handler reads these to compute `(side, line_start, line_end)`.
- For deleted lines, only `old` side is anchorable. For added lines, only `new`. For context lines, default to `new` (right side) on click.

### Syntax highlighting

- diff2html uses `hljs` internally. Load `vendor/highlight.min.js` and `vendor/highlight-theme.css` before initializing diff2html.
- No language hint required; diff2html auto-detects from file extension via hljs.

### Collapsed context

- diff2html supports its own context expansion. Use default options (no manual collapse logic).

### Binary / empty

- `files_changed[i].binary === true` → render placeholder card, no diff fetch, no comment buttons.
- Empty diff (file moved with no content change) → render "rename only" placeholder.

## Round re-entry behavior

Every `리뷰 완료` closes the round and the skill reopens a clean one (see `review-data-schema.md` → "Round boundary"). When the reviewer returns to the page after re-entry (whether rework added commits or qa was answer-only):

- Sidebar shows the current commit set, oldest-first. After rework, new commits appear at the bottom.
- The live `comments[]` is empty — **all** of the previous round's comments moved to History. The reviewer re-reviews every commit from scratch.
- Every commit's `viewed` resets to `false`; `out_of_scope` is preserved per sha.
- The previous round's comments **and the response each one received** are visible (read-only) two ways: by expanding that round in the sidebar History panel, **and** inline on each comment's original diff line (the `history-thread` layer). On the inline copy, `후속 지시 달기` starts a follow-up comment in the fresh round, linked via `in_reply_to`.

## Invalidations

The package is invalid when:

- `plan_signature` in `feedback.json` doesn't match `review-data.json` → reload page; the skill regenerated.
- `task_head_sha` in `feedback.json` doesn't match → reload page.
- `available_agents[]` no longer includes a `dispatch_agent` selected on a comment → comment is highlighted red, reviewer must update before submit.

The browser polls `/api/feedback` and `/api/review-data` only on initial load and after each user action's response. No background polling.

## Guardrails

- Do NOT render `review-data.json` as raw JSON to the reviewer — it is a model, not a surface.
- Do NOT enable Submit while any `needs-change` comment lacks `dispatch_agent`.
- Do NOT allow drag selection across files, hunks, or sides.
- Do NOT auto-resolve `needs-change` comments client-side; the skill owns round-boundary cleanup.
- Do NOT mutate `review-history.json` from the UI; read-only. The inline `history-thread` layer renders it but never writes it; `후속 지시 달기` creates a new comment in `feedback.json`, it does not edit the past comment.
- Do NOT reuse v1 fields (`overview`, `cards`, `final`, `addressed_by_this_commit`, `_fallback_cards`). The schema is v2.
- Do NOT support nested comment threads / reply-to-a-reply. The only cross-round link is a flat `in_reply_to` on a normal comment; within a round it stays single-comment-per-anchor with edit/delete only.
- Do NOT block submit on unviewed commits — show warning and let the reviewer proceed.
- Do NOT let AI author notes (`author-notes.json`) enter `feedback.json`, gate submit, or appear in history — they are read-only review context rendered as their own `ai-note-thread` rows.
