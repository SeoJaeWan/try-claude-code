# Developer Review UI Contract

Use this reference when `orchestrator` has a reviewed plan and must collect explicit developer approval before `plan-materialize`.

## When to create

Create or refresh the review data package after `plan-review` produces a fresh `ready` or `ready-with-findings` review for the current `plan_signature`, and before materialization.

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

The orchestrator auto-starts the shared server in the background on port `9797` (see `developer-review.md` Step 5):

```text
node .codex/tools/developer-review-server.mjs
```

Open a task review at:

```text
http://localhost:9797/review/{task-slug}
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
Statuses are review signals, not direct routing keys. Orchestrator should classify non-approved feedback from the status, comment, affected step, and conflict with the current locked request before choosing `brainstorm`, `design-discovery`, `architect`, or direct chat clarification.

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
      "comment": ""
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
      "summary": "Summary of the review round and controller response.",
      "resulting_plan_signature": "abc123",
      "items": [
        {
          "step_id": "P4",
          "step_label": "Phase 4",
          "user_status": "question",
          "user_comment": "...",
          "triage_route": "answer_only",
          "action_summary": [
            "Answered the user's question.",
            "Reset feedback for same-signature re-review."
          ],
          "resolution_summary": "Same signature re-review required.",
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

## Routing after user says `review complete`

Read `feedback.json`.

- If `plan_signature` differs from the current plan signature, discard the feedback and regenerate the review data package.
- If every required step is `approved` and `review_status = submitted`, treat the current `plan_signature` as explicitly approved and continue to `plan-materialize`.
- If any required step or card is not `approved`, developer approval is absent and feedback triage is required:
  - append or update a review-history round before resetting `feedback.json`, regenerating the package, or changing `plan_signature`
  - do not route directly from the raw status label alone
  - classify non-approved feedback as `answer_only`, `request_lock`, `scope_decision`, `ui_direction`, or `plan_revision`
  - if every non-approved item is `answer_only`, answer in chat, reset `feedback.json` to a fresh in-progress review for the same `plan_signature`, and require fresh browser review
  - if any item is `request_lock` or `scope_decision`, run `brainstorm` first and only hand off to `architect` after the request is locked again
  - if any item is `ui_direction`, run `design-discovery` first unless the real blocker is still product framing, in which case return to `brainstorm`
  - if the remaining items are `plan_revision`, route the exact feedback path and affected IDs to `architect`, then rerun `plan-review` and regenerate the review data package
- If feedback is missing, incomplete, or still `in_progress`, ask the user to finish the browser review and press submit.

## Invalidations

Any change to `plan_signature` invalidates all prior developer review approvals. Regenerate the review data package and require review again.

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
