# Dev Review UI Contract (v2)

Use this reference when the dev-review server hands a fresh `review-data.json` to the browser. It defines what the SPA renders, which interactions produce feedback, and how navigation behaves.

The v2 UI is **GitHub-style PR review**: a sidebar of commits + a Files Changed panel for the selected commit, with line-anchored comments. The v1 stepper (Overview → Commit → Final) is gone.

This is the implementation-review counterpart to `.codex/skills/orchestrator/references/developer-review-ui.md`. The two UIs intentionally differ: planning review explains intent; implementation review exposes what the code actually does.

## Paths

The runner's dev-review uses a **two-root layout**: per-task data under the plan folder; HTML + vendor bundle live exclusively in the plugin and are served straight from there.

```text
plans/{key}/dev-review/              ← data-root (per-task; `key` is the
                                       plan dir's POSIX-relative path under
                                       `plans/`, can contain `/`)
├── review-data.json                 # regenerated every round, deterministic
├── feedback.json                    # written by server on each reviewer action
├── review-history.json              # append-only record of prior rounds
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
GET    /review/{key}/assets/diffs/{short_sha}.diff  # data-root raw diff
GET    /review/{key}/api/health                     # per-review diagnostic
GET    /review/{key}/api/review-data                # JSON proxy
GET    /review/{key}/api/feedback                   # JSON proxy

POST   /review/{key}/api/comment                   # create line comment
PATCH  /review/{key}/api/comment/{id}              # edit comment body / type / dispatch_agent
DELETE /review/{key}/api/comment/{id}              # delete comment
POST   /review/{key}/api/commit-status             # toggle viewed / out_of_scope
POST   /review/{key}/api/submit                    # finalize: review_status = "submitted"
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
- **History** (collapsible `<details>` below commits): one row per round, `R{N}` · `submitted_at` · short verdict tally. Click to expand round summary. Read-only.
- **Submit button** (sticky bottom):
  - Enabled when no `type === "needs-change"` comment is missing `dispatch_agent`.
  - Click triggers `POST /api/submit`.
  - If any commit has `viewed: false` and is not marked `out_of_scope`, show confirm dialog: `"커밋 N개를 보지 않았습니다. 그래도 제출하시겠습니까?"` (proceed-allowed warning).

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
   - Comment widget shows: type badge · body · `(dispatch_agent)` if needs-change · edit/delete buttons.
   - Multi-line comments: highlight the entire range (background tint) on the anchored side.

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

## Comment thread (single comment, no replies)

The v2 model is single-comment-per-anchor. No reply UI. Edit/delete only. If the reviewer wants to add another point at the same anchor, they create a separate comment (the system permits multiple comments at the same line range).

## Submit flow

- Submit button on sidebar bottom; also pinned to the top of main panel after scroll.
- Disabled when any `needs-change` comment is missing `dispatch_agent` (server-side enforcement matches).
- Warning (proceed-allowed) when any commit has `viewed: false` and `out_of_scope: false`.
- On click → `POST /api/submit` → server sets `feedback.json.review_status = "submitted"` and stamps `updated_at`.
- After submit, banner: `"리뷰가 제출되었습니다. 채팅에 '리뷰 완료'를 입력해주세요."` Comments and verdicts become read-only on this page until next round.

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

When the reviewer returns to the page after a rework round (new `review-data.json`):

- Sidebar shows new commits at the bottom (still oldest-first overall — `git log --reverse` is stable).
- New rework commits start with `viewed: false`. Earlier commits keep their `viewed` if untouched (skill-side preserved).
- Resolved `needs-change` comments are gone from the live UI; they appear in the History panel under the previous round.
- `question` comments not yet reset stay live so the reviewer can confirm them.

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
- Do NOT mutate `review-history.json` from the UI; read-only.
- Do NOT reuse v1 fields (`overview`, `cards`, `final`, `addressed_by_this_commit`, `_fallback_cards`). The schema is v2.
- Do NOT support comment threads / replies — single comment per anchor, edit/delete only.
- Do NOT block submit on unviewed commits — show warning and let the reviewer proceed.
