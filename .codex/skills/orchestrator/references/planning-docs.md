# Planning Docs

## Table of Contents

- Step 5. Planning docs gate
- Step 6. Triage planning docs feedback
- Step 7. Capture planning docs learning

## Step 5. Planning Docs Gate

Always require explicit planning docs approval after `plan-tdd` and fresh `plan-review`.

At the gate:

- Read `./references/planning-docs-ui.md`.
- Create or refresh `./plans/{task-slug}/planning-docs/` for current `plan_signature`.
- Do not copy `./assets/planning-docs/index.html` into the plan folder; the shared server serves the fixed HTML app from `.codex`.
- Generate `review-data.json` from current `plan.md`, linked phase detail files, current `tdd.md`, and fresh `review.md`.
- Parse `plan.md` `## 파일/폴더 구조 계약` and `## 체험 산출물` tables into `review-data.json.topology_contract` and `review-data.json.evidence_artifacts`.
- Parse `tdd.md` plan-review sections into `review-data.json.tdd_summary`, phase `test_mappings`, `manual_smoke`, and `tdd_blockers`.
- Validate every evidence `경로` as a relative `evidence/**` path under the plan folder, copy it to `plans/{task-slug}/planning-docs/assets/evidence/**`, and expose only the copied asset path in review data.
- Treat `ui-preview` evidence as planning docs 검토자의 판단 자료. The package must expose the copied HTML/CSS preview and its review points, but must not decide whether the reviewer should approve the preview.
- Create or refresh `review-history.json` for current `task-slug` and `plan_signature`.
- Ensure `review-data.json.review_items[]` contains `overview` and every required Phase target with a stable `review_item_signature`; include global scope/contract context in phase signatures so scope changes invalidate affected approvals.
- Include topology, evidence, and TDD mapping metadata in review item signatures so changes to phase-linked paths, responsibilities, input/output harnesses, evidence content, test mappings, manual smoke gates, or TDD blockers invalidate stale approval.
- Include a `generator_contract_version` in `review-data.json`. When the generator/UI contract changes, stale packages with an older or missing version must be regenerated even if `plan_signature` is unchanged.
- Ensure `review-data.json` is user-readable and not a raw markdown dump:
  - Overview shows the user's request, planner understanding, included scope, excluded scope, change shape, major changes, risks, and review findings.
  - Each phase step shows only that phase's goal, file impact, topology, plan row/scenario to test mapping, TDD execution state, manual smoke gates, TDD blockers, evidence artifacts, planning-docs feedback handling, UI plan preview when applicable, and phase `owner_agent` when known.
  - Keep phase `goal` as a readable judgment summary, not a long list of fields or paths.
  - Dense schema, RLS, API, function, or state-machine details should remain in the plan unless they explain a visible test mapping, manual smoke gate, TDD blocker, or evidence artifact.
  - Parse `## planning docs 피드백 반영 내역` into phase-linked feedback handling data when present. Include it in phase signatures so changes to how review feedback was handled invalidate stale approval.
  - Preserve `owner_agent` from the phase detail artifact.
  - UI preview and evidence artifacts are plan-level judgment material only; do not imply functional implementation exists.
  - Evidence artifacts are planning-only HTML/CSS/JS projections. Do not imply real API, DB, filesystem, live dev-server, React build, or production stack execution exists.
  - Surface `ui-preview` evidence prominently enough that the planning docs reviewer can inspect it before approving or requesting plan revision.
  - Surface TDD mappings prominently enough that the reviewer can see which plan rows were converted into source-tree tests, narrow execution commands, expected red results, or manual smoke gates.
  - `Previous`, `Next`, and direct step navigation reset visible review content to the top of the current step.
- Ensure `review-data.json` includes the post-approval next action fields so the planning docs UI can tell the user that approved implementation-scope plans proceed to implementation against the approved `plan.md` and `tdd.md`.
- Ensure the planning docs package exposes historical rounds and controller action summaries from `review-history.json`.
- Initialize or refresh `feedback.json` for current `plan_signature` with schema v2 and `review_status = in_progress`:
  - on the first review, initialize `comments: []` and `item_status` entries for every required review item
  - on later reviews, preserve only prior approved `item_status[target_id]` entries whose `approved_against.review_item_signature` matches the current `review_item_signature`
  - clear prior `needs-change`, `question`, and `out-of-scope` live comments after preserving the submitted round in `review-history.json`
  - do not carry approval forward when item signature evidence is missing or mismatched
- Use approval-centered target status semantics:
  - The left sidebar checkbox is an approval control, not a read-check control. Checking it must set `approved: true` and create `approved_against`.
  - Adding or editing a `needs-change` or `question` comment means the target was reviewed; set that target to `approved: false` and remove `approved_against`.
  - Adding an `out-of-scope` comment marks the target as reviewed by comment, but it must not by itself create approval evidence.
  - Do not expose a separate manual read-check control or require read confirmation before submit.
  - Do not allow a target with active `needs-change` or `question` comments to be approved until those comments are deleted, resolved into history, or otherwise removed from live feedback.
- Auto-start the shared server through the platform-neutral Node launcher; do not ask the user to run a `node` command:
  1. Run `node .codex/tools/start-planning-docs-browser-server.mjs --task-slug {task-slug} --plan-signature {plan_signature}` from the repository root.
  2. The launcher must health-check existing compatible servers, start `.codex/tools/planning-docs-browser-server.mjs` as a detached background process when needed, skip foreign processes on occupied ports, choose an alternate port when needed, and print `planning_docs_url=...`.
  3. Treat a non-zero launcher exit as a planning-docs gate blocker and report the exact command output.
- Tell the user in Korean: the server is running in the background, open the printed `planning_docs_url`, review the left-sidebar targets, add section comments if needed, press Submit, then say `review complete` in chat. Also say the planning docs UI shows the next implementation action after approval.
- Do not create `user-gate.md`.

When the user says `review complete`, read `feedback.json`:

- if `task_slug` or `plan_signature` differs from current plan state, regenerate the package and require review again
- if `review_status` is not `submitted`, ask the user to submit the planning docs first
- if every required review item is approved with current `approved_against` evidence and there are no active `needs-change` or `question` comments, treat current `plan_signature` and `tdd.md` as explicitly approved and continue to Step 7
- if any required review item is not approved or any active non-approved comment exists, run Step 6 before choosing the next role pass

## Step 6. Triage Planning Docs Feedback

- Treat `approved` vs `not approved` as the approval gate. Raw comment types such as `needs-change`, `question`, and `out-of-scope` are routing hints only.
- Collect every unapproved required review item and every active comment with its `type`, `body`, `target_id`, `anchor_id`, and whether it conflicts with current locked request, scope, public contract, or UI direction.
- Before resetting `feedback.json`, regenerating the package, or changing `plan_signature`, append or update a round in `review-history.json`.
- Each history round must record submitted feedback per review target and anchor, chosen triage route, controller or sub-agent action summary, resolution summary, and whether the result was same-signature re-review or a new plan signature.
- Each history item must preserve `target_id`, `anchor_id`, `type`, reviewer comment summary, selected route, action summary, resolution summary, and any phase id that now owns the change.
- If submitted `needs-change` or `question` comments exist and the active round has not been preserved in `review-history.json`, do not reset `feedback.json` or regenerate the package.
- For browser-visible history prose (`round.summary`, `items[].user_comment`, `items[].action_summary[]`, `items[].resolution_summary`), write Korean summaries even when the original browser feedback, prior chat, or sub-agent output is English. Do not copy English source prose verbatim into those fields.
- Preserve paths, globs, package names, code identifiers, schema keys, enum values, branch names, and signatures in their original spelling inside Korean prose.
- Preserve previous rounds when a new plan signature is produced.

Classify each non-approved item into one of:

- `answer_only`: the user needs explanation or evidence, but current plan contract can stand unchanged
- `request_lock`: the user's goal, scope, acceptance, exclusions, policy, or public surface is no longer locked enough for planning
- `scope_decision`: the user is deciding whether something belongs in or out of the plan, or a requested change conflicts with current included/excluded scope
- `ui_direction`: the real blocker is user-visible hierarchy, state presentation, responsive behavior, or design-system direction
- `plan_revision`: the request is still locked, and the plan itself should be revised

If a non-approved item is too thin to classify safely from status and comment, ask the user concise direct questions in Korean.

When multiple categories appear, resolve them in this order:

1. `scope_decision` or `request_lock`
2. `ui_direction`
3. `plan_revision`
4. `answer_only`

After the triage route is selected and the active history round is updated, run Step 7 before resetting `feedback.json`, regenerating the package, changing `plan_signature`, or invoking the next role when feasible.

Route by triage result:

- `answer_only`: answer in chat from current plan/review/package, update active history round with answer summary and same-signature re-review outcome, refresh `feedback.json` for the same signature while preserving only unchanged approved items, require browser re-submit, and do not invoke `plan-maker`.
- `scope_decision` or `request_lock`: ask direct questions first when underspecified, then run or reuse the request-scope locking capability with exact task, plan, `plan_wiki_root`, current `plan_signature`, latest `feedback.json`, locked request summary when available, verified inputs, and chat-only output contract unless the user asked for an artifact.
- `ui_direction`: ask for request-scope clarification first if product framing or scope is unstable; otherwise run or reuse the UI-spec capability with exact task, plan, current signature, latest `feedback.json`, locked request summary when available, verified inputs, and chat-only output contract unless the user asked for an artifact.
- `plan_revision`: record the revision route in `review-history.json`, run Step 7, route exact feedback path plus affected `target_id`/`anchor_id` values to `plan-maker`, require the revised plan to include `## planning docs 피드백 반영 내역` entries for the handled feedback, rerun `plan-review`, regenerate the review data package, carry forward only approvals whose item signatures still match, and require browser re-submit.

Required sub-agent terminal results:

- request-scope locking: `result = locked_request` with `task_slug`, `locked_request_summary`, `next_action`, and `artifact_paths`; or `result = needs_user_input` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, and `questions`.
- UI-spec: `result = locked_ui_direction` with `task_slug`, `ui_direction_summary`, `next_action`, and `artifact_paths`; or `result = needs_user_input` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, and `questions`.

If a sub-agent returns `needs_user_input`, ask the user directly in chat and route the answer back to the next compatible pass. If it returns a locked result, update the active history round and continue with the returned `next_action`.

## Step 7. Capture Planning Docs Learning

Follow `./references/planning-docs-learning.md`.

- Run after a submitted planning docs round has been preserved in `review-history.json` and either approved or triaged.
- Treat learning capture as non-blocking unless it corrupts authoritative planning docs artifacts.
- Do not block planning docs approval, implementation readiness, or plan revision only because learning capture cannot be promoted into plan wiki rules.
