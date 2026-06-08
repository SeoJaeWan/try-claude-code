# Plan Wiki Operation History Model

Use this as the common source for plan wiki operation history records written under `./.codex/plan-wiki/source/history/`.

## Purpose

Operation history is a human-readable audit log for docs display. It records what a maintenance run did, which inputs it processed, which files changed, and which validation checks passed.

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

Operation-specific references define the exact `type`, status meaning, and extra fields for their operation.

## Shared Fields

Every history record should include:

```json
{
  "id": "20260427-161845-ingest",
  "type": "ingest",
  "status": "success",
  "started_at": "2026-04-27T16:18:45+09:00",
  "finished_at": "2026-04-27T16:19:12+09:00",
  "actor": "codex",
  "inputs": [],
  "changes": {
    "created": [],
    "updated": [],
    "deleted": [],
    "moved": [],
    "registry_changed": false
  },
  "summary": "Concise human-readable operation summary.",
  "validation": {
    "lint": "pass",
    "broken_wikilinks": 0,
    "docs_build": "not-run"
  }
}
```

Use `status` values consistently:

- `success`: requested operation completed
- `partial`: some durable output exists, but cleanup, promotion, or approval remains
- `blocked`: no source changes were made because approval, source matching, or path repair is required
- `failed`: operation attempted source changes but validation failed

## Docs Exposure

Docs may render history as latest operations, per-type operation lists, and per-record detail pages. Docs should read history records but must not derive canonical wiki content from them.

## Guardrails

- Do not store full source documents or full source reviews in history.
- Do not store long copyrighted review text in history.
- Do not store secrets, credentials, or private personal data.
- Do not use history to replay or regenerate the wiki.
