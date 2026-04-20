---
name: orchestrator
description: Explicit multi-agent planning orchestrator for requests that should run through the repository's planning loop instead of a one-off planning pass. Use only when the user explicitly invokes `$orchestrator` or explicitly asks for the automated architect/review/materialize workflow, and Codex should coordinate `plan-architect`, `plan-reviewer`, and `plan-materializer` to draft, review, revise, request explicit user approval, and materialize tests without implementing production code.
---

<Skill_Guide>
<Purpose>
Run the repository's planning loop as an artifact-backed orchestrated workflow with named planning agents, explicit user approval, and file-backed state that can resume across turns.
</Purpose>

<Instructions>
# orchestrator

Use this skill only for explicit planning orchestration requests.
Do not use it as a generic replacement for `architect`, `plan-review`, or `plan-materialize`.

## Inputs to inspect

1. Latest user request and latest conversation context
2. Existing plan artifacts under `./plans/**` relevant to the task
3. Existing orchestration state under `./plans/_orchestrator/{task-slug}/state.json` when present
4. `./.codex/agents/plan-architect.toml`
5. `./.codex/agents/plan-reviewer.toml`
6. `./.codex/agents/plan-materializer.toml`
7. `../review-wiki-setup/references/staging-contract.md`
8. `./references/state-integrity.md`
9. `./scripts/validate-orchestrator-state.mjs`

## Required runtime expectations

- This skill assumes the runtime can invoke the named custom agents `plan-architect`, `plan-reviewer`, and `plan-materializer`.
- If any named agent definition is missing, unreadable, or not invokable, stop and report the blocker.
- Do not silently inline architect, reviewer, or materializer work inside this skill when the named-agent path is expected.
- The parent orchestrator thread must itself be able to write inside the workspace because it persists `state.json`, `clarification.md`, and `user-gate.md`.
- For resumed orchestration runs, preserve the same writable parent-thread sandbox used by the run being continued; do not assume child-agent `workspace-write` can compensate for a read-only parent thread.
- Do not block orchestration solely because a replacement named agent cannot be spawned with a full parent-context fork; use the packet-driven fallback defined below whenever the role contract allows it.
- Treat `state.json` as authoritative only when it passes the orchestrator state validator.
- Do not reuse, resume, or replace any named planning agent when the current `state.json` is malformed or fails invariant validation.

## Named agent invocation policy

- Classify the orchestration request before spawning any named planning agent:
    - `fresh_run`: the user explicitly wants a new or isolated run, a new `task-slug`, or a clean break from prior orchestration continuity
    - `resume_run`: the user explicitly wants to continue, revise, review, or materialize the same `task-slug`
- Treat `fresh_run` as the default when the user requests a new slug, says to separate from an older run, or asks for a fresh state.
- Treat orchestration continuity as continuity of `task-slug` plus the authoritative artifacts in `state.json`, `plan.md`, linked phase files, and review/materialize artifacts. Do not treat `resume_run` as a blanket requirement to fork the full parent conversation.
- Within one `task-slug`, prefer reusing the same named planning agent instance for each role instead of spawning a replacement.
- Persist the active agent id for each named role in `state.json` and treat it as the first-choice continuation target for the rest of the run.
- For follow-up work on the same role, use this order:
    - if a recorded agent id exists, send input to that same agent
    - if the recorded agent was closed, try to resume it and then send input
    - only if same-agent reuse fails with an explicit tool error, spawn a replacement agent of the same role and overwrite the recorded id
- Do not spawn a second architect, reviewer, or materializer for the same `task-slug` while the recorded agent remains reusable.
- For `fresh_run`, clear any previously recorded agent ids before the first named-agent spawn.
- For `resume_run`, prefer the recorded agent ids over a new spawn.
- When a new named agent instance must be spawned for an existing run, default to the same custom role with `fork_context = false` and a structured packet handoff rooted in `state.json`.
- Include in that packet:
    - exact `task-slug`
    - exact `state.json` path
    - statement that `state.json.preflight` is authoritative
    - exact `plan_path`
    - write scope
    - allowed read-only context
    - role-specific output path requirements
    - explicit non-reuse constraints when this is a fresh isolated run
- Use `fork_context = true` only when the replacement role cannot safely continue from authoritative artifacts alone and the missing continuity is not already encoded in plan, review, clarification, or state files.
- `plan-reviewer` replacements must default to packet-driven spawns with `fork_context = false`.
- `plan-materializer` replacements should default to packet-driven spawns with `fork_context = false`.
- `plan-architect` replacements may opt into `fork_context = true` only when unresolved planning continuity, pending clarification, or a recent user decision cannot yet be represented safely in the packet.
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
    - then choose the narrowest safe fallback that preserves the user's isolation intent and keeps continuity anchored in the authoritative artifacts
- Do not present a fallback choice as if it were a platform constraint when it was only an orchestration judgment call.

## State files

Store orchestration-only state under `./plans/_orchestrator/{task-slug}/`.

Required files:

- `state.json`

Optional helper files:

- `clarification.md`
- `user-gate.md`
- `notes.md` only when a short orchestration note is useful
- `state.json.next` only while validating a candidate state write
- `state.json.bak` only when preserving the last validated snapshot is useful for explicit recovery

Keep plan content under `./plans/**`.
Keep review findings under `./plans/_orchestrator/review/**`.
Keep test materialization output under plan-local `materialize.md`.

Required `state.json` shape:

```json
{
    "task_slug": "example-task",
    "plan_path": "plans/example-task/plan.md",
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
    "review_loop_count": 0,
    "last_materialize_outcome": null,
    "last_materialize_gate_status": null,
    "last_materialize_signature": null,
    "materialize_loop_count": 0,
    "user_gate_required": true,
    "user_approved": false,
    "user_gate": {
        "packet_path": null
    },
    "blocked_by": null,
    "blocker_type": null,
    "resume_from": null,
    "stuck_reason": null,
    "preflight": {
        "mode": "orchestrated",
        "complete": false,
        "review_wiki_root": null,
        "named_agents_verified": false,
        "verified_agents": []
    }
}
```

Treat `state.json.preflight` as the authoritative run-level environment contract for named planning agents during an orchestration run.
Treat `state.json.plan_path` as the authoritative orchestration metadata for downstream planning agents during an orchestrated run.
Treat approval as valid only until `plan-architect` changes the plan after the user gate.

## State integrity contract

- Read `./references/state-integrity.md` before reading or mutating orchestration state.
- Validate `state.json` with `node ./.codex/skills/orchestrator/scripts/validate-orchestrator-state.mjs --state <path>` before:
    - resuming an existing run
    - handing `state.json` to any named planning agent
    - trusting a just-written state transition
- When writing state:
    - write the full candidate document to `state.json.next`
    - validate `state.json.next`
    - replace `state.json` only after validation succeeds
    - re-validate the final `state.json` before any named-agent handoff
- If the current `state.json` fails validation:
    - stop and report the exact validator error
    - do not treat the failure as an architect, reviewer, or materializer stall
    - do not spawn or resume any named planning agent until the corruption is resolved

## Workflow

### Step 0. Normalize target, resolve the planning sync root, and load state

- Derive one canonical `task-slug`.
- Derive one run mode before any named planning agent call:
    - `fresh_run` when the request is for a new slug, a fresh state, or explicit isolation from prior orchestration continuity
    - `resume_run` when the request continues the same slug or the same orchestration state
- Read `../review-wiki-setup/references/staging-contract.md`.
- Read `./references/state-integrity.md`.
- Create `./plans/_orchestrator/{task-slug}/` and `state.json` if they do not exist.
- If `state.json` exists:
    - validate it before loading or reusing any recorded agent id
    - if validation fails, stop and report the exact validator error instead of reconstructing the run from chat memory
    - only after validation succeeds, resume from the recorded stage instead of starting over
- Persist `state.json` after every stage transition using the safe write pattern from `references/state-integrity.md`. Do not keep orchestration-only state in chat memory alone.
- Ensure `state.json.agents.plan_architect.id`, `state.json.agents.plan_reviewer.id`, and `state.json.agents.plan_materializer.id` exist.
- If this run is classified as `fresh_run`, clear every recorded agent id before invoking the first named planning agent.
- Initialize or refresh `state.json.preflight` before invoking any named planning agent:
    - set `mode = "orchestrated"`
    - set `complete = false`
    - set `review_wiki_root = null`
    - set `named_agents_verified = false`
    - clear `verified_agents`
- Resolve the planning `review_wiki_root` to `./.codex/review-wiki/sync/current`.
- Treat `./.codex/review-wiki/sync/current` as a workspace-local planning root prepared outside the orchestration hot path.
- If `./.codex/review-wiki/sync/current` is missing, stop and route to `review-wiki-setup` instead of attempting per-run staging inside this skill.
- After resolving the planning sync root, write it into `state.json.preflight.review_wiki_root`.
- If the target plan folder already exists, treat the workflow as an update pass.
- Before the first named-agent invocation of the run, validate the final `state.json` again and stop if it fails.

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
- If `state.json.agents.plan_architect.id` is present, reuse that same agent id instead of spawning a second architect.
- If `state.json.agents.plan_architect.id` is empty, spawn `plan-architect`, then record the returned id in `state.json`.
- When a new architect instance must be spawned for this run, default to packet-driven handoff from `state.json`; use `fork_context = true` only when unresolved clarification or a recent user decision is not yet captured safely in the orchestration artifacts.
- Pass the exact `task-slug` and `./plans/_orchestrator/{task-slug}/state.json` path.
- Tell it that `state.json.preflight` is authoritative for this orchestration run.
- Tell it that `state.json.plan_path` is the authoritative orchestrated plan path.
- Tell it not to rerun review wiki setup, not to verify named agent availability, and not to inspect runtime or CLI invocation paths.
- Require it to block if `state.json.preflight.complete != true`.
- If it cannot draft before a fresh user decision, require it to write `./plans/_orchestrator/{task-slug}/clarification.md` with YAML frontmatter containing at least:
    - `task_slug`
    - `needs_user_input`
    - `next_action`
    - `clarification_signature`
- When the missing decision is unresolved UI direction, hierarchy, state presentation, or design-system fit, require the clarification packet to tell the user to run `design-discovery` or provide equivalent locked UI decisions before planning can resume
- If a clarification packet is written instead of a plan:
    - record `state.json.clarification.packet_path`
    - record `state.json.clarification.clarification_signature`
    - set `stage = "waiting_architect_clarification"`
    - stop and ask the user for the requested decision
- Record the returned plan path when executable plan artifacts were written.
- After every architect-written plan update:
    - clear `last_review_outcome`
    - clear `last_review_signature`
    - reset `review_loop_count = 0`
    - clear `last_materialize_outcome`
    - clear `last_materialize_gate_status`
    - clear `last_materialize_signature`
    - reset `materialize_loop_count = 0`
    - set `user_approved = false`
    - clear `state.json.user_gate.packet_path`
    - clear `state.json.clarification.packet_path`
    - clear `state.json.clarification.clarification_signature`
- Set `stage = "reviewing"`.
- If the architect writes neither a plan nor a clarification packet after one same-agent reuse attempt and one safe replacement attempt, set:
    - `blocked_by = "plan_architect"`
    - `blocker_type = "agent_stall"`
    - `stuck_reason = "plan_architect produced no artifacts"`
    - `stage = "stuck"`
  and escalate instead of waiting indefinitely.

### Step 3. Run cold review

- Invoke `plan-reviewer` through the same-agent continuity policy on the current executable `plan.md`.
- If `state.json.agents.plan_reviewer.id` is present, reuse that same reviewer id instead of spawning a second reviewer.
- If `state.json.agents.plan_reviewer.id` is empty, spawn `plan-reviewer`, then record the returned id in `state.json`.
- When a new reviewer instance must be spawned for this run, spawn `plan-reviewer` with `fork_context = false` and a packet-driven handoff from `state.json`.
- Pass the exact `task-slug` and `./plans/_orchestrator/{task-slug}/state.json` path.
- Tell it that `state.json.preflight` is authoritative for this orchestration run.
- Tell it that `state.json.plan_path` is the authoritative orchestrated plan path.
- Tell it not to rerun review wiki setup.
- Require it to block if `state.json.preflight.complete != true`.
- When reusing the same reviewer instance, explicitly instruct it to re-evaluate the current plan files and not to carry forward stale findings automatically.
- Treat `./plans/_orchestrator/review/{task-slug}/review.md` as the review source of truth.
- Require `review.md` to start with a YAML frontmatter block that contains at least:
    - `plan_path`
    - `task_slug`
    - `outcome`
    - `next_action`
    - `finding_signature`
    - `requires_user_decision`
    - `issue_codes`
    - `affected_phase_paths`
- Record `last_review_outcome` and `last_review_signature` in `state.json`.

### Step 4. Route review findings

- If the same `outcome` and the same `finding_signature` repeat again without an intervening architect-written plan update:
    - increment `review_loop_count`
    - if `review_loop_count >= 2`, set `stage = "stuck"` and escalate to the user instead of looping
- If the review outcome is `ready`, continue to the user gate.
- If `review.md` says `requires_user_decision = true` or `next_action = user_gate`, continue to the user gate with the review packet.
- If the review outcome is `ready-with-findings`, send the review back to `plan-architect` for revision.
- If the review outcome is `blocked`, route to `plan-architect` first, not to the user by default.
- After every architect revision, rerun `plan-reviewer`.

### Step 5. User gate

Always require explicit user approval before materialization.

At the gate:

- Ask `plan-architect` through the same-agent continuity policy to produce a concise approval packet when needed.
- Reuse `state.json.agents.plan_architect.id` when present instead of spawning a second architect for the same run.
- When a new architect instance must be spawned for the gate step, default to packet-driven handoff from `state.json`; use `fork_context = true` only when the recent user reply or gate decision is not yet captured safely in the orchestration artifacts.
- When asking `plan-architect` for a packet, pass the same `state.json` path and keep `state.json.preflight` authoritative.
- Require detailed decision packets for unresolved user-policy questions:
    - what needs a decision
    - why it matters
    - 2-3 options
    - recommended option
    - default if the user does not answer
- If no open questions remain, present:
    - plan path
    - latest review outcome
    - what will happen next
    - a direct approval request
- The packet must list the current `plan.md` path and every linked phase detail path in display order from the current `plan.md`.
- Write the packet to `./plans/_orchestrator/{task-slug}/user-gate.md`.
- Record `state.json.user_gate.packet_path`.
- Set `stage = "waiting_user_gate"` after the gate packet is written.
- Do not call `plan-materializer` before explicit user approval.

### Step 6. Resume after user response

When the user replies:

- If `stage = "waiting_architect_clarification"`:
    - send the response to the recorded `plan-architect` agent id
    - set `stage = "drafting"`
    - resume the drafting step instead of entering review or materialize directly
- If the user answers open questions or requests plan changes, send that response to the recorded `plan-architect` agent id.
- If the recorded `plan-architect` agent cannot be reused for the follow-up, spawn a replacement `plan-architect` using the same packet-driven rules as Step 2 before forwarding the user response.
- If `plan-architect` changes any plan artifact after the gate:
    - set `user_approved = false`
    - clear `state.json.user_gate.packet_path`
    - clear `last_review_outcome`
    - clear `last_review_signature`
    - reset `review_loop_count = 0`
    - clear `last_materialize_outcome`
    - clear `last_materialize_gate_status`
    - clear `last_materialize_signature`
    - reset `materialize_loop_count = 0`
    - rerun `plan-reviewer`
    - return to the user gate before materialization
- If the user approves without plan changes:
    - set `user_approved = true`
    - set `stage = "ready_for_materialize"`

### Step 7. Materialize tests

- Invoke `plan-materializer` through the same-agent continuity policy only when `user_approved = true`.
- If `state.json.agents.plan_materializer.id` is present, reuse that same materializer id instead of spawning a second materializer.
- If `state.json.agents.plan_materializer.id` is empty, spawn `plan-materializer`, then record the returned id in `state.json`.
- When a new materializer instance must be spawned for this run, spawn `plan-materializer` with `fork_context = false` and a packet-driven handoff from `state.json`.
- Pass the exact `task-slug` and `./plans/_orchestrator/{task-slug}/state.json` path.
- Tell it that `state.json.plan_path` is the authoritative orchestrated plan path.
- Let it create or update source-tree tests and plan-local `materialize.md`.
- Do not implement production code.
- Require `materialize.md` to start with a YAML frontmatter block that contains at least:
    - `plan_path`
    - `task_slug`
    - `outcome`
    - `gate_status`
    - `blocker_type`
    - `blocker_code`
    - `next_action`
    - `resume_from`
    - `materialize_signature`
    - `requires_user_decision`
    - `blocked_clause_ids`
    - `affected_phase_paths`
- Record `last_materialize_outcome`, `last_materialize_gate_status`, and `last_materialize_signature` in `state.json`.

### Step 8. Route materialize blockers

- If the same `outcome` and the same `materialize_signature` repeat again without an intervening architect-written plan update:
    - increment `materialize_loop_count`
    - if `materialize_loop_count >= 2`, set `stage = "stuck"` and escalate to the user instead of looping
- If `plan-materializer` finishes with `outcome = completed` and `gate_status = passed`, set `stage = "done"`.
- If `plan-materializer` finishes with `outcome = completed` and `gate_status = failed`:
    - set `stage = "materialize_failed"`
    - keep `user_approved = true`
    - stop and tell the user that test materialization completed but the targeted gate failed
- If `plan-materializer` returns `blocked` with `blocker_type = "external_setup"`:
    - set `stage = "blocked_external"`
    - keep `user_approved = true`
    - set `resume_from = "materialize"`
    - stop and tell the user which setup or source-tree prerequisite must be added first
- If `plan-materializer` returns `blocked` with `blocker_type = "plan_ambiguity"`, route the blocker back to `plan-architect`.
- If `plan-materializer` returns `blocked` with `blocker_type = "user_policy"`:
    - ask `plan-architect` for a decision packet
    - return to the user gate
- After any architect revision triggered by materialize:
    - rerun `plan-reviewer`
    - require a fresh user approval before another materialize pass
- When resuming from `blocked_external`, resume at `plan-materializer` only when the plan has not changed since the last approved gate; otherwise resume at `plan-reviewer` or the user gate as needed.

### Step 9. Completion

Terminal stages are:

- `done`
- `blocked_external`
- `materialize_failed`
- `stuck`

`done` requires all of the following:

- executable plan artifacts exist
- latest review state is execution-ready enough to proceed
- user approval was recorded
- `plan-materializer` finished with `gate_status = passed`
- `state.json` reflects the final stage

## Chat response requirements

- Keep orchestration updates short.
- Tell the user which stage is running.
- Present the user gate packet in Korean.
- When blocked, say which agent blocked and where the workflow is routing next.
- If state validation fails, say the authoritative orchestration packet is corrupt, report the validator error, and stop before any named-agent action.
- When `plan-architect` stalls without writing a plan or clarification packet, say so explicitly and stop instead of waiting indefinitely.
- When materialization completes but `gate_status = failed`, say that the planning workflow finished but the targeted test gate did not pass.

## Output contract

- Plan artifacts under `./plans/**`
- Review artifact under `./plans/_orchestrator/review/{task-slug}/review.md` with YAML frontmatter status fields
- Orchestration state under `./plans/_orchestrator/{task-slug}/state.json`
- Clarification packet under `./plans/_orchestrator/{task-slug}/clarification.md` when pre-plan user input is required
- User gate packet under `./plans/_orchestrator/{task-slug}/user-gate.md`
- Test materialization output under plan-local `materialize.md` with YAML frontmatter status fields

## Guardrails

- Orchestrate only: do not substitute for `architect`, `plan-review`, or `plan-materialize`.
- Do not implement production code.
- Do not call `plan-architect` or `plan-reviewer` before the review wiki sync preflight completes.
- Do not ask named planning agents to rediscover the review wiki root, rerun review wiki setup, verify named agent availability, or recompute orchestrator-owned metadata after `state.json.preflight.complete = true`.
- Do not hand malformed or unvalidated `state.json` files to named planning agents.
- Do not mutate `state.json` via a partial patch and continue without validating the full document afterward.
- Do not silently replace a reusable named planning agent with a fresh one for the same `task-slug`; record and report any forced replacement.
- Do not route a pre-plan clarification need through `plan-reviewer`; keep it in the architect clarification path.
- Do not try to inline `design-discovery` inside this workflow; if pre-plan UI direction is missing, surface it through architect clarification and wait for the user.
- Do not skip explicit user approval.
- Do not reintroduce browser-open as a required gate in this workflow.
- Do not let `plan-reviewer` edit plans.
- Do not let `plan-materializer` patch plan ambiguity with tests.
- Do not bypass review after architect revisions.
- Do not reuse stale approval after architect changes the plan.
- Do not keep looping silently when the workflow makes no progress for the same finding or materialization signature.
- Do not wait indefinitely when the architect writes no artifacts after reuse and one safe replacement attempt.
- Do not infer `user_policy` or user-decision routing from free-form prose when structured frontmatter fields are available.
- Do not turn materialize blockers into ad-hoc implementation decisions.
- Do not route `plan-materializer` `external_setup` blockers back to `plan-architect`; stop and surface the setup prerequisite first.

</Instructions>
</Skill_Guide>
