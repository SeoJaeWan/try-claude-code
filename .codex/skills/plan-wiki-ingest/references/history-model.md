# Plan Wiki Ingest History Extension

Use `../plan-wiki-setup/references/history-model.md` as the common operation history model. This file defines only ingest-specific fields and status meaning.

## Ingest Record Rules

`plan-wiki-ingest` writes `type: ingest`.

The history record must summarize source review input, raw output, promoted wiki changes, registry updates, validation, and source review cleanup without storing full review text.

```json
{
  "id": "20260427-161845-ingest",
  "type": "ingest",
  "status": "success",
  "inputs": [
    ".codex/reviews/feat-example/abcdef.md"
  ],
  "changes": {
    "created": [
      "raw/20260427-계획-경계-흔들림.md",
      "wiki/patterns/common/contract/계획-경계는-하나로-고정하기.md"
    ],
    "updated": [
      "wiki/registry.json",
      "wiki/tags/common/contract.md"
    ],
    "deleted": [
      ".codex/reviews/feat-example/abcdef.md"
    ],
    "moved": [],
    "registry_changed": true
  },
  "summary": "Ingested one review batch and promoted one reusable planning pattern."
}
```

## Ingest Status Meaning

- `success`: requested batch completed and source review files were deleted
- `partial`: raw records were written but promotion or cleanup needs user decision
- `blocked`: no source changes were made because approval or path repair is required
- `failed`: operation attempted source changes but validation failed

If an ingest batch fails before source review cleanup, keep the source review files in place and write `status: failed` or `blocked` with the reason.

## Ingest Guardrails

- Do not store full source reviews in history.
- Do not delete source review files until the raw batch, wiki changes, graph links, registry updates, and history record all succeed.
