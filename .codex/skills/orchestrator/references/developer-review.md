# Developer Review

## Table of Contents

- Step 5. Developer review gate
- Step 6. Triage developer review feedback
- Step 7. Capture developer review learning

## Step 5. Developer Review Gate

Always require explicit browser-based developer review before TDD.

At the gate:

- Read `./references/developer-review-ui.md`.
- Create or refresh `./plans/{task-slug}/developer-review/` for current `plan_signature`.
- Do not copy `./assets/developer-review/index.html` into the plan folder; the shared server serves the fixed HTML app from `.codex`.
- Generate `review-data.json` from current `plan.md`, linked phase detail files, and fresh `review.md`.
- Parse `plan.md` `## 파일/폴더 구조 계약` and `## 체험 산출물` tables into `review-data.json.topology_contract` and `review-data.json.evidence_artifacts`.
- Validate every evidence `경로` as a relative `evidence/**` path under the plan folder, copy it to `plans/{task-slug}/developer-review/assets/evidence/**`, and expose only the copied asset path in review data.
- Create or refresh `review-history.json` for current `task-slug` and `plan_signature`.
- Ensure Overview and every required Phase/card in `review-data.json` has a stable `review_item_signature`; include global scope/contract context in phase signatures so scope changes invalidate affected approvals.
- Include topology and evidence metadata in review item signatures so changes to phase-linked paths, responsibilities, input/output harnesses, or evidence content invalidate stale approval.
- Ensure `review-data.json` is user-readable and not a raw markdown dump:
  - Overview shows the user's request, planner understanding, included scope, excluded scope, change shape, major changes, risks, and review findings.
  - Each phase step shows only that phase's goal, changes, contracts, file impact, topology, evidence artifacts, validation, risks, UI plan preview when applicable, and phase `owner_agent` when known.
  - Preserve `owner_agent` from the phase detail artifact.
  - UI preview is plan-level visual explanation only; do not imply functional implementation exists.
  - Evidence artifacts are planning-only HTML/JS projections. Do not imply real API, DB, filesystem, live dev-server, React build, or production stack execution exists.
  - `Previous`, `Next`, and direct step navigation reset visible review content to the top of the current step.
- Ensure `review-data.json` includes the post-approval next gate fields so the browser review can tell the user that approved implementation-scope plans proceed to `$plan-tdd` before production implementation.
- Ensure the developer review package exposes historical rounds and controller action summaries from `review-history.json`.
- Initialize or refresh `feedback.json` for current `plan_signature` with `review_status = in_progress`:
  - on the first review, leave all statuses empty
  - on later reviews, preserve only prior `approved` items whose `approved_against.review_item_signature` matches the current `review_item_signature`
  - clear prior `needs-change`, `question`, and `out-of-scope` live statuses after preserving the submitted round in `review-history.json`
  - do not carry approval forward when item signature evidence is missing or mismatched
- Auto-start the shared server through the platform-neutral Node launcher; do not ask the user to run a `node` command:
  1. Run `node .codex/tools/start-developer-review-server.mjs --task-slug {task-slug} --plan-signature {plan_signature}` from the repository root.
  2. The launcher must health-check existing compatible servers, start `.codex/tools/developer-review-server.mjs` as a detached background process when needed, skip foreign processes on occupied ports, choose an alternate port when needed, and print `developer_review_url=...`.
  3. Treat a non-zero launcher exit as a developer-review gate blocker and report the exact command output.
- Tell the user in Korean: the server is running in the background, open the printed `developer_review_url`, press submit on the final step, then say `review complete` in chat. Also say the browser review's final step shows the next gate after approval.
- Do not create `user-gate.md`.

When the user says `review complete`, read `feedback.json`:

- if `task_slug` or `plan_signature` differs from current plan state, regenerate the package and require review again
- if `review_status` is not `submitted`, ask the user to submit the browser review first
- if every required Overview and Phase step is `approved` and each approval has current `approved_against` evidence, treat current `plan_signature` as explicitly approved and continue to Step 7 before TDD
- if any required Overview or Phase step or card is not `approved`, run Step 6 before choosing the next role pass

## Step 6. Triage Developer Review Feedback

- Treat `approved` vs `not approved` as the approval gate. Raw labels such as `needs-change`, `question`, and `out-of-scope` are routing hints only.
- Collect every non-approved step or card with its `status`, `comment`, affected IDs, and whether it conflicts with current locked request, scope, public contract, or UI direction.
- Before resetting `feedback.json`, regenerating the package, or changing `plan_signature`, append or update a round in `review-history.json`.
- Each history round must record submitted feedback per step/card, chosen triage route, controller or sub-agent action summary, and whether the result was same-signature re-review or a new plan signature.
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

- `answer_only`: answer in chat from current plan/review/package, update active history round with answer summary and same-signature re-review outcome, refresh `feedback.json` for the same signature while preserving only unchanged approved items, require browser re-submit, and do not invoke `architect`.
- `scope_decision` or `request_lock`: ask direct questions first when underspecified, then run or reuse the request-scope locking capability with exact task, plan, `plan_wiki_root`, current `plan_signature`, latest `feedback.json`, locked request summary when available, verified inputs, and chat-only output contract unless the user asked for an artifact.
- `ui_direction`: ask for request-scope clarification first if product framing or scope is unstable; otherwise run or reuse the UI-spec capability with exact task, plan, current signature, latest `feedback.json`, locked request summary when available, verified inputs, and chat-only output contract unless the user asked for an artifact.
- `plan_revision`: record the revision route in `review-history.json`, run Step 7, route exact feedback path and affected IDs to `architect`, rerun `plan-review`, regenerate the review data package, carry forward only approvals whose item signatures still match, and require browser re-submit.

Required sub-agent terminal results:

- request-scope locking: `result = locked_request` with `task_slug`, `locked_request_summary`, `next_action`, and `artifact_paths`; or `result = needs_user_input` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, and `questions`.
- UI-spec: `result = locked_ui_direction` with `task_slug`, `ui_direction_summary`, `next_action`, and `artifact_paths`; or `result = needs_user_input` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, and `questions`.

If a sub-agent returns `needs_user_input`, ask the user directly in chat and route the answer back to the next compatible pass. If it returns a locked result, update the active history round and continue with the returned `next_action`.

## Step 7. Capture Developer Review Learning

Follow `./references/developer-review-learning.md`.

- Run after a submitted browser review round has been preserved in `review-history.json` and either approved or triaged.
- Treat learning capture as non-blocking unless it corrupts authoritative developer review artifacts.
- Do not block developer review approval, TDD, or plan revision only because learning capture cannot be promoted into plan wiki rules.
