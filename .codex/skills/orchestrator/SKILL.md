---
name: orchestrator
description: Explicit multi-agent planning orchestrator for requests that should run through the repository's planning loop instead of a one-off planning pass. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for the automated architect/review/materialize workflow, and Codex should coordinate `plan-architect`, `plan-reviewer`, and `plan-materializer` to draft, review, revise, run a mandatory browser-backed user gate that opens the current plan artifacts in tabs, and materialize tests without implementing production code.
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
12. Workspace helper for deterministic `plan_revision` and linked phase path discovery:
    - `./.codex/scripts/plan-revision.mjs`

## Required runtime expectations

- This skill assumes the runtime can invoke the named custom agents `plan-architect`, `plan-reviewer`, and `plan-materializer`.
- If any named agent definition is missing, unreadable, or not invokable, stop and report the blocker.
- Do not silently inline architect, reviewer, or materializer work inside this skill when the named-agent path is expected.
- The parent orchestrator thread must itself be able to write inside the workspace because it persists `state.json`, `clarification.md`, and `user-gate.md`.
- For resumed orchestration runs, preserve the same writable parent-thread sandbox used by the run being continued; do not assume child-agent `workspace-write` can compensate for a read-only parent thread.

## Named agent invocation policy

- Classify the orchestration request before spawning any named planning agent:
    - `fresh_run`: the user explicitly wants a new or isolated run, a new `task-slug`, or a clean break from prior orchestration continuity
    - `resume_run`: the user explicitly wants to continue, revise, review, or materialize the same `task-slug`
- For `fresh_run`, invoke named planning agents with the target custom role and `fork_context = false`.
- For `resume_run`, invoke named planning agents with the target custom role and `fork_context = true`.
- Treat `fresh_run` as the default when the user requests a new slug, says to separate from an older run, or asks for a fresh state.
- Within one `task-slug`, prefer reusing the same named planning agent instance for each role instead of spawning a replacement.
- Persist the active agent id for each named role in `state.json` and treat it as the first-choice continuation target for the rest of the run.
- For follow-up work on the same role, use this order:
    - if a recorded agent id exists, send input to that same agent
    - if the recorded agent was closed, try to resume it and then send input
    - only if same-agent reuse fails with an explicit tool error, spawn a replacement agent of the same role and overwrite the recorded id
- Do not spawn a second architect, reviewer, or materializer for the same `task-slug` while the recorded agent remains reusable.
- For `fresh_run`, clear any previously recorded agent ids before the first named-agent spawn.
- For `resume_run`, prefer the recorded agent ids over a new spawn even when `fork_context = true` would also be valid.
- If same-agent reuse fails:
    - report the exact target role
    - report the recorded agent id
    - report whether the failed attempt was `send_input` or `resume_agent`
    - report the exact tool error or failure text
    - then spawn the narrowest safe replacement for that same role and record the new id
- Do not weaken the selected spawn policy before attempting it.
- Do not claim capability limits such as "full-context fork and custom role cannot be combined" unless an actual spawn attempt failed with that exact combination.
- If a spawn attempt fails:
    - report the exact target agent
    - report whether `fork_context` was `true` or `false`
    - report the exact tool error or failure text
    - then choose the narrowest safe fallback that preserves the user's isolation intent
- When `fork_context = false`, compensate by sending a structured message packet that includes:
    - exact `task-slug`
    - exact `state.json` path
    - statement that `state.json.preflight` is authoritative
    - write scope
    - allowed read-only context
    - explicit non-reuse constraints when this is a fresh isolated run
- Do not present a fallback choice as if it were a platform constraint when it was only an orchestration judgment call.

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
    "agents": {
        "plan_architect": {
            "id": null,
            "role": "plan-architect"
        },
        "plan_reviewer": {
            "id": null,
            "role": "plan-reviewer"
        },
        "plan_materializer": {
            "id": null,
            "role": "plan-materializer"
        }
    },
    "clarification": {
        "packet_path": null,
        "clarification_signature": null
    },
    "last_review_outcome": null,
    "last_review_signature": null,
    "last_materialize_outcome": null,
    "last_materialize_signature": null,
    "user_gate_required": true,
    "user_approved": false,
    "user_gate": {
        "packet_path": null,
        "browser_open_required": true,
        "browser_open_attempted": false,
        "browser_open_succeeded": false,
        "opened_paths": [],
        "open_command": null,
        "last_open_error": null
    },
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

Use a deterministic `plan_revision` fingerprint for the current `plan.md` plus its linked phase detail files by hashing the normalized file bytes in relative-path order.
Treat approval as valid only when `approved_revision == plan_revision`.
Treat `state.json.preflight` as the authoritative run-level environment contract for named planning agents during an orchestration run.
Do not enter `waiting_user_gate` until `state.json.user_gate.browser_open_succeeded = true`, unless the user explicitly waives browser opening for this run.

## Workflow

### Step 0. Normalize target, prepare the review wiki cache, and load state

- Derive one canonical `task-slug`.
- Derive one run mode before any named planning agent call:
    - `fresh_run` when the request is for a new slug, a fresh state, or explicit isolation from prior orchestration continuity
    - `resume_run` when the request continues the same slug or the same orchestration state
- Read `../review-wiki-setup/references/staging-contract.md`.
- Read `../review-wiki-setup/references/platform-commands.md`.
- Read `./references/browser-open-commands.md`.
- Create `./.codex/artifacts/plan/{task-slug}/` and `state.json` if they do not exist.
- If `state.json` exists, resume from the recorded stage instead of starting over.
- Persist `state.json` after every stage transition. Do not keep orchestration-only state in chat memory alone.
- Ensure `state.json.agents.plan_architect.id`, `state.json.agents.plan_reviewer.id`, and `state.json.agents.plan_materializer.id` exist.
- If this run is classified as `fresh_run`, clear every recorded agent id before invoking the first named planning agent.
- Initialize or refresh `state.json.preflight` before invoking any named planning agent:
    - set `mode = "orchestrated"`
    - set `complete = false`
    - set `review_wiki_root = null`
    - set `review_wiki_snapshot_fixed = false`
    - set `named_agents_verified = false`
    - clear `verified_agents`
- If `~/.codex/reviewWiki/wiki` is readable, always run the platform-appropriate staging command from `platform-commands.md` from the workspace root before invoking `plan-architect` or `plan-reviewer`, even when the cache already exists.
- Treat the refreshed cache as the fixed review wiki snapshot for the rest of the current orchestration run.
- Treat `./.codex/cache/review-wiki/current` as the planning root after staging; it should contain `registry.json`, `core/`, `patterns/`, and `_meta/`.
- If the external wiki root is permission-blocked or temporarily unreadable but `./.codex/cache/review-wiki/current` already exists, continue with the cached copy.
- If both the external wiki root and the cache are unavailable, stop and route to `review-wiki-setup` or request the missing external-read approval before continuing.
- After resolving the fixed review wiki snapshot, write it into `state.json.preflight.review_wiki_root`.
- Set `state.json.preflight.review_wiki_snapshot_fixed = true` before any named planning agent runs.
- Recompute `plan_revision` whenever `./plans/{task-slug}/plan.md` or any linked phase detail file changes.
- Use `node ./.codex/scripts/plan-revision.mjs --plan ./plans/{task-slug}/plan.md --json` as the authoritative source for:
    - deterministic `plan_revision`
    - linked phase detail file discovery
- Do not recreate the fingerprint with ad-hoc shell pipelines, temporary files, or OS temp directories.
- If `./.codex/scripts/plan-revision.mjs` is missing, unreadable, or returns a linked-phase error, stop and report that blocker instead of inventing a replacement hash routine.
- If plan artifacts changed on disk since the last recorded revision:
    - update `plan_revision`
    - clear stale review/materialize signatures
    - if `approved_revision != plan_revision`, set `user_approved = false`
    - reset `state.json.user_gate.packet_path = null`
    - reset `state.json.user_gate.browser_open_attempted = false`
    - reset `state.json.user_gate.browser_open_succeeded = false`
    - clear `state.json.user_gate.opened_paths`
    - clear `state.json.user_gate.open_command`
    - clear `state.json.user_gate.last_open_error`
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

- Invoke `plan-architect` through the same-agent continuity policy.
- Ask it to create or update the executable plan artifacts under `./plans/{task-slug}/`, or to write a clarification packet when pre-plan blocking ambiguity prevents drafting.
- Ask it to stay within the `architect` skill.
- Apply the named-agent invocation policy:
    - use `fork_context = false` for `fresh_run`
    - use `fork_context = true` for `resume_run`
- If `state.json.agents.plan_architect.id` is empty, spawn `plan-architect`, then record the returned id in `state.json`.
- If `state.json.agents.plan_architect.id` is present, reuse that same agent id instead of spawning a second architect.
- Pass the exact `task-slug` and `./.codex/artifacts/plan/{task-slug}/state.json` path.
- Tell it that `state.json.preflight` is authoritative for this orchestration run.
- Tell it not to rerun review wiki staging, not to verify named agent availability, and not to inspect runtime or CLI invocation paths.
- Require it to block if `state.json.preflight.complete != true`.
- If it cannot draft before a fresh user decision, require it to write `./.codex/artifacts/plan/{task-slug}/clarification.md` with YAML frontmatter containing at least:
    - `task_slug`
    - `needs_user_input`
    - `next_action`
    - `clarification_signature`
- If a clarification packet is written instead of a plan:
    - record `state.json.clarification.packet_path`
    - record `state.json.clarification.clarification_signature`
    - set `stage = "waiting_architect_clarification"`
    - stop and ask the user for the requested decision
- Record the returned plan path when executable plan artifacts were written.
- Recompute `plan_revision`.
- If the plan revision changed:
    - clear `last_review_outcome`
    - clear `last_review_signature`
    - clear `last_materialize_outcome`
    - clear `last_materialize_signature`
    - set `user_approved = false`
    - clear `approved_revision`
    - clear `state.json.clarification.packet_path`
    - clear `state.json.clarification.clarification_signature`
- Set `stage = "reviewing"`.

### Step 3. Run cold review

- Invoke `plan-reviewer` through the same-agent continuity policy on the current executable `plan.md`.
- Apply the named-agent invocation policy:
    - use `fork_context = false` for `fresh_run`
    - use `fork_context = true` for `resume_run`
- If `state.json.agents.plan_reviewer.id` is empty, spawn `plan-reviewer`, then record the returned id in `state.json`.
- If `state.json.agents.plan_reviewer.id` is present, reuse that same reviewer id instead of spawning a second reviewer.
- Pass the exact `task-slug` and `./.codex/artifacts/plan/{task-slug}/state.json` path.
- Tell it that `state.json.preflight` is authoritative for this orchestration run.
- Tell it not to rerun review wiki staging.
- Require it to block if `state.json.preflight.complete != true`.
- When reusing the same reviewer instance, explicitly instruct it to re-judge the current plan revision from the current files and not to carry forward stale findings automatically.
- Treat `./.codex/artifacts/plan-review/{task-slug}/review.md` as the review source of truth.
- Require `review.md` to start with a YAML frontmatter block that contains at least:
    - `plan_path`
    - `task_slug`
    - `plan_revision`
    - `outcome`
    - `next_action`
    - `finding_signature`
    - `requires_user_decision`
    - `issue_codes`
    - `affected_phase_paths`
- Record `last_review_outcome` and `last_review_signature` in `state.json`.

### Step 4. Route review findings

- If the same `plan_revision` produces the same `outcome` and the same `finding_signature` again, set `stage = "stuck"` and escalate to the user instead of looping.
- If the review outcome is `ready`, continue to the user gate.
- If `review.md` says `requires_user_decision = true` or `next_action = user_gate`, continue to the user gate with the review packet.
- If the review outcome is `ready-with-findings`, send the review back to `plan-architect` for revision.
- If the review outcome is `blocked`, route to `plan-architect` first, not to the user by default.
- After every architect revision, rerun `plan-reviewer`.

### Step 5. User gate

Always require explicit user approval before materialization.

At the gate:

- Ask `plan-architect` through the same-agent continuity policy to produce a concise approval packet when needed.
- Apply the named-agent invocation policy:
    - use `fork_context = false` for `fresh_run`
    - use `fork_context = true` for `resume_run`
- Reuse `state.json.agents.plan_architect.id` when present instead of spawning a second architect for the same run.
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
- Record `state.json.user_gate.packet_path`.
- Build the exact browser-open target list in this order:
    - `user-gate.md`
    - current `plan.md`
    - every linked phase detail file in display order from `./.codex/scripts/plan-revision.mjs --plan <plan-path> --json`
- Treat local browser opening as required whenever the runtime can execute local shell commands from the workspace.
- Attempt the platform-appropriate browser-open command from `references/browser-open-commands.md`.
- Record the attempt in `state.json.user_gate`:
    - set `browser_open_attempted = true`
    - write the exact `opened_paths`
    - write the exact `open_command`
- If browser opening succeeds, set `browser_open_succeeded = true`, clear `last_open_error`, and then set `stage = "waiting_user_gate"`.
- If browser opening fails, or no supported local opener can be invoked:
    - set `browser_open_succeeded = false`
    - set `last_open_error`
    - set `blocked_by = "browser_open"`
    - set `blocker_type = "external_setup"`
    - set `stage = "blocked_external"`
    - stop and report the exact files plus the failing command or missing opener
- Do not degrade to a manual file list unless the user explicitly waives browser opening for this run.
- Do not call `plan-materializer` before explicit user approval.
- Record approval only for the current `plan_revision`.

### Step 6. Resume after user response

When the user replies:

- If `stage = "waiting_architect_clarification"`:
    - send the response to the recorded `plan-architect` agent id
    - set `stage = "drafting"`
    - resume the drafting step instead of entering review or materialize directly
- If the user answers open questions or requests plan changes, send that response to the recorded `plan-architect` agent id.
- If `plan-architect` changes any plan artifact after the gate:
    - recompute `plan_revision`
    - set `user_approved = false`
    - clear `approved_revision`
    - reset `state.json.user_gate.packet_path = null`
    - reset `state.json.user_gate.browser_open_attempted = false`
    - reset `state.json.user_gate.browser_open_succeeded = false`
    - clear `state.json.user_gate.opened_paths`
    - clear `state.json.user_gate.open_command`
    - clear `state.json.user_gate.last_open_error`
    - rerun `plan-reviewer`
    - return to the user gate before materialization
- If the user approves without plan changes:
    - set `approved_revision = plan_revision`
    - set `user_approved = true`
    - set `stage = "ready_for_materialize"`

### Step 7. Materialize tests

- Invoke `plan-materializer` through the same-agent continuity policy only when `approved_revision == plan_revision`.
- Apply the named-agent invocation policy:
    - use `fork_context = false` for `fresh_run`
    - use `fork_context = true` for `resume_run`
- If `state.json.agents.plan_materializer.id` is empty, spawn `plan-materializer`, then record the returned id in `state.json`.
- If `state.json.agents.plan_materializer.id` is present, reuse that same materializer id instead of spawning a second materializer.
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
    - `requires_user_decision`
    - `blocked_clause_ids`
    - `affected_phase_paths`
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
- If browser opening fails or is unavailable, say so explicitly, report the command or missing opener, and list the exact local files that should have been opened.
- When blocked, say which agent blocked and where the workflow is routing next.

## Output contract

- Plan artifacts under `./plans/**`
- Review artifact under `./.codex/artifacts/plan-review/{task-slug}/review.md` with YAML frontmatter status fields
- Orchestration state under `./.codex/artifacts/plan/{task-slug}/state.json`
- Clarification packet under `./.codex/artifacts/plan/{task-slug}/clarification.md` when pre-plan user input is required
- User gate packet under `./.codex/artifacts/plan/{task-slug}/user-gate.md`
- Test materialization output under plan-local `materialize.md` with YAML frontmatter status fields

## Guardrails

- Orchestrate only: do not substitute for `architect`, `plan-review`, or `plan-materialize`.
- Do not implement production code.
- Do not call `plan-architect` or `plan-reviewer` before the review wiki cache preflight completes.
- Do not ask named planning agents to rediscover the review wiki root, rerun staging, or verify named agent availability after `state.json.preflight.complete = true`.
- Do not silently refresh the review wiki cache again after Step 0 inside the same orchestration run.
- Do not silently replace a reusable named planning agent with a fresh one for the same `task-slug`; record and report any forced replacement.
- Do not route a pre-plan clarification need through `plan-reviewer`; keep it in the architect clarification path.
- Do not skip explicit user approval.
- Do not silently downgrade browser-open to a manual file list when local shell execution should work.
- Do not mark `waiting_user_gate` until browser-open succeeded or the user explicitly waived it.
- Do not let `plan-reviewer` edit plans.
- Do not let `plan-materializer` patch plan ambiguity with tests.
- Do not bypass review after architect revisions.
- Do not reuse stale approval after a plan revision change.
- Do not keep looping silently when the workflow makes no progress for the same `plan_revision`.
- Do not infer `user_policy` or user-decision routing from free-form prose when structured frontmatter fields are available.
- Do not turn materialize blockers into ad-hoc implementation decisions.
- Do not recreate `plan_revision` with ad-hoc shell hashing commands or any workflow that writes to OS temp directories.

</Instructions>
</Skill_Guide>
