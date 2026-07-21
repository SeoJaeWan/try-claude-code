# Subagent Protocol

The evaluating parent owns the complete Codex agent lifecycle. The local runner never creates agents.

## Isolation and dispatch

Start one fresh target agent per `(target, benchmark, attempt)` without inherited conversation context. Prepare all workspaces and payloads first, then submit every spawn in one parallel orchestration using the balanced manifest order.

A fresh agent thread does not by itself change the installed plugin binding. Dispatch only when `$workbench:*` resolves to the exact selected target in that agent environment. If same-named target versions cannot be independently installed, abort the comparison.

Give each agent only:

- its isolated fixture workspace;
- the selected target plugin root;
- the generated `input.md`;
- the mode-specific envelope below.

Every generated user input explicitly names `$workbench:brainstorm` or `$workbench:executor`. Tell the agent to inspect the selected target's matching skill metadata and honor that selector. Prohibit access to another target, evaluator files, hidden scenario state, Oracles, prior output, and sibling runs.

Track each returned agent ID against one run directory. Reuse that same agent for every follow-up in the run. Completed-but-open agents retain context and consume concurrency, so close them only after the final response is recorded.

## Target envelope

Use this common envelope:

```text
Work only in <workspace>.
Use only the Workbench target at <target-root>. Follow the explicit `$workbench:brainstorm` or `$workbench:executor` selector in each user input and load the matching skill from this target.
Do not inspect evaluate-workbench, controller/scenario files, Oracle files, prior attempts, sibling targets, or output outside this run.
Do not commit, push, publish, call production services, add dependencies, or change files outside the isolated workspace.
Treat each follow-up from the evaluating conversation as the same user's next message.
At the end of each response, report observable Workbench skill names and source paths actually used when available. Do not expose hidden reasoning.
```

Append for `full-loop`:

```text
Begin from the incomplete user request in input.md. Help the user discover and agree on the goal and observable completion conditions.
Do not edit the workspace or implement until the user explicitly accepts the agreement and asks you to execute it.
Ask concise questions when a material user decision is missing. You may propose a decision with its tradeoff for confirmation.
When you believe the goal is ready, present it to the user for finalization rather than implementing automatically.
```

Append for `executor-only`:

```text
Complete the explicit goal in input.md, run relevant local checks, and return the final user-facing result.
If a material product decision is genuinely absent, ask one concise clarification question and wait.
```

## Event-loop orchestration

Dispatch all initial agents concurrently. Then process interaction rounds with a barrier:

1. Build one parallel branch per currently active agent.
2. In each branch, wait only for that agent and stop its clock immediately on completion or timeout.
3. Wait for every branch in the round to settle before interpreting any response.
4. Save each exact input/output turn.
5. In `executor-only`, finish unless the fixed clarification policy applies.
6. In `full-loop`, map each observable response to scenario events without considering the target label.
7. Ask the runner for each exact next reply. Never rewrite or embellish it.
8. Build all follow-up payloads, then start clocks and `send_input` to the same agents through one parallel batch.

Do not sequentially classify the first completed response while another agent's completed turn still has a running local clock. The per-agent wait branches make target-active timing independent of parent-side classification order.

The controller may combine multiple decision events from one target response; the runner concatenates their predefined replies in scenario order. Select at most one event per decision. When a response both asks and proposes a concrete value, classify the proposal as `correct` or `incorrect` instead of also adding `asked`. A correct target proposal still requires the scenario's explicit confirmation before it becomes agreed user state.

If the target attempts to finalize with unresolved decisions, pass only `--finalize-attempt true`. The runner supplies one predefined missing-decision objection per turn. Once every decision is confirmed, it supplies the fixed Goal Contract request.

After recording and grading the contract:

- PASS: send `executeInput` unchanged to the same thread;
- FAIL: judge as `CONTRACT_FAIL` without implementation;
- EVAL_INVALID: stop and exclude from comparison;
- dialogue budget exhausted: judge as `DIALOGUE_LIMIT`;
- target tool/model failure: judge as `TARGET_ERROR` unless evidence shows evaluator infrastructure caused it;
- evaluator or orchestration failure: judge as `INFRA_ERROR`.

Do not use a second target agent for execution. Same-thread execution is part of the behavior under evaluation.

## Clock and trace rules

- Start a clock immediately before spawn or follow-up `send_input`.
- Stop it as soon as the target response arrives.
- Do not include parent classification, fixed-response generation, human review, Oracle execution, or report generation in target-active time.
- Use `record-turn` for every exact user-to-agent input and returned output.
- Record the final same-thread implementation response with `--phase executor --kind execute`; a full-loop run cannot complete without that trace.
- Record selected event IDs, phase, interaction kind, and observable skill attribution. Never fabricate a skill name or save hidden reasoning/system prompts.
- Do not let trace content retroactively change artifact checks. Contract classification is a declared gate and must be completed before execution.

Do not run verification while any target clock remains active. If one initial spawn fails, close all successful spawns and abort the entire session rather than switching to waves.
