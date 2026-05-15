# How this skill is enforced (and how it is not)

`SKILL.md` is prose Claude reads each turn — the runner has no
"executable controller" and no PreToolUse gate. Correctness comes from
three layers of defense in depth:

- **This skill's prose + the dispatch prompt.** The LLM driving the
  main session reads SKILL.md each turn; sub-agents read
  `references/prompts/plan-dispatch.md`. The Core rules name exactly
  what the main session may and may not do, and the dispatch prompt
  tells the agent to commit phase by phase inside the worktree.
- **`runner-state.mjs` schema + ALLOWED_TRANSITIONS.** Every plan-state
  load runs `validateState`; hand-edited or partially-written JSON fails
  loud on the next CLI invocation rather than silently corrupting later
  transitions. All status transitions go through
  `scripts/runner-state-cli.mjs`, which bundles assertion + transition +
  auxiliary updates + atomic save in one place.
- **Stop hook + dev-review browser UI.** Every plan commit is reviewed
  by Codex before `dev_reviewing`, then by the human reviewer in the
  browser. Any mutation that lands in a commit is visible to both
  reviewers — wrong-attribution slips show up as commits the reviewer
  can flag.

What the runner explicitly does **not** do:

- It does **not** block main-session worktree mutations at the tool
  boundary. If the main session edits a file inside the worktree by
  mistake, the next agent's `git add -A` may swallow it into a phase
  commit. The change is visible in dev-review but attribution is lost.
  Cost: one confused review round. Not silent corruption.
- It does **not** block direct `Edit` / `Write` on the plan-state JSON.
  Doing so still breaks schema, but the next CLI call will fail loudly
  on `validateState` rather than continuing on a corrupted file. Use
  the CLI; you save a turn.
- It does **not** verify that an `Agent(...)` dispatch is foreground or
  matches `owner_agent`. The skill prose names both as requirements; if
  you slip, the Stop hook surfaces "dispatch됐지만 새 commit 없음"
  (background) or you re-dispatch with the right agent (mismatch).

The cost of every "does not" above is one wasted turn that the LLM and
the user notice immediately. The previous PreToolUse gate tried to
prevent these turns and instead created a much worse failure mode —
sub-agent tool calls being false-positive-BLOCKed via a fragile cwd
heuristic, putting the runner into an unbreakable re-dispatch loop.

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
