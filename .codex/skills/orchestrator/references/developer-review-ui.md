# Developer Review UI Contract

Use this reference when `orchestrator` has a reviewed plan and must collect explicit developer approval before `plan-materialize`.

## When to create

Create the review package after `plan-review` produces a fresh `ready` or `ready-with-findings` review for the current `plan_signature`, and before materialization.

Do not create it for `blocked` reviews. Route blockers back to `architect`.

## Paths

Write the package under:

```text
plans/{task-slug}/developer-review/
├── index.html
├── review-data.json
├── feedback.json
└── assets/
    ├── previews/
    └── diagrams/
```

Use the shared browser app template:

```text
.codex/skills/orchestrator/assets/developer-review/index.html
```

Serve and persist feedback with:

```text
node .codex/tools/developer-review-server.mjs plans/{task-slug}/developer-review
```

The user finishes review by saying `리뷰 완료` in chat. Do not rely on filesystem watching as the completion signal.

## Review shape

The HTML is not a markdown viewer. It is a stepper review surface that explains the plan in user-readable form.

Steps:

1. `Overview`
2. `Phase 1`
3. `Phase 2`
4. additional phases as needed
5. `Final`

Only one step is visible at a time. The user navigates with `Previous` and `Next`.

## Review model

`review-data.json` is generated from `plan.md`, linked phase files, and `review.md`.

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
  "goal": "",
  "changes": [],
  "contracts": [],
  "file_impacts": [],
  "validation": [],
  "risks": [],
  "ui_previews": []
}
```

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

## Feedback model

The server writes `feedback.json`.

Use these statuses only:

- `approved`
- `needs-change`
- `question`
- `out-of-scope`

The user controls status through HTML buttons.

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

## Routing after user says `리뷰 완료`

Read `feedback.json`.

- If `plan_signature` differs from the current plan signature, discard the feedback and regenerate the review UI.
- If any step or card is `needs-change`, `question`, or `out-of-scope`, pass the exact feedback path and summarized IDs to the next `architect` revision, then rerun `plan-review` and regenerate the review UI.
- If every required step is `approved` and `review_status = submitted`, treat the current `plan_signature` as explicitly approved and continue to `plan-materialize`.
- If feedback is missing, incomplete, or still `in_progress`, ask the user to finish the browser review and press submit.

## Invalidations

Any change to `plan_signature` invalidates all prior developer review approvals. Regenerate the review package and require review again.

## Guardrails

- Do not show raw `plan.md` or phase markdown as the default view.
- Do not hide `plan-review` findings; include them in Overview or Final.
- Do not treat UI previews as implemented behavior.
- Do not let `architect` reinterpret approved feedback. If the requested feedback changes scope or direction, revise the plan and require a fresh developer review.
