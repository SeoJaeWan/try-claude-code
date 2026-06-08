# Plan Wiki Feedback History Extension

Use `../plan-wiki-setup/references/history-model.md` as the common operation history model. This file defines only feedback-specific fields and status meaning.

## Feedback Record Rules

`plan-wiki-apply-feedback` writes `type: feedback`.

Include `outcomes` to summarize feedback routing:

```json
{
  "id": "20260427-161845-feedback",
  "type": "feedback",
  "status": "success",
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
    "updated": [
      "wiki/core/common/계획-산출물-계약.md"
    ],
    "moved": [
      {
        "from": "feedback/inbox/20260427-153012-plan-artifact-contract.json",
        "to": "feedback/applied/20260427-153012-plan-artifact-contract.json"
      }
    ],
    "registry_changed": false
  },
  "summary": "Updated wording in the plan artifact contract page."
}
```

## Feedback Status Meaning

- `success`: requested feedback batch completed
- `partial`: some inputs were applied and some moved to `needs-decision`, `stale`, or `rejected`
- `blocked`: no source changes were made because approval or source matching is required
- `failed`: operation attempted source changes but validation failed

If validation fails after source edits, stop, preserve the failed history record, and do not move successful-looking feedback to `applied` until the wiki state is repaired.

## Feedback Guardrails

- Do not skip history just because no wiki source file changed; `needs-decision`, `stale`, and `blocked` outcomes are useful to docs readers.
- Do not store full feedback source documents in history.
