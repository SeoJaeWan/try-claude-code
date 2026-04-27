# Developer Review

## Table of Contents

- Step 5. Developer review gate
- Step 6. Triage developer review feedback

## Step 5. Developer Review Gate

Always require explicit browser-based developer review before materialization.

At the gate:

- Read `./references/developer-review-ui.md`.
- Create or refresh `./plans/{task-slug}/developer-review/` for current `plan_signature`.
- Copy `./assets/developer-review/index.html` to `./plans/{task-slug}/developer-review/index.html`.
- Generate `review-data.json` from current `plan.md`, linked phase detail files, and fresh `review.md`.
- Create or refresh `review-history.json` for current `task-slug` and `plan_signature`.
- Ensure `review-data.json` is user-readable and not a raw markdown dump:
  - Overview shows the user's request, planner understanding, included scope, excluded scope, change shape, major changes, risks, and review findings.
  - Each phase step shows only that phase's goal, changes, contracts, file impact, validation, risks, UI plan preview when applicable, and phase `owner_agent` when known.
  - Preserve `owner_agent` from the phase detail artifact.
  - UI preview is plan-level visual explanation only; do not imply functional implementation exists.
  - `Previous`, `Next`, and direct step navigation reset visible review content to the top of the current step.
- Ensure the developer review package exposes historical rounds and controller action summaries from `review-history.json`.
- Initialize or reset `feedback.json` for current `plan_signature` with `review_status = in_progress`.
- Start or instruct the user to start the shared server:
  - `node .codex/tools/developer-review-server.mjs plans/{task-slug}/developer-review`
- Tell the user to review in the browser, press submit on the final step, then say `리뷰 완료` in chat.
- Do not create `user-gate.md`.

When the user says `리뷰 완료`, read `feedback.json`:

- if `plan_signature` differs from current `plan_signature`, regenerate the package and require review again
- if `review_status` is not `submitted`, ask the user to submit the browser review first
- if every required Overview and Phase step is `approved`, treat current `plan_signature` as explicitly approved and continue to Step 7 before materialization
- if any required Overview or Phase step or card is not `approved`, run Step 6 before choosing the next role pass

## Step 6. Triage Developer Review Feedback

- Treat `approved` vs `not approved` as the approval gate. Raw labels such as `needs-change`, `question`, and `out-of-scope` are routing hints only.
- Collect every non-approved step or card with its `status`, `comment`, affected IDs, and whether it conflicts with current locked request, scope, public contract, or UI direction.
- Before resetting `feedback.json`, regenerating the package, or changing `plan_signature`, append or update a round in `review-history.json`.
- Each history round must record submitted feedback per step/card, chosen triage route, controller or sub-agent action summary, and whether the result was same-signature re-review or a new plan signature.
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

- `answer_only`: answer in chat from current plan/review/package, update active history round with answer summary and same-signature re-review outcome, refresh `feedback.json` for the same signature, require fresh browser review, and do not invoke `architect`.
- `scope_decision` or `request_lock`: ask direct questions first when underspecified, then run or reuse `brainstorm` with exact task, plan, `review_wiki_root`, current `plan_signature`, latest `feedback.json`, locked request summary when available, verified inputs, and chat-only output contract unless the user asked for an artifact.
- `ui_direction`: route to `brainstorm` first if product framing or scope is unstable; otherwise run or reuse `design-discovery` with exact task, plan, current signature, latest `feedback.json`, locked request summary when available, verified inputs, and chat-only output contract unless the user asked for an artifact.
- `plan_revision`: record the revision route in `review-history.json`, run Step 7, route exact feedback path and affected IDs to `architect`, rerun `plan-review`, regenerate the review UI, and require fresh browser review.

Required sub-agent terminal results:

- `brainstorm`: `result = locked_request` with `task_slug`, `locked_request_summary`, `next_action`, and `artifact_paths`; or `result = needs_user_input` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, and `questions`.
- `design-discovery`: `result = locked_ui_direction` with `task_slug`, `ui_direction_summary`, `next_action`, and `artifact_paths`; or `result = needs_user_input` with `task_slug`, `needs_user_input`, `next_action`, `why_it_matters`, and `questions`.

If a sub-agent returns `needs_user_input`, ask the user directly in chat and route the answer back to the next compatible pass. If it returns a locked result, update the active history round and continue with the returned `next_action`.
