# Review Wiki Lint Checklist

## Scope

Lint the review wiki for routing integrity and evidence integrity. Favor narrow fixes over broad cleanup.

## Checks

- every wiki document used for planning is registered in `wiki/index.md`
- every promoted rule has at least one valid `raw_sources` backlink
- `raw_sources` targets actually exist
- duplicate rules are merged or clearly separated by scope
- stale guidance is identified when raw evidence or current policy no longer supports it
- new documents still fit the routing-index model instead of becoming freeform note sprawl

## Report Path

Write the proposed cleanup to:

`wiki/_meta/lint-report.md`

## Report Structure

Use this shape:

```md
# Review Wiki Lint Report

## Summary
- date:
- scope:
- blocking issues:
- optional tidy-ups:

## Proposed Changes
- [ ] change 1
- [ ] change 2

## Deferred
- item

## Approval
- status: pending
- approved scope:
```

## Approval Rule

- Draft the report first.
- Stop and wait for explicit user approval.
- Apply only the approved subset.
- Refresh the report after applying changes.

## Guardrails

- Do not delete raw evidence without explicit approval.
- Do not rewrite entire wiki documents when a focused rule edit is enough.
- Do not invent new rules during lint unless the user explicitly asks for that.
