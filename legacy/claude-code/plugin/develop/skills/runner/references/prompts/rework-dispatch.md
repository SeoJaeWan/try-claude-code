# Rework dispatch prompt

The runner skill copies this prompt verbatim into each rework `Agent(...)`
call in Step 4 (one dispatch per `feedback.json` rework_item).
Placeholders in `{{...}}` are substituted from the runner state JSON and
the rework_item before sending.

Substitutions the runner skill must perform before each dispatch:

| Placeholder | Source field | Example |
|---|---|---|
| `{{worktree_path}}` | `state.worktree_path` | `worktrees/feat-login` |
| `{{commit_short_sha}}` | `rework_item.short_sha` | `a1b2c3d` |
| `{{commit_subject}}` | `rework_item.message_subject` | `feat(login): add form` |
| `{{comments_block}}` | rendered `rework_item.comments[]` (one bullet per comment) | see template below |
| `{{author_notes_dir}}` | `dirname(state_path)` + `/dev-review/author-notes-input` (absolute) | `.../plans/login/dev-review/author-notes-input` |

The dispatched call uses `subagent_type: rework_item.dispatch_agent`
(reviewer's UI choice — authoritative, do NOT override). The dispatch
description is whatever the runtime produces; rework dispatches are not
`Plan: ...` calls.

The rendered `{{comments_block}}` should look like:

```
- src/login.tsx:L20-L24 (side: RIGHT): "Move validation to a hook"
- src/login.test.tsx:L8 (side: RIGHT): "Add edge case for empty input"
```

---

## Working directory
You are working in: {{worktree_path}}
cd to this directory before starting any work.

## Context
You are revising prior work based on reviewer feedback. The code already
exists in this worktree; build on it, do not redo prior commits.

## Target commit
- Commit: {{commit_short_sha}} — {{commit_subject}}
- This is the commit the reviewer flagged. The follow-up commit you
  create should address every line comment listed below.

## Feedback (line-anchored comments on this commit)
{{comments_block}}

## Instructions
Apply the feedback. Do NOT touch unrelated files. Do NOT rebase or amend
existing commits.

## When a tool call is blocked
If any tool call returns `decision: block` with a `[runner` reason,
**immediately stop and return the full block reason verbatim in your
final message** (do NOT retry the same call or paraphrase the reason).
The runner replays from the main session — your job is to surface the
exact wording so the runner can decide what to do next.

## Commit rules (the dev-review UI reads these back verbatim)
- Format: `{type}(scope): {description}`. Allowed types: feat / fix /
  refactor / docs / chore / style / test. Imperative mood, ~72
  characters or less.
- Do NOT include phase or rework-round identity in the message.
- Body is required and written in Korean, exactly 2 lines:
    Line 1 = 리뷰 피드백이 요구한 변경
    Line 2 = 그 변경이 피드백을 어떻게 해소하는지
  Do NOT prefix labels (`작업:` / `이유:`). Subject stays English.
- Full spec: `claude-plugin/develop/references/commit-convention.md`.

## AI 근거 노트 (author notes)

Your follow-up commit is reviewed just like the original. If the change you
made involves a non-obvious decision — especially one driven by *how* you
chose to resolve the feedback — leave a line-anchored note so it renders as
an inline "AI 설명" comment for the reviewer.

After your rework commit, if it has anything worth explaining, append:

- Path: `{{author_notes_dir}}/<short_sha>.json`, `<short_sha>` = first 7 chars
  of the commit you just made (`git rev-parse --short=7 HEAD`). `mkdir -p` the
  directory if needed. This is **outside the worktree** — do NOT `git add` or
  commit it.
- Same shape and field rules as the plan dispatch:

  ```json
  {
    "commit_sha": "<full sha — git rev-parse HEAD>",
    "notes": [
      { "file": "src/login.tsx", "anchor": "useValidation(", "occurrence": 1,
        "category": "리뷰 요청",
        "body": "검증 로직을 훅으로 분리했는데, 이 추상화 수준이 적절한지 봐주세요." }
    ]
  }
  ```

- `anchor` is a substring of a line you added/changed in **this** commit;
  `category` is one of `핵심 로직` / `리뷰 요청` / `트레이드오프/우회` /
  `phase 핵심`; `body` is Korean, 1–3 sentences.

Be conservative — annotate only what genuinely needs explaining. Zero notes
is fine for a small fix. These notes are read-only and never trigger rework.
