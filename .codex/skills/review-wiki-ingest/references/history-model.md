# Review Wiki Operation History Model

## Purpose

Operation history is a human-readable audit log for docs display. It records what a maintenance run did, which inputs it processed, and which validation checks passed.

History is not the source of truth. The source of truth remains:

- `wiki/core/**`
- `wiki/patterns/**`
- `wiki/tags/**`
- `raw/**`
- `wiki/registry.json`

## Path Contract

Write one JSON record per operation under:

`history/YYYY/MM/{YYYYMMDD-HHMMSS}-{type}.json`

Supported `type` values:

- `ingest`
- `feedback`
- `lint`
- `setup`

`review-wiki-ingest` writes `type: ingest`.

## Ingest History Record Schema

```json
{
  "id": "20260427-161845-ingest",
  "type": "ingest",
  "status": "success",
  "started_at": "2026-04-27T16:18:45+09:00",
  "finished_at": "2026-04-27T16:19:12+09:00",
  "actor": "codex",
  "inputs": [
    ".codex/reviews/feat-example/abcdef.md"
  ],
  "changes": {
    "created": [
      "raw/20260427-example-boundary-drift.md",
      "wiki/patterns/contracts-example-rule.md"
    ],
    "updated": [
      "wiki/registry.json",
      "wiki/tags/stage/review.md"
    ],
    "deleted": [
      ".codex/reviews/feat-example/abcdef.md"
    ],
    "moved": [],
    "registry_changed": true
  },
  "summary": "Ingested one review batch and promoted one reusable planning pattern.",
  "validation": {
    "lint": "pass",
    "broken_wikilinks": 0,
    "docs_build": "not-run"
  }
}
```

## Status Values

- `success`: requested batch completed and source review files were deleted
- `partial`: raw records were written but promotion or cleanup needs user decision
- `blocked`: no source changes were made because approval or path repair is required
- `failed`: operation attempted source changes but validation failed

If an ingest batch fails before source review cleanup, keep the source review files in place and write `status: failed` or `blocked` with the reason.

## Docs Exposure

Docs may render history as:

- latest operations
- ingest operations
- feedback operations
- per-record detail pages

Docs should read history records but must not derive canonical wiki content from them.

## Guardrails

- Do not store full source reviews in history.
- Do not store long copyrighted review text in history.
- Do not store secrets, credentials, or private personal data.
- Do not use history to replay or regenerate the wiki.
