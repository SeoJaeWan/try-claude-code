# Plan dispatch prompt

The runner skill copies this prompt verbatim into the single `Agent(...)` plan
dispatch call in Step 3. Placeholders in `{{...}}` are substituted from the
runner state JSON before sending. Edit this file (not the SKILL prose) when
the plan-agent contract changes.

Substitutions the runner skill must perform before dispatch:

| Placeholder | Source field | Example |
|---|---|---|
| `{{worktree_path}}` | `state.worktree_path` | `worktrees/feat-login` |
| `{{plan_path}}` | `state.plan_path` | `plans/login.plan.md` |
| `{{state_path}}` | absolute path of `.runner-state.json` | `.../plans/login/.runner-state.json` |
| `{{author_notes_dir}}` | `dirname(state_path)` + `/dev-review/author-notes-input` (absolute) | `.../plans/login/dev-review/author-notes-input` |

The dispatched call uses `subagent_type: state.owner_agent` and
`description: "Plan: " + state.plan_slug`. These are not part of the prompt
body and the hooks no longer parse them — they exist only for human
readability in the transcript.

---

## Working directory
You are working in: {{worktree_path}}
cd to this directory before starting any work.

## Plan + state
Plan file: {{plan_path}}
Runner state: {{state_path}}
Read the plan as your spec. The state JSON records progress (status,
last reviewed commit, dev-review round, block history) and is the only
place runner-side metadata lives — do NOT modify it; that is the runner
skill's responsibility.

## Rules
- Work directly in your current directory.
- Do NOT create additional worktrees or use EnterWorktree.
- **Each phase in the plan MUST be exactly one git commit.** Combining
  multiple phases into a single commit is forbidden. Splitting a single
  phase across multiple commits is allowed only when the phase
  explicitly says so. The dev-review UI shows one commit per
  review unit — collapsing phases hides reviewer-visible boundaries.
- Do NOT commit-amend across phases — every phase produces its own commit.
- Only implement what the plan describes. Do NOT pull in adjacent work.

## When a tool call is blocked
If any tool call returns `decision: block` with a `[runner` reason,
**immediately stop and return the full block reason verbatim in your
final message** (do NOT retry the same call or paraphrase the reason).
The runner replays from the main session — your job is to surface the
exact wording so the runner can decide whether to re-dispatch.

## Commit rules (the dev-review UI reads these back verbatim)
- Format: `{type}(scope): {description}`. scope is optional; description
  uses imperative mood and stays within ~72 characters.
- Allowed types: feat / fix / refactor / docs / chore / style / test.
- Do NOT include phase identity in the commit — no "phase 2 — ...",
  no "[Phase 2] ...", no "2단계: ...".
- Body is **required and written in Korean**, exactly 2 lines:
    Line 1 = 무엇 (이 커밋이 한 변경의 핵심)
    Line 2 = 왜 (동기·제약·맥락 — diff만으로 드러나지 않는 정보)
  Do NOT prefix labels (`작업:` / `이유:`); line position alone
  communicates the role. Subject stays English.
  Self-evident changes (typo, formatting, dep bump) may use a single
  Korean WHAT line as an escape hatch — use sparingly.
- Commit each phase with `git add -A && git commit -m '...'` using a
  HEREDOC or `-m`+`-m` for the body.
- Full spec: `claude-plugin/develop/references/commit-convention.md`.

## AI 근거 노트 (author notes)

The reviewer reads your diff in a GitHub-style UI. The commit body explains
the WHY at the commit level, but some specific lines deserve a pointed
explanation right next to the code — the non-obvious decision, the thing you
want a second opinion on, the load-bearing logic. After committing each
phase, leave those as **line-anchored notes** so they render as inline "AI
설명" comments on the exact lines.

You anchor by **code snippet, not line number** — the runner resolves the
snippet to the right diff line later, so your notes survive even if a later
phase shifts the lines.

**After each phase commit**, if (and only if) that commit has parts worth
explaining, append a notes file:

- Path: `{{author_notes_dir}}/<short_sha>.json` where `<short_sha>` is the
  first 7 chars of the commit you just made
  (`git rev-parse --short=7 HEAD`). Create the directory if needed
  (`mkdir -p`). This path is **outside your worktree** — do NOT `git add` or
  commit it; it is review metadata, not code.
- Shape:

  ```json
  {
    "commit_sha": "<full 40-char sha of this commit — git rev-parse HEAD>",
    "notes": [
      {
        "file": "src/auth.ts",
        "anchor": "const token = jwt.sign(payload",
        "occurrence": 1,
        "category": "핵심 로직",
        "body": "만료를 15분으로 둔 이유: refresh 토큰과 분리해 탈취 시 노출 창을 줄임."
      }
    ]
  }
  ```

**Field rules:**

- `file` — must be a file this commit actually changed (a path in the
  commit's diff).
- `anchor` — a short substring of a line **you added or changed** in this
  commit (the new version of the code). Pick something distinctive on that
  line. If the same text appears on multiple changed lines in that file, set
  `occurrence` to the 1-based position (default 1).
- `category` — exactly one of: `핵심 로직` (load-bearing logic),
  `리뷰 요청` (you specifically want the reviewer to weigh in on this
  approach), `트레이드오프/우회` (a compromise or workaround), `phase 핵심`
  (the core deliverable of this phase). `리뷰 요청` is highlighted in the UI,
  so use it deliberately.
- `body` — Korean, 1–3 sentences. The actual reasoning a reviewer couldn't
  get from the diff alone.

**Be conservative — quality over coverage.** Annotate only what genuinely
needs it: the decision someone would question, the logic that carries the
phase, the spot you want reviewed. A note per changed line is noise. A
trivial commit (rename, formatting, obvious wiring) may have **zero** notes —
just skip the file. These notes are read-only context for the reviewer; they
never trigger rework on their own.
