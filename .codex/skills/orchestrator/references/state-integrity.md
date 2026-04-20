# State Integrity Contract

Use this contract whenever `orchestrator` reads, mutates, or hands off `state.json`.

## Validator

Validate any orchestrator state file with:

```bash
node ./.codex/skills/orchestrator/scripts/validate-orchestrator-state.mjs --state ./plans/_orchestrator/<task-slug>/state.json
```

The validator checks:

- JSON syntax
- required top-level shape
- agent role slots
- key stage invariants such as `blocked_external`, `materialize_failed`, `done`, and `stuck`

## Safe write pattern

When mutating `state.json`:

1. Keep the last known good file untouched until the new candidate validates.
2. Write the full next state to `state.json.next`.
3. Run the validator against `state.json.next`.
4. Replace `state.json` only after the candidate passes validation.
5. Re-run the validator against the final `state.json` before any named-agent handoff.

`state.json.bak` may be kept as the most recent validated snapshot when recovery would be useful, but do not silently restore from it without telling the user.

## Corruption policy

If the current `state.json` fails validation:

- stop before any `resume_agent`, `send_input`, or replacement spawn
- report the exact validator error
- do not reinterpret the broken file from chat memory
- do not relabel the issue as an architect, reviewer, or materializer stall

If the user explicitly asks for a fresh isolated run, a corrupt prior state may be archived and replaced with a new clean state for the new slug. Otherwise, stop and surface the corruption.

## Routing reminder

`plan-materializer` blockers split by `blocker_type`:

- `plan_ambiguity` -> route to `plan-architect`
- `user_policy` -> route to the user gate
- `external_setup` -> set `stage = "blocked_external"` and `resume_from = "materialize"`; do not route back to `plan-architect`
