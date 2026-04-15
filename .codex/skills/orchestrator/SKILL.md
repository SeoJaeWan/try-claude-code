---
name: orchestrator
description: Explicit multi-agent planning orchestrator for requests that should run through the repository's planning loop instead of a one-off planning pass. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for the automated architect/review/materialize workflow, and Codex should coordinate `plan-architect`, `plan-reviewer`, and `plan-materializer` to draft, review, revise, user-gate, open the current plan artifacts in browser tabs, and materialize tests without implementing production code.
---

<Skill_Guide>
<Purpose>
Run the repository's planning loop as an orchestrated workflow with named planning agents, explicit user approval, and file-backed state that can resume across turns.
</Purpose>

<Instructions>
# orchestrator

Use this skill only for explicit planning orchestration requests.
Do not use it as a generic replacement for `architect`, `plan-review`, or `plan-materialize`.

## Inputs to inspect

1. Latest user request and latest conversation context
2. Existing plan artifacts under `./plans/**` relevant to the task
3. Existing orchestration state under `./.codex/artifacts/plan/{task-slug}/state.json` when present
4. `./.codex/agents/plan-architect.toml`
5. `./.codex/agents/plan-reviewer.toml`
6. `./.codex/agents/plan-materializer.toml`
7. `../review-wiki-setup/references/staging-contract.md`
8. `../review-wiki-setup/references/platform-commands.md`
9. `../review-wiki-setup/scripts/stage-review-wiki.ps1`
10. `../review-wiki-setup/scripts/stage-review-wiki.sh`
11. `./references/browser-open-commands.md`

## Required runtime expectations

- This skill assumes the runtime can invoke the named custom agents `plan-architect`, `plan-reviewer`, and `plan-materializer`.
- If any named agent definition is missing, unreadable, or not invokable, stop and report the blocker.
- Do not silently inline architect, reviewer, or materializer work inside this skill when the named-agent path is expected.

## State files

Store orchestration-only state under `./.codex/artifacts/plan/{task-slug}/`.

Required files:

- `state.json`

Optional helper files:

- `user-gate.md`
- `notes.md` only when a short orchestration note is useful

Keep plan content under `./plans/**`.
Keep review findings under `./.codex/artifacts/plan-review/**`.
Keep test materialization output under plan-local `materialize.md`.

Required `state.json` shape:

```json
{
    "task_slug": "example-task",
    "plan_path": "plans/example-task/plan.md",
    "plan_revision": null,
    "approved_revision": null,
    "stage": "drafting",
    "last_review_outcome": null,
    "last_review_signature": null,
    "last_materialize_outcome": null,
    "last_materialize_signature": null,
    "user_gate_required": true,
    "user_approved": false,
    "blocked_by": null,
    "blocker_type": null,
    "resume_from": null,
    "stuck_reason": null,
    "preflight": {
        "mode": "orchestrated",
        "complete": false,
        "review_wiki_root": null,
        "review_wiki_snapshot_fixed": false,
        "named_agents_verified": false,
        "verified_agents": []
    }
}
```

Use a deterministic `plan_revision` fingerprint for the current `plan.md` plus its linked phase detail files.
Treat approval as valid only when `approved_revision == plan_revision`.
Treat `state.json.preflight` as the authoritative run-level environment contract for named planning agents during an orchestration run.

## Workflow

### Step 0. Normalize target, prepare the review wiki cache, and load state

- Derive one canonical `task-slug`.
- Read `../review-wiki-setup/references/staging-contract.md`.
- Read `../review-wiki-setup/references/platform-commands.md`.
- Read `./references/browser-open-commands.md`.
- Create `./.codex/artifacts/plan/{task-slug}/` and `state.json` if they do not exist.
- If `state.json` exists, resume from the recorded stage instead of starting over.
- Persist `state.json` after every stage transition. Do not keep orchestration-only state in chat memory alone.
- Initialize or refresh `state.json.preflight` before invoking any named planning agent:
    - set `mode = "orchestrated"`
    - set `complete = false`
    - set `review_wiki_root = null`
    - set `review_wiki_snapshot_fixed = false`
    - set `named_agents_verified = false`
    - clear `verified_agents`
- If `~/.codex/reviewWiki/wiki` is readable, always run the platform-appropriate staging command from `platform-commands.md` from the workspace root before invoking `plan-architect` or `plan-reviewer`, even when the cache already exists.
- Treat the refreshed cache as the fixed review wiki snapshot for the rest of the current orchestration run.
- If the external wiki root is permission-blocked or temporarily unreadable but `./.codex/cache/review-wiki/current` already exists, continue with the cached copy.
- If both the external wiki root and the cache are unavailable, stop and route to `review-wiki-setup` or request the missing external-read approval before continuing.
- After resolving the fixed review wiki snapshot, write it into `state.json.preflight.review_wiki_root`.
- Set `state.json.preflight.review_wiki_snapshot_fixed = true` before any named planning agent runs.
- Recompute `plan_revision` whenever `./plans/{task-slug}/plan.md` or any linked phase detail file changes.
- If plan artifacts changed on disk since the last recorded revision:
    - update `plan_revision`
    - clear stale review/materialize signatures
    - if `approved_revision != plan_revision`, set `user_approved = false`
- If the target plan folder already exists, treat the workflow as an update pass.

### Step 1. Verify agent prerequisites

- Confirm `plan-architect`, `plan-reviewer`, and `plan-materializer` definitions exist.
- Confirm the linked local skills are present.
- If any prerequisite is missing, stop instead of degrading to a manual fallback.
- After prerequisite verification succeeds:
    - set `state.json.preflight.named_agents_verified = true`
    - set `state.json.preflight.verified_agents = ["plan-architect", "plan-reviewer", "plan-materializer"]`
    - set `state.json.preflight.complete = true`
    - persist `state.json`

### Step 2. Run architect draft

- Call `plan-architect`.
- Ask it to create or update the executable plan artifacts under `./plans/{task-slug}/`.
- Ask it to stay within the `architect` skill.
- Pass the exact `task-slug` and `./.codex/artifacts/plan/{task-slug}/state.json` path.
- Tell it that `state.json.preflight` is authoritative for this orchestration run.
- Tell it not to rerun review wiki staging, not to verify named agent availability, and not to inspect runtime or CLI invocation paths.
- Require it to block if `state.json.preflight.complete != true`.
- Record the returned plan path.
- Recompute `plan_revision`.
- If the plan revision changed:
    - clear `last_review_outcome`
    - clear `last_review_signature`
    - clear `last_materialize_outcome`
    - clear `last_materialize_signature`
    - set `user_approved = false`
    - clear `approved_revision`
- Set `stage = "reviewing"`.

### Step 3. Run cold review

- Call `plan-reviewer` on the current executable `plan.md`.
- Pass the exact `task-slug` and `./.codex/artifacts/plan/{task-slug}/state.json` path.
- Tell it that `state.json.preflight` is authoritative for this orchestration run.
- Tell it not to rerun review wiki staging.
- Require it to block if `state.json.preflight.complete != true`.
- Treat `./.codex/artifacts/plan-review/{task-slug}/review.md` as the review source of truth.
- Require `review.md` to start with a YAML frontmatter block that contains at least:
    - `plan_path`
    - `task_slug`
    - `plan_revision`
    - `outcome`
    - `next_action`
    - `finding_signature`
- Record `last_review_outcome` and `last_review_signature` in `state.json`.

### Step 4. Route review findings

- If the same `plan_revision` produces the same `outcome` and the same `finding_signature` again, set `stage = "stuck"` and escalate to the user instead of looping.
- If the review outcome is `ready`, continue to the user gate.
- If the review outcome is `ready-with-findings`, send the review back to `plan-architect` for revision unless the finding is explicitly a user-policy decision.
- If the review outcome is `blocked`, route to `plan-architect` first, not to the user by default.
- After every architect revision, rerun `plan-reviewer`.

### Step 5. User gate

Always require explicit user approval before materialization.

At the gate:

- Ask `plan-architect` to produce a concise approval packet when needed.
- When asking `plan-architect` for a packet, pass the same `state.json` path and keep `state.json.preflight` authoritative.
- Require detailed decision packets for unresolved user-policy questions:
    - what needs a decision
    - why it matters
    - 2-3 options
    - recommended option
    - default if the user does not answer
- If no open questions remain, present:
    - plan path
    - current `plan_revision`
    - latest review outcome
    - what will happen next
    - a direct approval request
- The packet must list the current `plan.md` path and every linked phase detail path in display order.
- Write the packet to `user-gate.md`.
- When local browser opening is available, open `user-gate.md`, the current `plan.md`, and every linked phase detail file in separate browser tabs using the platform-appropriate commands from `references/browser-open-commands.md`.
- If browser opening is unavailable or blocked, tell the user and list the local files that should be opened manually.
- Set `stage = "waiting_user_gate"`.
- Do not call `plan-materializer` before explicit user approval.
- Record approval only for the current `plan_revision`.

### Step 6. Resume after user response

When the user replies:

- If the user answers open questions or requests plan changes, send that response to `plan-architect`.
- If `plan-architect` changes any plan artifact after the gate:
    - recompute `plan_revision`
    - set `user_approved = false`
    - clear `approved_revision`
    - rerun `plan-reviewer`
    - return to the user gate before materialization
- If the user approves without plan changes:
    - set `approved_revision = plan_revision`
    - set `user_approved = true`
    - set `stage = "ready_for_materialize"`

### Step 7. Materialize tests

- Call `plan-materializer` only when `approved_revision == plan_revision`.
- Pass the exact `task-slug` and `./.codex/artifacts/plan/{task-slug}/state.json` path.
- Let it create or update source-tree tests and plan-local `materialize.md`.
- Do not implement production code.
- Require `materialize.md` to start with a YAML frontmatter block that contains at least:
    - `plan_path`
    - `task_slug`
    - `plan_revision`
    - `outcome`
    - `blocker_type`
    - `blocker_code`
    - `next_action`
    - `resume_from`
    - `materialize_signature`
- Record `last_materialize_outcome` and `last_materialize_signature` in `state.json`.

### Step 8. Route materialize blockers

- If the same `plan_revision` produces the same `outcome` and the same `materialize_signature` again, set `stage = "stuck"` and escalate to the user instead of looping.
- If `plan-materializer` finishes successfully, set `stage = "done"`.
- If `plan-materializer` returns `blocked` with `blocker_type = "external_setup"`:
    - set `stage = "blocked_external"`
    - keep `approved_revision` unchanged
    - set `resume_from = "materialize"`
    - stop and tell the user which setup or source-tree prerequisite must be added first
- If `plan-materializer` returns `blocked` with `blocker_type = "plan_ambiguity"`, route the blocker back to `plan-architect`.
- If `plan-materializer` returns `blocked` with `blocker_type = "user_policy"`:
    - ask `plan-architect` for a decision packet
    - return to the user gate
- After any architect revision triggered by materialize:
    - recompute `plan_revision`
    - rerun `plan-reviewer`
    - require a fresh user approval before another materialize pass
- When resuming from `blocked_external`:
    - if `plan_revision == approved_revision` and the plan artifacts did not change, resume at `plan-materializer`
    - otherwise resume at `plan-reviewer` or the user gate as needed

### Step 9. Completion

Terminal stages are:

- `done`
- `blocked_external`
- `stuck`

`done` requires all of the following:

- executable plan artifacts exist
- latest review state is execution-ready enough to proceed
- user approval was recorded
- `approved_revision == plan_revision`
- `plan-materializer` finished
- `state.json` reflects the final stage

## Chat response requirements

- Keep orchestration updates short.
- Tell the user which stage is running.
- Present the user gate packet in Korean.
- If browser opening is unavailable or blocked, say so explicitly and list the local files.
- When blocked, say which agent blocked and where the workflow is routing next.

## Output contract

- Plan artifacts under `./plans/**`
- Review artifact under `./.codex/artifacts/plan-review/{task-slug}/review.md` with YAML frontmatter status fields
- Orchestration state under `./.codex/artifacts/plan/{task-slug}/state.json`
- User gate packet under `./.codex/artifacts/plan/{task-slug}/user-gate.md`
- Test materialization output under plan-local `materialize.md` with YAML frontmatter status fields

## Guardrails

- Orchestrate only: do not substitute for `architect`, `plan-review`, or `plan-materialize`.
- Do not implement production code.
- Do not call `plan-architect` or `plan-reviewer` before the review wiki cache preflight completes.
- Do not ask named planning agents to rediscover the review wiki root, rerun staging, or verify named agent availability after `state.json.preflight.complete = true`.
- Do not silently refresh the review wiki cache again after Step 0 inside the same orchestration run.
- Do not skip explicit user approval.
- Do not let `plan-reviewer` edit plans.
- Do not let `plan-materializer` patch plan ambiguity with tests.
- Do not bypass review after architect revisions.
- Do not reuse stale approval after a plan revision change.
- Do not keep looping silently when the workflow makes no progress for the same `plan_revision`.
- Do not turn materialize blockers into ad-hoc implementation decisions.

</Instructions>
</Skill_Guide>
