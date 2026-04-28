# Dev Review UI Contract

Use this reference when `dev-review` has generated a fresh `review-data.json` and is about to copy `assets/index.html` into the task package. It defines what the browser UI is allowed to render, which interactions produce feedback, and how navigation behaves.

This is the implementation-review counterpart to `.codex/skills/orchestrator/references/developer-review-ui.md`. The two UIs intentionally differ because the reviewer's mental task differs: planning review asks "is this intent right?", implementation review asks "did this code do the right thing, and does it match what I asked?".

## Paths

The runner's dev-review uses a **two-root layout**: per-task data lives in the plan folder; HTML and the highlight.js vendor bundle live exclusively in the plugin and are served straight from there. The data folder is data-only.

```text
plans/{task_slug}/dev-review/        ← data-root (per-task)
├── review-data.json                # regenerated every round
├── feedback.json                   # written by server on each reviewer action
├── review-history.json             # append-only record of prior rounds
└── assets/
    └── diffs/
        └── {short_sha}.diff        # one raw unified diff per commit

plugin/develop/skills/dev-review/    ← html-root (one global copy)
└── assets/
    ├── index.html                  # served at "/"
    └── vendor/
        ├── highlight.min.js        # served at "/vendor/..."
        └── highlight-theme.css
```

Serve with the **plugin-internal** dev-review server (NOT the orchestrator's server in `.codex/tools/`). The dev-review skill auto-starts this in the background on port `9797` (see SKILL.md Step 6):

```text
node "${CLAUDE_PLUGIN_ROOT}/develop/skills/dev-review/scripts/server.mjs"
```

The server is **multi-review**: one process hosts every task under `plans/*/dev-review/` and routes them at `/review/{task-slug}`. The reviewer opens `http://localhost:9797/review/{task_slug}` for each task; parallel Claude sessions share the same port without collision (the second session's health-check finds the first one and reuses it).

URL routing inside the server:

```text
GET  /api/health                                  # server diagnostic; returns kind:"dev-review"
GET  /                                            # listing page
GET  /review/{slug}                               # SPA shell, with <base href="/review/{slug}/">
GET  /review/{slug}/vendor/{...}                  # plugin html-root assets
GET  /review/{slug}/review-data.json              # plans/{slug}/dev-review/
GET  /review/{slug}/feedback.json                 # plans/{slug}/dev-review/
GET  /review/{slug}/review-history.json           # plans/{slug}/dev-review/
GET  /review/{slug}/assets/diffs/{...}            # plans/{slug}/dev-review/assets/diffs/
GET  /review/{slug}/api/health                    # per-review diagnostic w/ plan_signature
GET  /review/{slug}/api/review-data               # JSON proxy
GET  /review/{slug}/api/feedback                  # JSON proxy
POST /review/{slug}/api/feedback                  # write w/ task_slug + plan_signature check
GET  /review/{slug}/api/preview/status            # live preview pool state; lazy-spawns dev server
```

The HTML uses purely relative URLs; the server injects `<base href="/review/{slug}/">` per request so every fetch (`review-data.json`, `vendor/highlight.min.js`, `assets/diffs/abc.diff`, `api/feedback`) resolves into the right slug's URL space without any per-task HTML mutation.

The orchestrator's planning-review server at `.codex/tools/developer-review-server.mjs` is a separate process for a separate workflow. The two never share state and should never be used interchangeably.

The reviewer finishes by saying `리뷰 완료` in chat. The UI does not signal completion to the shell.

## Page model

The UI is a single-page stepper. Only one step is visible at a time, and navigation scrolls the review surface back to the top of the step on change (Previous / Next / sidebar click).

Step order:

1. `Overview` — preview, no feedback
2. `C1`, `C2`, …, `Cn` — one step per commit in `review-data.json.commits[]`, in order
3. `Final` — preview, no feedback

### Overview step (preview-only)

Read-only summary that helps the reviewer ground themselves before diving into commits. It renders the following sections from `review-data.json.overview`:

- **User request** — full paragraph from the original task request
- **Plan summary** — one-paragraph excerpt of the plan's scope / major changes
- **Change map** — horizontal bar or table per track (`frontend`, `backend`, `db`, `config`, `docs`, `other`) showing `files`, `+additions`, `-deletions`
- **Totals** — `total_commits`, `total_files_changed`
- **Plan vs Result** — the `plan_vs_result[]` list rendered as rows: plan item · status badge (`achieved` green, `partial` amber, `missed` red) · evidence commit link (click scrolls to that commit step)
- **Deviations summary** — `deviations_summary[]` as a list
- **Open risks** — `open_risks[]` as a list

If interpretation was skipped (agent failure), show an inline notice at the top of Overview: "자동 해석 실패 — 카드별 fallback 요약으로 진행합니다." Hide the `plan_vs_result` / `deviations_summary` / `open_risks` sections when they are empty rather than rendering empty blocks.

No buttons, no textareas, no dropdowns on Overview. The sidebar dot is omitted.

### Commit step (feedback-bearing)

Rendered from one element of `review-data.json.commits[]`. Sections in order:

1. **Commit header**
   - Step label: `C{N}` · short_sha badge
   - Title: `message_subject` verbatim
   - Meta line: `author` · `timestamp` · `+additions / -deletions` · files_changed count
   - Collapsible `message_body` below the title when present

2. **Addressed-from-prior-round block** (only when this commit appears in `commits[i].addressed_by_this_commit[]`)
   - One card per prior-round `needs-change` item this commit is claimed to address
   - Each prior card shows: prior card id · prior reviewer comment · short summary of what changed · link to the prior card in the history view
   - Keep this block collapsed by default unless the reviewer expanded prior history

3. **Cards**
   - Render each `commits[i].cards[j]` as a card block:
     - Card title
     - 1–2 line description
     - Evidence snippets (see "Evidence rendering" below)
     - Feedback controls (see "Feedback controls" below)
   - Cards marked as generator fallback (flag in the card object) get a subtle "자동 생성" badge so the reviewer knows no semantic summary was produced.

4. **Files changed table**
   - Rows: path · kind (`added` / `modified` / `deleted` / `renamed`) · `+additions` / `-deletions`
   - Clicking a row expands a file-level diff view (see "Diff rendering").

5. **Tests added** (when non-empty)
   - Per-file list: test file path, followed by natural-language assertions

6. **Deviations** (when non-empty)
   - Bullet list of strings from `commits[i].deviations[]`

7. **QA findings for this commit** (when non-empty)
   - Subset of overview QA findings that name a file changed in this commit
   - Severity badges: `info`, `warn`, `fail`

8. **Full diff** (always last, collapsed by default)
   - Anchor to `assets/diffs/{short_sha}.diff` — clicking expands inline, not a new tab
   - Rendered with the same diff component as file-level diffs but unconstrained in length

### Final step (preview-only)

Read-only summary from `review-data.json.final`:

- **Commit log** — table of all commits (short_sha · subject · author · timestamp)
- **Merge impact** — files that will change if `task_branch` is merged into `base_branch` (`path` · `kind`)
- **Final verdict** — computed live from `feedback.json`:
  - "모든 카드가 승인되었습니다. Step 5 진행 준비 완료." when every card is `approved` or `out-of-scope`
  - "아직 승인되지 않은 카드 N개가 있습니다." otherwise, with a count badge

No feedback controls. The verdict helps the reviewer know whether a `리뷰 완료` reply will move the runner forward or trigger a rework round.

## Preview panel (commit steps only)

A right-side sticky panel that embeds the worktree's dev server in an iframe so the reviewer sees the rendered UI alongside the commit's diff. Visible only on commit steps; hidden on Overview / Final and on viewports narrower than 1280px.

### Lifecycle

- On the first commit-step entry, the browser polls `GET api/preview/status` every 2s until the server reports `status === "ready"`.
- The dev-review server lazily spawns the dev server on the first poll. `pnpm install` runs first if `node_modules` is absent.
- The dev server runs on a separate free port; `status.url` is `http://localhost:{N}` (cross-origin to the dev-review UI). The iframe `src` is built as `status.url + route`.
- After 10 minutes of inactivity the dev-review server SIGTERMs the dev server. The next poll respawns it.

### Status badge

Top-left of the panel head:

| `status` | Badge label | Body |
|---|---|---|
| `unsupported` | "미지원" (warn) | Inline reason ("no scripts.dev", etc.) |
| `installing` | "install 중" (warn) | "node_modules 설치 중…" |
| `spawning` | "부팅 중" (warn) | "dev server 부팅 중…" |
| `ready` | "ready" (pass) | iframe |
| `error` | "오류" (fail) | error message |
| iframe load timeout (5s) | "로드 실패" (fail) | "iframe 로드 실패. 코드 변경만 검토하세요." |

### Route resolution

For each commit step, the iframe loads `status.url + route` where `route` is, in priority order:

1. `feedback.json.preview_routes[commit.short_sha]` — reviewer override
2. Client-side heuristic on the commit's first card's first evidence file:
   - Next App Router (`app/foo/page.tsx` → `/foo`, `(group)` segments dropped)
   - Next Pages Router (`pages/foo.tsx` → `/foo`, `pages/index.tsx` → `/`)
3. `/`

The framework hint comes from `api/preview/status.framework_hint`, derived server-side from the chosen package's `package.json` deps (`next` / `vite` / `react-scripts` / `expo`). Vite/CRA/Expo always fall through to step 3 because their routers are runtime-defined.

### Route input

A monospace text field next to the badge. Default value is the resolved route (above). Edits commit on `change` (blur) or Enter:

- The iframe reloads immediately with the new path.
- The value is saved to `feedback.json.preview_routes[commit.short_sha]` (or removed when reset to `/`).
- Re-entering the commit step re-loads the saved route, not the heuristic.

The iframe is cross-origin, so reviewer-driven in-iframe navigation cannot be tracked automatically. To "save" the route the reviewer landed on, they must type it into the input field and press Enter.

### Hide-on-narrow

At viewports under 1280px the `.shell` falls back to 2-column layout and the panel is `display: none`. The reviewer can still complete the review purely from the diff/cards.

## Cards

### Card identity

Stable id: `{short_sha}.C{index}`. The index is the card's position within its commit's `cards[]`, starting at 1. Id is regenerated each round from the final `review-data.json`. Re-runs keep the same id when:

- the same `short_sha` is still present in the new `review-data.json`, and
- the card at the same position still exists

When commits are reordered (not expected — the runner appends, does not rewrite history), ids shift. The UI tolerates this because feedback is keyed by id; cards that no longer appear in `review-data.json` are dropped from `feedback.json` on the next package regeneration.

### Evidence rendering

Each card has `evidence[]` with `{file, lines, snippet, language?}`.

- Render a header line: `{file}:{lines}` with a click-to-copy affordance
- Render `snippet` inside a `<pre><code class="language-{language}">` block
- Apply `highlight.js` to the `<code>` element after insertion (`hljs.highlightElement`)
- When `language` is absent, let highlight.js auto-detect

Snippet length is not hard-capped in v1. When a snippet is unusually long (over ~200 lines) the UI may collapse to the first 40 lines with a "전체 보기" toggle; do not truncate silently. The generator already tries to keep evidence snippets focused — over-long snippets usually mean the agent picked the whole function on purpose.

### Feedback controls

Each card exposes:

1. **Status segmented control** — four buttons:
   - `Approve` → `approved`
   - `Needs change` → `needs-change`
   - `Question` → `question`
   - `Out of scope` → `out-of-scope`
   Default (no selection) is the baseline "unreviewed" state.

2. **Comment textarea** — single-line grows to multi-line. Autosaves to `feedback.json` via `POST /api/feedback` after a short debounce (~400 ms).

3. **Target override** — when the reviewer wants to pin feedback to a different file / line range than the auto-selected first evidence, a small `target` editor (file autocomplete + "lines" text field) lets them override.
   - Default value: first evidence entry of the card
   - When the override field is cleared, the server stores `null` and the skill treats that as "no target" — the rework re-dispatch prompt falls back to the comment only. Prefer keeping a target for better re-dispatch precision.

4. **Dispatch agent dropdown** — shown only when `status === "needs-change"`.
   - Options come from `review-data.json.available_agents[]`
   - Required field; the "Submit all" button is disabled until every `needs-change` card has a selection
   - Label each option with its role hint (e.g., `frontend-developer`, `backend-developer`, `general-developer`)

### Card status rollup

Step-level dot color in the sidebar:

- Every card `approved` or `out-of-scope` → green
- Any card `needs-change` → red
- Any card `question` (and no `needs-change`) → amber
- Any card still `unreviewed` → gray outline

Overview and Final have no dot; they are navigation-only.

## Submit flow

- The UI auto-saves each field change, so there is no "save" button per card.
- A single "Submit all reviews" button on the Final step (and sticky at the bottom of the last commit step) sets `feedback.json.review_status = "submitted"`.
- The Submit button is disabled until:
  - every card has a non-empty `status`, and
  - every `needs-change` card has a `dispatch_agent` selected
- After submit, show a small confirmation banner: "리뷰가 제출되었습니다. 채팅에 '리뷰 완료'를 입력해주세요."

## Diff rendering

The diff component supports both unified and split modes. Default is unified; a per-file toggle sits in the file header.

### Unified (default)

- Each hunk header line `@@ -a,b +c,d @@` shown as a subtle row
- Removed lines: left border red, background tinted
- Added lines: left border green, background tinted
- Context lines: plain

### Split (opt-in per file)

- Two columns, left = before, right = after
- Rows align hunk-by-hunk; within a hunk, the UI pads the shorter side with empty rows so line numbers align visually
- Line-level intra-word highlighting is out of scope for v1

### Collapsed context

- By default, the diff component shows each changed line with 3 lines of context above and below
- "… X unchanged lines (expand)" markers between hunks; clicking expands the hidden context from the backing `.diff` file
- The backing file is `assets/diffs/{short_sha}.diff` — always full diff, the UI decides what to hide

### Syntax highlighting

- `highlight.js` is loaded from `assets/vendor/highlight.min.js`
- Theme is `assets/vendor/highlight-theme.css` — a single theme that reads well on the warm background of the page
- Apply highlight per visible hunk, not per full file, to keep large diffs responsive
- When language detection is uncertain, fall back to plain text with diff coloring only

## Addressed badges

For each prior-round `needs-change` card, the current round's `review-data.json` carries a computed `addressed_in` pointer:

```json
{
  "card_id": "abc123a.C1",
  "addressed_in": "def456b",
  "status": "addressed" | "still-open"
}
```

Rendered in two places:

1. **Inside the prior commit step** (C1 in the example above), under the original card: a badge reading either `addressed in def456b` (links to that commit step) or `still open`.

2. **Inside the resolving commit step** (C5, the one that addressed the earlier card): an "Addressed-from-prior-round block" at the top listing the prior cards this commit resolved.

The badges are hints, not gates. The reviewer can still mark the prior card as `approved` or leave it `needs-change` regardless of the badge. The generator assigns `addressed` when the prior card's `target.file` appears in the resolving commit's diff; otherwise `still-open`.

## History

`review-history.json` is read by the UI to render a "Review history" panel on the sidebar (below the step list). For each round, show:

- Round number and `submitted_at`
- `source_task_head_sha` → `resulting_task_head_sha`
- Per-item triage: prior card id · reviewer comment · dispatch_agent · resulting commit
- Collapsed by default; click to expand a single round

History is append-only and survives `plan_signature` changes. Current editable state lives in `feedback.json`; history never overwrites it.

## Invalidations

Any of the following invalidates the current package:

- `plan_signature` change (plan was edited between rounds)
- `task_head_sha` advanced but `review-data.json` still points at the old head
- `available_agents[]` changed such that a selected `dispatch_agent` no longer exists

The skill regenerates the package and the reviewer starts from the current Overview. Approved cards for commits that still exist are preserved; everything else resets.

## Guardrails

- Do NOT show raw `plan.md` as a page. Overview is curated preview, not a markdown viewer.
- Do NOT show `review-data.json` as JSON to the reviewer — it is a model, not a surface.
- Do NOT enable the Submit button while any card is unreviewed or any `needs-change` card lacks `dispatch_agent`.
- Do NOT render addressed badges as ALLOW/BLOCK gates; they are hints and the reviewer can override.
- Do NOT mutate `review-history.json` from the UI. The skill writes it; the UI reads it.
- Do NOT preserve mid-page scroll when navigating between steps. Always reset to the step top.
- Do NOT silently hide empty sections inside a commit step; show them with a "없음" muted line so the reviewer knows the section was intentionally empty, not missing. Exception: collapsible sections (Full diff, message body, Addressed block) stay collapsed when empty.
- Do NOT style Overview or Final steps like commit steps. They are preview pages and should read as summary surfaces, not feedback surfaces.
- Do NOT present `dispatch_agent` as a free-text field. Dropdown with `available_agents[]` only; unknown values cause re-dispatch failures downstream.
