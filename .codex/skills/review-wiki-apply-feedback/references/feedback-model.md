# Review Wiki Feedback Model

## Path Contract

- Review wiki root: `~/.codex/reviewWiki`
- Feedback inbox: `feedback/inbox/`
- Feedback outcome roots:
  - `feedback/applied/`
  - `feedback/rejected/`
  - `feedback/needs-decision/`
  - `feedback/stale/`
- Source document roots:
  - `wiki/core/`
  - `wiki/patterns/`
  - `wiki/tags/`
  - `raw/`

Use `~/.codex/reviewWiki` as the only stable entrypoint. Do not hardcode the underlying vault path.

## Feedback JSON Schema

Each feedback record should use this shape:

```json
{
  "id": "20260427-153012-plan-artifact-contract",
  "status": "inbox",
  "source_path": "wiki/core/plan-artifact-contract.md",
  "doc_url": "/core/plan-artifact-contract",
  "title": "Plan artifact contract",
  "selection": {
    "quote": "short selected text",
    "prefix": "text before selection",
    "suffix": "text after selection"
  },
  "feedback": {
    "type": "wording",
    "comment": "Human feedback."
  },
  "created_at": "2026-04-27T15:30:12+09:00"
}
```

Required fields:

- `id`
- `status`
- `source_path`
- `selection.quote`
- `feedback.type`
- `feedback.comment`
- `created_at`

Recommended fields:

- `doc_url`
- `title`
- `selection.prefix`
- `selection.suffix`
- `selection.anchor`
- `user_agent`

## Feedback Types

Suggested `feedback.type` values:

- `wording`
- `typo`
- `terminology`
- `missing-explanation`
- `missing-condition`
- `missing-example`
- `raw-link`
- `tag-link`
- `pattern-semantics`
- `new-pattern-candidate`
- `delete-or-merge`
- `registry-or-taxonomy`
- `docs-ui`

Unknown types are allowed, but classify them before editing source files.

## Status Values

- `inbox`: captured and not processed yet
- `applied`: source wiki change was made
- `needs-decision`: user approval is required
- `stale`: selected text can no longer be matched confidently
- `rejected`: invalid or contradicted by source evidence

Do not delete processed feedback records. Move them to the matching outcome folder and update `status`.

## Selection Matching

Use this order:

1. Exact `selection.quote` match in `source_path`
2. Exact quote plus nearest `prefix` and `suffix`
3. Single fuzzy match only when the quote is unique and surrounding text clearly points to the same paragraph

If several plausible matches remain, use `needs-decision` rather than guessing.

If the source file is missing, use `stale`.

If the selected text exists only in `wiki/tags/**`, identify the linked source document that should own the change. Tag pages are readable graph hubs and should normally be regenerated from source.

## Direct Apply Policy

Directly apply feedback when all are true:

- The selected source location is found confidently.
- The requested change is local wording, typo, terminology, missing explanation, missing example, or link alias cleanup.
- The change does not alter a rule's planning meaning.
- Existing raw evidence supports the new wording.
- Registry, taxonomy, filenames, rule ids, and raw ids do not change.

Use `needs-decision` when any of these are true:

- A pattern rule would be created, deleted, split, merged, renamed, or semantically changed.
- A raw evidence record would be promoted or demoted.
- `wiki/registry.json` or tag taxonomy would change.
- The feedback asks to remove or reinterpret evidence.

Use `rejected` only when the feedback contradicts raw evidence, asks to corrupt machine-readable identifiers, or is not actionable.

## Outcome Record Fields

When moving a feedback file out of `inbox`, add:

```json
{
  "processed_at": "2026-04-27T16:19:12+09:00",
  "processed_by": "codex",
  "outcome": {
    "status": "applied",
    "summary": "Updated wording in the source pattern page.",
    "changed_files": [
      "wiki/patterns/example-rule.md",
      "wiki/tags/stage/review.md"
    ],
    "history_id": "20260427-161845-feedback"
  }
}
```

Keep the original feedback fields intact.
