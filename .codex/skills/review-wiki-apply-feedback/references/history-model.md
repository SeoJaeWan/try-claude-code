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

Write one JSON record per successful or blocked operation under:

`history/YYYY/MM/{YYYYMMDD-HHMMSS}-{type}.json`

Supported `type` values:

- `ingest`
- `feedback`
- `lint`
- `setup`

`review-wiki-apply-feedback` writes `type: feedback`.

## History Record Schema

```json
{
  "id": "20260427-161845-feedback",
  "type": "feedback",
  "status": "success",
  "started_at": "2026-04-27T16:18:45+09:00",
  "finished_at": "2026-04-27T16:19:12+09:00",
  "actor": "codex",
  "inputs": [
    "feedback/inbox/20260427-153012-plan-artifact-contract.json"
  ],
  "outcomes": {
    "applied": 1,
    "needs_decision": 0,
    "stale": 0,
    "rejected": 0
  },
  "changes": {
    "created": [],
    "updated": [
      "wiki/core/plan-artifact-contract.md"
    ],
    "deleted": [],
    "moved": [
      {
        "from": "feedback/inbox/20260427-153012-plan-artifact-contract.json",
        "to": "feedback/applied/20260427-153012-plan-artifact-contract.json"
      }
    ],
    "registry_changed": false
  },
  "summary": "Updated wording in the plan artifact contract page.",
  "validation": {
    "lint": "pass",
    "broken_wikilinks": 0,
    "docs_build": "not-run"
  }
}
```

## Status Values

- `success`: requested batch completed
- `partial`: some inputs were applied and some moved to `needs-decision`, `stale`, or `rejected`
- `blocked`: no source changes were made because approval or source matching is required
- `failed`: operation attempted source changes but validation failed

If validation fails after source edits, stop, preserve the failed history record, and do not move successful-looking feedback to `applied` until the wiki state is repaired.

## Docs Exposure

Docs may render history as:

- latest operations
- ingest operations
- feedback operations
- per-record detail pages

Docs should read history records but must not derive canonical wiki content from them.

## Guardrails

- Do not store full source documents in history.
- Do not store long copyrighted review text in history.
- Do not store secrets, credentials, or private personal data.
- Do not use history to replay or regenerate the wiki.
- Do not skip history just because no wiki source file changed; `needs-decision`, `stale`, and `blocked` outcomes are useful to docs readers.
