# Developer Review UI Contract

Use this reference when `orchestrator` has a reviewed plan and must collect explicit developer approval before `plan-tdd`.

## When to create

Create or refresh the review data package after `plan-review` produces a fresh `ready` or `ready-with-findings` review for the current `plan_signature`, and before TDD.

Do not create it for `blocked` reviews. Route blockers back to `architect`.

## Paths

Write only data, feedback, history, and copied evidence assets under:

```text
plans/{task-slug}/developer-review/
+-- review-data.json
+-- feedback.json
+-- review-history.json
+-- assets/
    +-- evidence/
    +-- previews/
    +-- diagrams/
```

Do not copy `index.html` into `plans/{task-slug}/developer-review/`.

The shared browser app lives at:

```text
.codex/skills/orchestrator/assets/developer-review/index.html
```

Start or reuse it through:

```text
node .codex/tools/start-developer-review-server.mjs --task-slug {task-slug} --plan-signature {plan_signature}
```

The launcher prints:

```text
developer_review_url=http://localhost:{port}/review/{task-slug}
```

The server supports multiple task reviews at the same time. Task-specific data is served through:

```text
GET    /api/reviews/{task-slug}/review-data
GET    /api/reviews/{task-slug}/review-history
GET    /api/reviews/{task-slug}/feedback
POST   /api/reviews/{task-slug}/comment
PATCH  /api/reviews/{task-slug}/comment/{id}
DELETE /api/reviews/{task-slug}/comment/{id}
POST   /api/reviews/{task-slug}/item-status
POST   /api/reviews/{task-slug}/submit
GET    /api/reviews/{task-slug}/health
GET    /review-assets/{task-slug}/...
```

`task-slug` must contain only ASCII letters, digits, `_`, and `-`. The server resolves all task data and asset requests under `plans/{task-slug}/developer-review/`.

The user finishes review by pressing Submit in the browser and saying `review complete` in chat. Do not rely on filesystem watching as the completion signal.

## Review shape

The UI is runner dev-review aligned: a fixed left sidebar of review targets and a right pane for the selected target. It is not a stepper and it does not expose raw markdown as the default view.

Required review targets are:

- `overview`
- every phase item, normally `P1`, `P2`, ...

Topology, evidence artifacts, review findings, contracts, file impacts, validation, risks, and scope are **comment anchors** inside those targets. They are not separate required approval gates unless a future contract explicitly promotes them.

Each target shows:

- target kind, id, title, owner agent when present, and signature state
- `Viewed` and `Approved` controls
- section cards for relevant anchors
- `needs-change`, `question`, and `out-of-scope` comments attached to a target section
- prior round summaries from `review-history.json`

## review-data.json

`review-data.json` is generated from `plan.md`, linked phase files, and `review.md`.
It retains the user-readable `overview`, `phases`, topology, evidence, and review finding fields, and adds a flat `review_items[]` list for the browser.

Required top-level fields:

```json
{
  "schema_version": 2,
  "task_slug": "task-slug",
  "plan_path": "plans/task-slug/plan.md",
  "plan_signature": "abc123",
  "review_outcome": "ready",
  "post_approval_next_action": "plan-tdd",
  "post_approval_next_label": "다음 단계: $plan-tdd",
  "post_approval_next_summary": "리뷰가 승인되면 production code 구현 전에 승인된 plan.md 기준으로 source-tree TDD 계약 테스트와 tdd.md를 작성합니다.",
  "title": "Task title",
  "overview": {},
  "phases": [],
  "topology_contract": [],
  "evidence_artifacts": [],
  "review_findings": [],
  "review_items": []
}
```

Review item shape:

```json
{
  "id": "P1",
  "label": "Phase title",
  "kind": "phase",
  "required": true,
  "owner_agent": "frontend-developer",
  "review_item_signature": "rvw-1234abcd",
  "summary": "이 phase의 목표입니다.",
  "anchors": [
    { "id": "contracts", "label": "계약", "kind": "contract" },
    { "id": "file-impacts", "label": "파일 영향", "kind": "file-impact" }
  ]
}
```

Overview and every required phase item must have a stable `review_item_signature`.

- Prefer generating `review_item_signature` from deterministic canonical JSON of user-visible review item content plus the global scope/contract context that changes the meaning of that item.
- Include current Overview scope/contract fields in phase signatures so a scope change invalidates phase approvals even when phase prose did not change.
- Do not include volatile fields such as timestamps, history, current feedback, or `review_item_signature` itself.
- Treat target ids as routing ids only. Do not carry approval forward by `P2` alone.

## Feedback model

The server writes `feedback.json`. The browser writes granular updates through comment, item-status, and submit endpoints. Whole-file `POST /feedback` may remain as a compatibility path, but new UI code should use granular endpoints.

Expected shape:

```json
{
  "schema_version": 2,
  "task_slug": "task-slug",
  "plan_signature": "abc123",
  "review_status": "in_progress",
  "updated_at": "2026-04-23T00:00:00.000Z",
  "comments": [
    {
      "id": "cm_001",
      "target_id": "P1",
      "anchor_id": "contracts",
      "type": "needs-change",
      "body": "계약의 no-op 조건을 더 명확히 써주세요.",
      "created_at": "2026-04-23T00:00:00.000Z",
      "updated_at": "2026-04-23T00:00:00.000Z"
    }
  ],
  "item_status": {
    "overview": {
      "viewed": true,
      "approved": true,
      "approved_against": {
        "plan_signature": "abc123",
        "review_item_signature": "rvw-overview-1234",
        "approved_at": "2026-04-23T00:00:00.000Z",
        "carried_from_plan_signature": null
      }
    }
  }
}
```

Comment types:

- `needs-change`
- `question`
- `out-of-scope`

Approval evidence rules:

- Store `approved_against` only when `item_status[target_id].approved === true`.
- `approved_against.plan_signature` must match current `review-data.json.plan_signature`.
- `approved_against.review_item_signature` must match the current review item signature.
- When carrying approval forward from a previous plan signature, rewrite `approved_against.plan_signature` to the current plan signature and set `carried_from_plan_signature` to the prior signature.
- Non-approved comments do not carry forward across regenerated packages; preserve their submitted round in `review-history.json` instead.
- When a non-approved comment is added to a target, clear that target's approval.

The gate is approved only when `review_status = submitted`, every required `review_items[]` entry is approved with current evidence, and no active `needs-change` or `question` comments remain.

## Review history model

`review-history.json` is durable history for the developer-review loop. It is not editable live-review state.

Keep the existing history shape:

```json
{
  "schema_version": 2,
  "task_slug": "task-slug",
  "current_plan_signature": "abc123",
  "rounds": []
}
```

Rules:

- Keep current editable review state in `feedback.json`.
- Append or update `review-history.json` before resetting same-signature feedback or regenerating the package after a revision.
- Preserve prior rounds when `plan_signature` changes.
- Browser-visible history prose fields must be Korean summaries. Preserve paths, globs, package names, code identifiers, schema keys, enum values, branch names, and signatures in their original spelling.

## Routing after user says `review complete`

Read `feedback.json`.

- If `plan_signature` differs from current plan signature, discard feedback and regenerate the package.
- If `review_status` is not `submitted`, ask the user to submit the browser review first.
- If every required review item is approved with matching `approved_against` evidence and there are no active `needs-change` or `question` comments, treat current `plan_signature` as explicitly approved and continue to `plan-tdd`.
- If any required item is unapproved or any active non-approved comment exists, developer approval is absent and feedback triage is required.
- Triage from the comment body, target id, anchor id, status type, and conflict with the locked request. Do not route from the raw type label alone.

## Invalidations

Any change to `plan_signature` invalidates package-level approval, but not every item-level approval. Regenerate the review data package, carry forward only prior approved items whose current `review_item_signature` is identical, and require browser re-submit. If an item's signature is missing, changed, or unverifiable, clear that item's approval and require fresh review.

## Guardrails

- Do not show raw `plan.md` or phase markdown as the default view.
- Do not hide `plan-review` findings.
- Do not treat evidence previews as implemented behavior.
- Do not let `architect` reinterpret approved feedback. If feedback changes scope or direction, revise the plan and require fresh developer review.
- Do not strip `owner_agent` routing from phase data when the reviewed plan defines it.
- Do not route non-approved feedback directly to `architect` from `question` or `needs-change` labels alone.
- Do not drop previous review rounds when resetting `feedback.json` or regenerating the package.
- Do not carry forward approval by target id alone; require matching item approval evidence.
