# How this skill is enforced (and how it is not)

`SKILL.md` is prose Claude reads each turn — the runner has no
"executable controller". Hard guarantees come from three places:

- `runner-state.mjs` enforces the plan-state schema and the
  ALLOWED_TRANSITIONS table on every save. Bypassing it with raw
  `Edit` / `Write` on the JSON breaks the guarantees silently.
- The Stop hook decides ALLOW / BLOCK / TIMEOUT and writes the verdict
  back through the same library. It cannot know whether *this skill*
  obeyed the prose between turns.
- The **PreToolUse hook** intercepts every tool call and consults
  `lib/pre-tool-use-policy.mjs`. While a plan is mid-flight it applies
  a target-location rule: tool calls whose `cwd` (Bash) or `file_path`
  (Edit/Write) lie inside the active worktree are treated as the
  dispatched agent's work and ALLOWed during agent-active phases
  (`dispatching`, `dev_reviewing/rework`). Calls from outside the
  worktree that try to mutate it, or any worktree edit during
  `dev_reviewing/awaiting`/`qa` (reviewer drift protection), are
  BLOCKed. Agent dispatches must match `state.owner_agent` and be
  foreground. If you see a `decision: "block"` payload starting with
  `[runner] 활성 plan`, the reason names the offending status and the
  recovery path — read it instead of retrying the same call.

  **The hook does not mutate plan-state.** All status transitions go
  through `runner-state-cli.mjs` (arm-for-dispatch, begin-rework,
  mark-approved, ...). Every transition is a Bash call the skill
  makes explicitly — you can read the turn log and see the sequence.

To keep the gap small, every status transition in this skill goes through
**one CLI**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" \
  <subcommand> <state-path> [extra-args]
```

The CLI bundles `assertExpectedStatus` + `transitionStatus` + the auxiliary
helpers (`setStopReviewArmed`, `bumpDevReviewRound`) + atomic `saveState`
for each step the skill needs. Do **not** reach into `runner-state.mjs`
helpers from inline `node -e` snippets, and do **not** edit the JSON with
`Edit` / `Write`. The subcommand catalogue, with the canonical step that
calls each, is:

| Subcommand | Called from | Effect |
|---|---|---|
| `arm-for-dispatch` | Step 3 (before the plan-agent `Agent(...)` call) and Step 3 re-entry (before re-dispatch after BLOCK) | `preparing → dispatching` + `stop_review.phase = "armed"` (or re-arm from `phase = "blocked"`) |
| `begin-rework` | Step 4 (rework) | phase mutation: `dev_review.phase: awaiting → rework`, bump round, record feedback path. **Status stays `dev_reviewing`.** |
| `rework-done` | Step 4 (after rework dispatches commit) | phase mutation: `dev_review.phase: rework → awaiting` |
| `mark-qa-pending` | Step 4 (Q&A round) | phase mutation: `dev_review.phase: awaiting → qa` |
| `qa-resolved` | Step 4 (after answering) | phase mutation: `dev_review.phase: qa → awaiting` |
| `mark-approved` | Step 4 (approval) | `dev_reviewing → closing`, clears `dev_review.phase` |
| `mark-merged` | Step 5 (after `git merge`) | `closing → merged` |
| `reset` | Step 5 (post-merge cleanup) | delete the state file + sibling `feedback*.json` (requires `--confirm`) |

Anything **not** about a status transition (reading the state JSON, running
git commands, dispatching agents) is still on the prose — that is the
honor-system surface this skill cannot eliminate. Read the state file
fresh at the top of each turn.

# Why a plan-state JSON SSOT

Every plan owns one file at `plans/{plan_key}/.runner-state.json`. That file
is the only place the runner records progress, and every hook that the runner
participates in (UserPromptSubmit, Stop) reads from and writes to it. There is
no parallel record kept in chat memory, in commit messages, or in regex
contracts inside agent prompts. The benefits:

- **Resumable from anywhere.** Re-running `/runner plans/<file>.plan.md` in a
  new session, after a reboot, or even on a different machine will pick the
  state up exactly where it was left.
- **Inspectable.** The user can open the JSON to see the current step, the
  worktree path, the dev-review round, and recent BLOCK history.
- **No fragile string contract.** The previous runner relied on the agent's
  `description` and `prompt` matching exact regexes so hooks could find the
  plan. That contract is gone — hooks now key off the state file directly.

Treat the state file as authoritative. Read it whenever you need to know
something about the plan; never guess from chat history alone.
