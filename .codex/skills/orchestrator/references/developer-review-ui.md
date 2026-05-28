# Developer Review UI Contract

Use this reference when `orchestrator` has a reviewed plan/TDD pair and must collect explicit developer approval before implementation.

## When to create

Create or refresh the review data package after `plan-tdd` writes current `tdd.md` and `plan-review` produces a fresh `ready` or `ready-with-findings` review for the current `plan_signature`.

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
node .codex/tools/start-plan-review-browser-server.mjs --task-slug {task-slug} --plan-signature {plan_signature}
```

The launcher prints:

```text
plan_review_browser_url=http://localhost:{port}/review/{task-slug}
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

Topology, evidence artifacts, review findings, file impacts, TDD mappings, manual smoke gates, TDD blockers, feedback handling, and scope are **comment anchors** inside those targets. They are not separate required approval gates unless a future contract explicitly promotes them.

Each target shows:

- target kind, id, title, owner agent when present, and signature state
- `Approved` control and derived review status badges
- section cards for relevant anchors
- `needs-change`, `question`, and `out-of-scope` comments attached to a target section
- prior round summaries from `review-history.json`

## review-data.json

`review-data.json` is generated from `plan.md`, linked phase files, `tdd.md`, and `review.md`.
It retains the user-readable `overview`, `phases`, topology, evidence, TDD summary, TDD mapping, and review finding fields, and adds a flat `review_items[]` list for the browser.

Required top-level fields:

```json
{
  "schema_version": 2,
  "generator_contract_version": 3,
  "task_slug": "task-slug",
  "plan_path": "plans/task-slug/plan.md",
  "plan_signature": "abc123",
  "review_outcome": "ready",
  "post_approval_next_action": "implementation",
  "post_approval_next_label": "다음 단계: 구현 실행",
  "post_approval_next_summary": "리뷰가 승인되면 현재 plan.md와 tdd.md 검증 계약을 기준으로 production code 구현을 시작합니다.",
  "title": "Task title",
  "overview": {},
  "phases": [],
  "tdd_summary": {},
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
    { "id": "file-impacts", "label": "파일 영향", "kind": "file-impact" },
    { "id": "test-mappings", "label": "Test 매핑", "kind": "test-mapping" },
    { "id": "manual-smoke", "label": "Manual smoke", "kind": "manual-smoke" }
  ]
}
```

Overview and every required phase item must have a stable `review_item_signature`.

- Prefer generating `review_item_signature` from deterministic canonical JSON of user-visible review item content plus the global scope/contract context that changes the meaning of that item.
- Include current Overview scope/contract fields in phase signatures so a scope change invalidates phase approvals even when phase prose did not change.
- Include phase-linked topology, evidence, TDD mappings, manual smoke gates, TDD blockers, and developer-review feedback handling in phase signatures.
- Do not include volatile fields such as timestamps, history, current feedback, or `review_item_signature` itself.
- Treat target ids as routing ids only. Do not carry approval forward by `P2` alone.

Phase objects expose compact plan/TDD review sections:

```json
{
  "id": "P2",
  "goal": "이 phase에서 검토자가 판단해야 할 요약입니다.",
  "file_impacts": ["파일 영향 요약"],
  "test_mappings": [
    {
      "id": "TM1",
      "phase": "P2",
      "plan_row": "P2-S1",
      "scenario_id": "AUTH-401",
      "test_id": "401이면 실패 안내와 retry가 보인다",
      "test_file": "src/auth/AuthPanel.test.tsx",
      "command": "npm test -- src/auth/AuthPanel.test.tsx",
      "status": "expected-red",
      "result": "구현 전 실패"
    }
  ],
  "manual_smoke": [],
  "tdd_blockers": [],
  "review_feedback": [
    {
      "round": "R1",
      "type": "needs-change",
      "target_id": "P2",
      "anchor_id": "test-mappings",
      "user_comment": "요청 요약",
      "resolution_summary": "처리 요약"
    }
  ]
}
```

Dense schema, RLS, API, function, state-machine, or validation details should appear only when they help explain the test mapping, manual smoke gate, or TDD blocker. Do not re-expand the browser phase view into the full plan document.

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
      "anchor_id": "test-mappings",
      "type": "needs-change",
      "body": "실패 UI 계획 항목에 대응하는 test id가 빠졌습니다.",
      "created_at": "2026-04-23T00:00:00.000Z",
      "updated_at": "2026-04-23T00:00:00.000Z"
    }
  ],
  "item_status": {
    "overview": {
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
- The left sidebar checkbox is an approval shortcut. Checking it sends `approved: true`.
- Do not expose or require a separate manual read-check control. A target is considered reviewed when it is approved or has a `needs-change`, `question`, or `out-of-scope` comment.
- Adding or editing a `needs-change` or `question` comment clears approval and removes `approved_against`.
- Adding an `out-of-scope` comment does not create approval evidence.
- Disable or reject approval while active `needs-change` or `question` comments remain on that target.

The gate is approved only when `review_status = submitted`, every required `review_items[]` entry is approved with current evidence, and no active `needs-change` or `question` comments remain.

## Review history model

`review-history.json` is durable history for the developer-review loop. It is not editable live-review state.

Keep the existing history shape:

```json
{
  "schema_version": 2,
  "task_slug": "task-slug",
  "current_plan_signature": "abc123",
  "rounds": [
    {
      "id": "R1",
      "submitted_at": "2026-04-23T00:00:00.000Z",
      "source_plan_signature": "abc123",
      "resulting_plan_signature": "def456",
      "summary": "한국어 round 요약",
      "items": [
        {
          "target_id": "P2",
          "anchor_id": "test-mappings",
          "type": "needs-change",
          "user_comment": "검토자가 요청한 내용 요약",
          "triage_route": "plan_revision",
          "action_summary": ["controller 또는 sub-agent 처리 요약"],
          "resolution_summary": "phase에 반영된 방식 요약",
          "phase_id": "P2"
        }
      ]
    }
  ]
}
```

Rules:

- Keep current editable review state in `feedback.json`.
- Append or update `review-history.json` before resetting same-signature feedback or regenerating the package after a revision.
- Do not reset live `needs-change` or `question` comments until their submitted round is represented in `review-history.json`.
- Preserve prior rounds when `plan_signature` changes.
- Browser-visible history prose fields must be Korean summaries. Preserve paths, globs, package names, code identifiers, schema keys, enum values, branch names, and signatures in their original spelling.

## Routing after user says `review complete`

Read `feedback.json`.

- If `plan_signature` differs from current plan signature, discard feedback and regenerate the package.
- If `review_status` is not `submitted`, ask the user to submit the browser review first.
- If every required review item is approved with matching `approved_against` evidence and there are no active `needs-change` or `question` comments, treat current `plan_signature` and `tdd.md` as explicitly approved and continue toward implementation readiness.
- If any required item is unapproved or any active non-approved comment exists, developer approval is absent and feedback triage is required.
- Triage from the comment body, target id, anchor id, status type, and conflict with the locked request. Do not route from the raw type label alone.

## Invalidations

Any change to `plan_signature` invalidates package-level approval, but not every item-level approval. Regenerate the review data package, carry forward only prior approved items whose current `review_item_signature` is identical, and require browser re-submit. If an item's signature is missing, changed, or unverifiable, clear that item's approval and require fresh review.

Any change to `generator_contract_version` invalidates generated review data even when `plan_signature` is unchanged. Regenerate the package before asking the user to approve.

## Guardrails

- Do not show raw `plan.md` or phase markdown as the default view.
- Do not hide `plan-review` findings.
- Do not treat evidence previews as implemented behavior.
- Do not re-expand dense schema/RLS/API/function details unless they explain a visible test mapping, manual smoke gate, TDD blocker, or evidence artifact.
- Do not treat a sidebar check as a generic read-check signal; it is an approval shortcut and must create or clear approval evidence.
- Do not reintroduce a manual read-check gate. Use approval evidence and section comments as the review state.
- Do not let `architect` reinterpret approved feedback. If feedback changes scope or direction, revise the plan and require fresh developer review.
- Do not strip `owner_agent` routing from phase data when the reviewed plan defines it.
- Do not route non-approved feedback directly to `architect` from `question` or `needs-change` labels alone.
- Do not drop previous review rounds when resetting `feedback.json` or regenerating the package.
- Do not carry forward approval by target id alone; require matching item approval evidence.
