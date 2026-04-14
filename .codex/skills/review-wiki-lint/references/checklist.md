# Review Wiki Lint Checklist

## Scope

Lint the review wiki for routing integrity and evidence integrity. Favor narrow fixes over broad cleanup.

## Checks

- `wiki/registry.json` exists and is valid JSON
- every core document listed in the registry exists
- every registered pattern file exists
- every pattern file under `wiki/patterns/` is registered in the registry
- every promoted pattern has at least one valid `raw_sources` backlink
- `raw_sources` targets actually exist
- duplicate rules are merged or clearly separated by scope
- conflicting rules are flagged across exact and adjacent tag groups
- stale guidance is identified when raw evidence or current core contract no longer supports it
- tag vocabulary matches the registry taxonomy
- overbroad tags or weak `Apply When` clauses are identified
- new pattern files still fit the one-file-per-rule registry model instead of becoming freeform note sprawl

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
