---
name: runner
description: Deterministic plan-runner that executes a single self-contained plan in one worktree, dispatches one agent, and gates merge behind stop-review and dev-review. Use when executing a finalized plan file (either `*.plan.md` or a folder's `plan.md`). Each session owns exactly one plan per `/runner` invocation; multiple plans run in independent terminals. HEAD always stays on the base branch and the plan-state JSON at `plans/{plan_key}/.runner-state.json` is the single source of truth for progress.
model: sonnet
---

<Skill_Guide>
<Purpose>
Execute a single plan artifact end-to-end — either `*.plan.md` or a folder's
canonical `plan.md` — in one worktree, one plan-agent
dispatch, gated by stop-review and dev-review. The runner does not parse the
plan's body and does not pick the entry point on its own — the
UserPromptSubmit hook reads the plan and emits a `[runner-skill bootstrap]`
context block telling the skill exactly which plan, which state file, and
which step to resume from. The skill's job is to act on that bootstrap and
keep the on-disk plan-state JSON in sync with reality.
</Purpose>

</Instructions>
</Skill_Guide>
