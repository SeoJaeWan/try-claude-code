# Plan Wiki Update Sources

## User Instruction

Use direct user instructions for explicit rule edits, cleanup approvals, or requested pattern changes. Keep the edit narrow and source-backed.

## Feedback Inbox

Feedback records live in `./.codex/plan-wiki/source/feedback/inbox/*.json`.

Process them as human annotations:

1. Validate that the referenced source path still exists.
2. Relocate the selected text when present.
3. Apply typo, wording, link, and local clarification fixes directly.
4. Move records to `feedback/applied/`, `feedback/rejected/`, `feedback/needs-decision/`, or `feedback/stale/`.
5. Require approval for semantic rule changes, pattern split/merge, deletion, or registry policy changes.

## Legacy Review Input

Legacy review files may exist under `.codex/reviews/**/*.md`. They are optional input now that plugin dev no longer relies on `codex-review`.

If processed:

1. Normalize only reusable planning implications into `raw/**`.
2. Promote to `wiki/patterns/**` only when the issue can improve future planning.
3. Keep unmatched or implementation-only findings as raw or report them without promotion.
4. Delete source review files only after a successful batch and explicit cleanup approval.
