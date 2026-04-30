# Developer Review UI Contract

Use this reference when `orchestrator` has a reviewed plan and must collect explicit developer approval before `plan-tdd`.

## When to create

Create or refresh the review data package after `plan-review` produces a fresh `ready` or `ready-with-findings` review for the current `plan_signature`, and before TDD.

Do not create it for `blocked` reviews. Route blockers back to `architect`.

## Paths

Write only data, feedback, history, and preview assets under:

```text
plans/{task-slug}/developer-review/
+-- review-data.json
+-- feedback.json
+-- review-history.json
+-- assets/
    +-- previews/
    +-- diagrams/
```

Do not copy `index.html` into `plans/{task-slug}/developer-review/`.

The browser review app is a single shared HTML file:

```text
.codex/skills/orchestrator/assets/developer-review/index.html
```

The orchestrator auto-starts or reuses the shared server through the platform-neutral launcher (see `developer-review.md` Step 5):

```text
node .codex/tools/start-developer-review-server.mjs --task-slug {task-slug} --plan-signature {plan_signature}
```

The launcher prints the task review URL:

```text
developer_review_url=http://localhost:{port}/review/{task-slug}
```

The shared server supports multiple task reviews at the same time. Task-specific data is served through:

```text
GET  /api/reviews/{task-slug}/review-data
GET  /api/reviews/{task-slug}/review-history
GET  /api/reviews/{task-slug}/feedback
POST /api/reviews/{task-slug}/feedback
GET  /api/reviews/{task-slug}/health
GET  /review-assets/{task-slug}/...
```

`task-slug` must contain only ASCII letters, digits, `_`, and `-`. The server resolves all task data and asset requests under `plans/{task-slug}/developer-review/`.

The user finishes review by saying `review complete` in chat after pressing submit in the browser. Do not rely on filesystem watching as the completion signal.

## Review shape

The HTML is not a markdown viewer. It is a stepper review surface that explains the plan in user-readable form.

Steps:

1. `Overview`
2. `Phase 1`
3. `Phase 2`
4. additional phases as needed
5. `Final`

Only one step is visible at a time. The user navigates with `Previous` and `Next`.
When the visible step changes through `Previous`, `Next`, or direct step selection, scroll the review surface back to the top of the current step.

## Review model

`review-data.json` is generated from `plan.md`, linked phase files, and `review.md`.
`review-history.json` preserves prior submitted developer-review rounds plus the controller's resulting action summary so the browser UI can show what the user asked to change and how the planning loop responded.

Required top-level fields:

```json
{
  "schema_version": 1,
  "task_slug": "task-slug",
  "plan_path": "plans/task-slug/plan.md",
  "plan_signature": "abc123",
  "review_outcome": "ready",
  "title": "Task title",
  "overview": {
    "user_request": [],
    "understanding": "",
    "included_scope": [],
    "excluded_scope": [],
    "change_shape": "",
    "change_flow": [],
    "major_changes": [],
    "risks": [],
    "ui_previews": []
  },
  "phases": [],
  "review_findings": []
}
```

Phase objects:

```json
{
  "id": "P1",
  "title": "Phase title",
  "review_item_signature": "rvw-1234abcd",
  "owner_agent": "frontend-developer",
  "goal": "",
  "changes": [],
  "contracts": [],
  "file_impacts": [],
  "validation": [],
  "risks": [],
  "ui_previews": []
}
```

Overview and every phase/card that can participate in approval must have a stable `review_item_signature`.

- Prefer generating `review_item_signature` from a deterministic canonical JSON hash of only the user-visible review item content plus the global scope/contract context that changes the meaning of that item.
- Include current Overview scope/contract fields in phase signatures so a scope change invalidates phase approvals even when the phase prose did not change.
- Do not include volatile fields such as timestamps, history, current feedback, or `review_item_signature` itself.
- If a legacy package lacks `review_item_signature`, the browser/server may derive a fallback signature from `review-data.json`, but newly generated packages should write the field explicitly.
- Treat step IDs as display/routing IDs only. Do not use `P2` alone to carry approval across plan revisions because phase insertion or reordering can change its meaning.

When phase detail files define `owner_agent`, preserve that field in `review-data.json` and surface it inside each phase body. Do not require a separate sidebar summary for agent routing.

UI preview objects are allowed only for user-visible UI changes. They are plan previews, not functional prototypes:

```json
{
  "id": "UI1",
  "title": "Mobile empty state",
  "kind": "wireframe",
  "description": "How the screen should appear",
  "asset": "assets/previews/ui1.svg"
}
```

Preview `asset` values should stay relative to `plans/{task-slug}/developer-review/`. The shared HTML rewrites relative preview paths through `/review-assets/{task-slug}/...`.

## Feedback model

The server writes `feedback.json`. When writing feedback, the server rejects stale or cross-task submissions unless the posted `task_slug` and `plan_signature` match the current `review-data.json`.

Use these statuses only:

- `approved`
- `needs-change`
- `question`
- `out-of-scope`

The user controls status through HTML buttons.
Statuses are review signals, not direct routing keys. Orchestrator should classify non-approved feedback from the status, comment, affected step, and conflict with the current locked request before choosing request-scope locking, UI direction locking, `architect`, or direct chat clarification.

Expected shape:

```json
{
  "schema_version": 1,
  "task_slug": "task-slug",
  "plan_signature": "abc123",
  "review_status": "in_progress",
  "updated_at": "2026-04-23T00:00:00.000Z",
  "steps": {
    "overview": {
      "status": "approved",
      "comment": "",
      "approved_against": {
        "plan_signature": "abc123",
        "review_item_signature": "rvw-overview-1234",
        "approved_at": "2026-04-23T00:00:00.000Z",
        "carried_from_plan_signature": null
      }
    },
    "P1": {
      "status": "needs-change",
      "comment": "..."
    }
  },
  "cards": {}
}
```

When the final step is submitted, set `review_status` to `submitted`.

Approval evidence rules:

- Store `approved_against` only for `status = approved`.
- `approved_against.plan_signature` must match the current `review-data.json.plan_signature`.
- `approved_against.review_item_signature` must match the current item `review_item_signature`.
- When carrying approval forward from a previous plan signature, rewrite `approved_against.plan_signature` to the current plan signature and set `carried_from_plan_signature` to the prior signature.
- When a user changes any status/comment after submit, set `review_status` back to `in_progress` until the final step is submitted again.
- Non-approved statuses (`needs-change`, `question`, `out-of-scope`) do not carry forward across regenerated packages; preserve their submitted round in `review-history.json` instead.

## Review history model

`review-history.json` is a durable history artifact for the developer-review loop. It is not the editable live-review state.

Expected shape:

```json
{
  "schema_version": 1,
  "task_slug": "task-slug",
  "current_plan_signature": "abc123",
  "rounds": [
    {
      "id": "R1",
      "submitted_at": "2026-04-23T00:00:00.000Z",
      "source_plan_signature": "abc123",
      "resolution_state": "resolved",
      "summary": "사용자 리뷰와 컨트롤러 조치 요약입니다.",
      "resulting_plan_signature": "abc123",
      "items": [
        {
          "step_id": "P4",
          "step_label": "Phase 4",
          "user_status": "question",
          "user_comment": "사용자가 packages/ui docs metadata 갱신 범위가 현재 계획과 맞는지 확인을 요청했습니다.",
          "triage_route": "answer_only",
          "action_summary": [
            "packages/ui/src/docs/components/** 및 props meta 파일은 기존 packages/ui component API에 맞춰 갱신해도 되는 범위인지 확인했습니다.",
            "packages/ui/src/components/**의 public component implementation/API 변경은 별도 승인 전까지 범위 밖으로 유지하기로 했습니다."
          ],
          "resolution_summary": "동일 plan_signature로 재리뷰가 필요합니다.",
          "resulting_plan_signature": "abc123"
        }
      ]
    }
  ]
}
```

Rules:

- Keep current editable review state in `feedback.json`; do not overwrite historical rounds there.
- Append or update `review-history.json` before resetting same-signature feedback or regenerating the package after a revision.
- Preserve prior rounds when `plan_signature` changes; update only `current_plan_signature` and add or complete the new resolution entry.
- Record both the user's review and the controller's action summary so the next review pass can show what changed.
- Browser-visible history prose fields (`round.summary`, `items[].user_comment`, `items[].action_summary[]`, `items[].resolution_summary`) must be Korean summaries, even when the submitted feedback, prior chat, or sub-agent result is English.
- Do not copy English source prose verbatim into history prose fields. Preserve exact paths, globs, package names, code identifiers, schema keys, enum values, branch names, and signatures in their original spelling inside the Korean summaries.

## Routing after user says `review complete`

Read `feedback.json`.

- If `plan_signature` differs from the current plan signature, discard the feedback and regenerate the review data package.
- If every required step is `approved`, every approval has matching `approved_against` evidence, and `review_status = submitted`, treat the current `plan_signature` as explicitly approved and continue to `plan-tdd`.
- If any required step or card is not `approved`, developer approval is absent and feedback triage is required:
  - append or update a review-history round before resetting `feedback.json`, regenerating the package, or changing `plan_signature`
  - do not route directly from the raw status label alone
  - classify non-approved feedback as `answer_only`, `request_lock`, `scope_decision`, `ui_direction`, or `plan_revision`
  - if every non-approved item is `answer_only`, answer in chat, refresh `feedback.json` for the same `plan_signature` by preserving unchanged approved items and clearing non-approved live statuses, then require browser re-submit
  - if any item is `request_lock` or `scope_decision`, lock request scope first and only hand off to `architect` after the request is locked again
  - if any item is `ui_direction`, lock UI direction first unless the real blocker is still product framing, in which case return to request-scope clarification
  - if the remaining items are `plan_revision`, route the exact feedback path and affected IDs to `architect`, then rerun `plan-review` and regenerate the review data package with only still-matching approvals carried forward
- If feedback is missing, incomplete, or still `in_progress`, ask the user to finish the browser review and press submit.

## Invalidations

Any change to `plan_signature` invalidates package-level approval, but not every item-level approval. Regenerate the review data package, carry forward only prior `approved` items whose current `review_item_signature` is identical, and require browser re-submit. If an item's signature is missing, changed, or unverifiable, clear that item's status and require fresh review.

## Guardrails

- Do not show raw `plan.md` or phase markdown as the default view.
- Do not hide `plan-review` findings; include them in Overview or Final.
- Do not treat UI previews as implemented behavior.
- Do not let `architect` reinterpret approved feedback. If the requested feedback changes scope or direction, revise the plan and require a fresh developer review.
- Do not strip `owner_agent` routing from phase data when the reviewed plan defines it.
- Do not preserve mid-page scroll position when the reviewer moves to another step.
- Do not route non-approved feedback directly to `architect` from `question` or `needs-change` labels alone.
- Do not leave same-signature answer-only feedback in the submitted non-approved state after the controller answered it.
- Do not drop previous review rounds when resetting `feedback.json` or regenerating the package.
- Do not mix editable current feedback controls with historical review/action evidence.
- Do not carry forward approval by step ID alone; require matching item approval evidence.
