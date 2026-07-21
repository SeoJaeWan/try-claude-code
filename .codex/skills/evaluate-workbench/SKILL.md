---
name: evaluate-workbench
description: Controlled performance benchmarking for one or more arbitrary Workbench plugin targets using repeated full-loop user dialogue, Goal Contract gates, same-thread execution, hidden artifact Oracles, and an optional executor-only component mode. Use only when the user explicitly says evaluate-workbench, Workbench benchmark, Workbench 성능 비교, 버전별 성능 테스트, current와 v3 비교, or asks whether a Workbench revision turns incomplete goals into correct implementations more reliably, with less user dialogue, or faster. Do not use for ordinary skill validation, one-off implementation, or reviewing a target's written workflow.
---

# Evaluate Workbench

Compare observable outcomes produced by Workbench targets under the same controlled user state. Every target turn uses the canonical explicit selectors: `$workbench:brainstorm` for goal dialogue and `$workbench:executor` for implementation. Default to the full interaction from an incomplete request through Goal Contract agreement and implementation. Keep the existing explicit-goal implementation cases as an optional executor-only component benchmark.

## Boundaries

- This is an explicit, relatively expensive benchmark. Do NOT invoke it implicitly.
- Accept auditable `label=absolute-plugin-root` Workbench targets that expose the canonical `brainstorm` and `executor` skills. Do not compare a target that cannot honor the explicit `$workbench:brainstorm` and `$workbench:executor` entrypoints.
- A target path records evidence; it does not rebind the `$workbench` namespace. Before dispatch, verify that each target agent's installed `$workbench` plugin is the exact target version. If two versions cannot be installed in separate agent environments, stop instead of reporting a cross-version comparison.
- Use only the fixed `profile-cache-dedupe` and `optimistic-favorite-ui` cases. Do NOT tune a prompt, scenario response, or Oracle for a target.
- Run exactly one mode per session:
  - `full-loop` (default): incomplete request → controlled dialogue → Goal Contract → same-thread execution → artifact.
  - `executor-only`: complete implementation prompt → artifact. Treat this as a component diagnostic, not overall Workbench performance.
- In `full-loop`, the evaluating parent is a protocol controller. It may classify an observable target response, but it must obtain every user reply from the scenario. Do NOT improvise facts, preferences, objections, or hints.
- Score final contract and artifact outcomes, not adherence to a named skill sequence. Retain exact observable turns and skill attribution for diagnosis only. Never request or save hidden reasoning.
- Treat elapsed time as parallel-load target-active latency. Stop a run clock while the controller classifies a response or prepares a fixed user reply.
- The main Codex conversation owns every `spawn_agent`, `wait_agent`, `send_input`, and `close_agent` call. `benchmark-runner.mjs` owns fixtures, deterministic scenario state, timing, traces, contract records, and artifact judging; it never creates Codex agents.
- Do NOT modify the user's application repository, commit, push, publish, contact production services, or expose evaluator source, scenario files, Oracles, prior runs, or sibling output to a target.

Read [benchmark-contract.md](references/benchmark-contract.md) and [subagent-protocol.md](references/subagent-protocol.md) completely before starting.

## Resolve the request

Resolve:

- Targets: each target is `label=absolute-plugin-root`. Resolve `current` to `<active-workspace>/codex-plugin/plugins/workbench` only when it contains `.codex-plugin/plugin.json`.
- Mode: default to `full-loop`. Use `executor-only` only when the user requests an explicit-goal component test.
- Repetitions: default to `5` per target and case; honor another positive count.
- Output root: default to `<active-workspace>/output/evaluate`.
- Concurrency: request one open agent slot per scheduled run. Two targets × two cases × five repetitions requires 20 slots.

If a target root is ambiguous, ask only for that path. Do not substitute a cache or legacy target. Run separate sessions when comparing modes; do not mix their scores. A fresh workspace or thread alone does not isolate plugin installation.

## Initialize and prepare

Run:

```bash
node <this-skill>/scripts/benchmark-runner.mjs init \
  --target current=/absolute/path/to/current/workbench \
  --target v3=/absolute/path/to/v3/workbench \
  --mode full-loop \
  --repetitions 5 \
  --output-root <workspace>/output/evaluate
```

`manifest.json` freezes target roots, versions, content digests, discovered skill metadata, benchmark mode, cases, requested concurrency, and balanced dispatch order.

Before spawning any target, run `prepare` for every item in `manifest.schedule`:

```bash
node <this-skill>/scripts/benchmark-runner.mjs prepare \
  --session <session-dir> \
  --target <target-label> \
  --benchmark <benchmark-id> \
  --attempt <attempt-number>
```

Finish dependency setup for every workspace first. In `full-loop`, `input.md` contains only the incomplete initial request and `controllerScenario` identifies the hidden scenario for the parent. In `executor-only`, `input.md` contains the complete implementation contract.

## Dispatch the batch

Build every launch payload in schedule order, then submit all `spawn_agent` calls through one parallel orchestration. Each branch must only:

1. Start its run clock.
2. Immediately spawn a fresh subagent without inherited conversation context.

Give the subagent only its workspace, `input.md`, selected target root, and the target envelope from [subagent-protocol.md](references/subagent-protocol.md). Each generated input explicitly names the Workbench skill for that turn; tell the agent to honor that selector against the selected target.

If any spawn fails or every requested slot is unavailable, close all spawned agents, stop all clocks, and abort the session:

```bash
node <this-skill>/scripts/benchmark-runner.mjs abort \
  --session <session-dir> \
  --reason concurrency-limit
```

Do NOT degrade the session into waves.

## Drive `full-loop` runs

Keep one `agent id → run directory` mapping for the whole session. Reuse the same agent thread from the first brainstorm response through implementation.

Collect each interaction round through one parallel wait barrier. Create one branch per currently active agent; each branch waits only for that agent and stops its run clock immediately when the response arrives. Wait for all branches in that round to settle before classifying any response. Do NOT classify one run while another completed response is still waiting for its clock to stop.

After the round barrier:

1. Stop its clock immediately.
2. Save the exact input and output with `record-turn`, including only observable skill names and paths.
3. Compare the output with the scenario's decision descriptions and `matchGuidance` without using the target label.
4. Select only observable events:
   - `<decision-id>:asked` when the target requests that hidden decision.
   - `<decision-id>:correct` when it proposes the scenario value for user confirmation.
   - `<decision-id>:incorrect` when it proposes a conflicting value.
   - `policy:discretionary`, `policy:scope-expansion`, or `policy:unknown` for the fixed policies.
5. Call `scenario-reply`. It returns an exact reply file assembled from scenario text. Do NOT edit it.
6. Build all next-turn payloads first, then start clocks and send replies to their same agents in one parallel follow-up batch.

When the target attempts to finalize, call:

```bash
node <this-skill>/scripts/benchmark-runner.mjs scenario-reply \
  --run-dir <run-dir> \
  --finalize-attempt true
```

The controller returns one predefined objection for the next unresolved decision, `dialogue-limit`, or the fixed Goal Contract request. Never skip unresolved decisions merely because a proposal sounds plausible.

After the target returns the requested contract, save that turn and classify only semantic contract evidence:

```bash
node <this-skill>/scripts/benchmark-runner.mjs record-contract \
  --run-dir <run-dir> \
  --contract-file <exact-contract-output.md> \
  --matched <decision-id> \
  --contradiction <decision-id> \
  --invented <material-decision-label> \
  --uncertain <mapping-description>
```

- `PASS`: every required decision is matched with no contradiction, invented material decision, or premature workspace edit. Send the returned `executeInput`, which explicitly invokes `$workbench:executor`, unchanged to the same agent thread.
- `FAIL`: finish as `CONTRACT_FAIL`; do not execute an unaccepted contract.
- `EVAL_INVALID`: exclude the run from comparison. Use this whenever semantic mapping is genuinely uncertain; do not turn evaluator uncertainty into target failure.

The execution request intentionally restates no requirements. This tests whether the same Workbench session preserves the agreement across handoff. Save the final execution input/output with `record-turn --phase executor --kind execute`; the runner rejects a completed full-loop run without this observable handoff trace.

## Collect and judge

For `executor-only`, collect the single implementation response. For `full-loop`, repeat the parallel wait barrier and parallel follow-up dispatch until execution completes or each run reaches a terminal state. Use the same active-time timeout for all runs.

Do not run public checks, hidden Oracles, builds, or summarization while any target clock is active. After all clocks stop, judge every run:

```bash
node <this-skill>/scripts/benchmark-runner.mjs judge \
  --run-dir <run-dir> \
  --terminal-status completed
```

Use `NEEDS_INPUT`, `DIALOGUE_LIMIT`, `CONTRACT_FAIL`, `TARGET_ERROR`, `EVAL_INVALID`, or `INFRA_ERROR` accurately. A `full-loop` PASS requires both a passing Goal Contract and all artifact/dependency checks.

Close each target only after its final observable response is saved. If fresh isolated agents are unavailable, stop; do not simulate target runs in the parent conversation.

## Summarize

After every scheduled attempt has a terminal result, run:

```bash
node <this-skill>/scripts/benchmark-runner.mjs summarize --session <session-dir>
```

Report:

- end-to-end success count and rate by target and case;
- Goal Contract pass frequency in `full-loop`;
- `NEEDS_INPUT`, `EVAL_INVALID`, `INFRA_ERROR`, and missing runs separately;
- median successful dialogue turns, objection turns, target-active latency, p90 latency, and dispatch skew;
- an executor-only result as component evidence, never as overall Workbench quality;
- clickable paths to `report.md`, `summary.json`, and the session directory.

Rank `full-loop` targets by success rate, then median successful dialogue turns, then median successful parallel-load latency. Rank `executor-only` by success rate, then latency. Limit conclusions to these fixed scenarios and call small samples directional rather than conclusive.
