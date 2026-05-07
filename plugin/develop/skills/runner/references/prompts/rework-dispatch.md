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

## Commit rules (the dev-review UI reads these back verbatim)
- Format: `{type}(scope): {description}`. Allowed types: feat / fix /
  refactor / docs / chore / style / test. Imperative mood, ~72
  characters or less.
- Do NOT include phase or rework-round identity in the message.
- Body is required and written in Korean, exactly 2 lines:
    Line 1 = 리뷰 피드백이 요구한 변경
    Line 2 = 그 변경이 피드백을 어떻게 해소하는지
  Do NOT prefix labels (`작업:` / `이유:`). Subject stays English.
- Full spec: `plugin/develop/references/commit-convention.md`.
