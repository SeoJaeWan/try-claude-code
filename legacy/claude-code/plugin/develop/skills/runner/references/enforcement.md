# How this skill is enforced (and how it is not)

`SKILL.md` is prose Claude reads each turn — the runner has no
"executable controller" and no PreToolUse gate. Correctness comes from
two layers of defense in depth:

- **This skill's prose + the dispatch prompt.** The LLM driving the
  main session reads SKILL.md each turn; sub-agents read
  `references/prompts/plan-dispatch.md`. The Core rules name exactly
  what the main session may and may not do, and the dispatch prompt
  tells the agent to commit phase by phase inside the worktree.
- **dev-review browser UI.** Every plan commit is reviewed by the human
  reviewer in the browser before merge. Any mutation that lands in a
  commit is visible there — wrong-attribution slips, scope drift, and
  broken phases all show up as commits the reviewer can flag.

What the runner explicitly does **not** do:

- It does **not** block main-session worktree mutations at the tool
  boundary. If the main session edits a file inside the worktree by
  mistake, the next agent's `git add -A` may swallow it into a phase
  commit. The change is visible in dev-review but attribution is lost.
  Cost: one confused review round. Not silent corruption.
- It does **not** block direct `Edit` / `Write` on the plan-state JSON.
  The slim schema (7 identity fields + `dev_review.phase`) is small enough
  that a hand-edit is recoverable, but you should still use the CLI for
  `dev_review.phase` mutations because it bundles load + mutate + atomic
  save and avoids racing with a concurrent `/runner` resume.
- It does **not** verify that an `Agent(...)` dispatch is foreground or
  matches `owner_agent`. The skill prose names both as requirements.

The cost of every "does not" above is one wasted turn that the LLM and
the user notice immediately.

To keep the gap small, every `dev_review.phase` transition in this skill
goes through **one CLI**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
  <subcommand> <state-path> [extra-args]
```

The CLI subcommand catalogue:

| Subcommand | Called from | Effect |
|---|---|---|
| `begin-rework` | Step 4 (rework) | `dev_review.phase: awaiting → rework`, records the feedback path |
| `rework-done` | Step 4 (after rework dispatches commit) | `dev_review.phase: rework → awaiting` |
| `mark-qa-pending` | Step 4 (Q&A round) | `dev_review.phase: awaiting → qa` |
| `qa-resolved` | Step 4 (after answering) | `dev_review.phase: qa → awaiting` |
| `reset` | Step 5 (post-merge cleanup) | delete the state file + sibling `feedback*.json` (requires `--confirm`) |

Anything **not** about a `dev_review.phase` transition (reading the state
JSON, running git commands, dispatching agents, the Step 1 initial write
of the state file via `Write`) is still on the prose — that is the
honor-system surface this skill cannot eliminate. Read the state file
fresh at the top of each turn.

# Why a plan-state JSON

Every plan owns one file at `plans/{plan_key}/.runner-state.json`. The
slim schema carries only the fields the dev-review skill needs to read
plus the dev-review sub-state that disk inspection alone cannot
disambiguate:

```jsonc
{
  "plan_slug": "...",
  "plan_path": "...",
  "owner_agent": "...",
  "task_branch": "...",
  "worktree_path": "...",
  "base_branch": "...",
  "dev_review": {
    "phase": "awaiting" | "rework" | "qa" | null,
    "last_feedback_path": "..."
  }
}
```

The runner skill infers what Step it is on from disk (worktree presence,
commits on `task_branch`, feedback.json content) — not from a `status`
field — so the JSON is intentionally small.

- **Resumable from anywhere.** Re-running `/runner plans/<file>.plan.md` in a
  new session, after a reboot, or even on a different machine will pick the
  state up exactly where it was left.
- **Inspectable.** The user can open the JSON to see the plan identity and
  the current dev-review phase. Step-level state lives in git and on disk.
- **No fragile string contract.** The skill keys off the state file
  directly; there is no parallel record in chat memory or in commit
  messages. The UserPromptSubmit hook is a thin path-sanity gate and does
  not read or write state.

Treat the state file as authoritative for identity. Read it whenever you
need to know `worktree_path`, `task_branch`, `base_branch`, or
`dev_review.phase`. Read disk to know what Step you are on.
