---
name: evaluate-workbench
description: Outcome-based performance benchmarking for one or more arbitrary Workbench plugin targets using repeated fixed implementation tasks, isolated subagents, hidden Oracles, success-rate comparison, and observable skill input/output logs. Use only when the user explicitly says evaluate-workbench, Workbench benchmark, Workbench 성능 비교, 버전별 성능 테스트, current와 v3 비교, or asks to measure whether a Workbench revision actually completes implementation goals more reliably or quickly. Do not use for ordinary skill validation, one-off implementation, or reviewing a target's written workflow.
---

# Evaluate Workbench

Compare actual Workbench outcomes, not how closely a target follows a particular workflow. Run two fixed implementation goals repeatedly against any user-selected target roots, then rank final artifact success before successful-run speed.

## Boundaries

- This is an explicit, relatively expensive benchmark. Do NOT invoke it implicitly.
- Accept one or more arbitrary target labels and plugin roots, such as `current`, `v1`, or `v3`. Do NOT assume target skill names or require the targets to share a flow.
- Use exactly the fixed `profile-cache-dedupe` and `optimistic-favorite-ui` cases. Do NOT tune prompts or Oracles for a target.
- Score only the isolated workspace's final artifact. Skill choice, tool count, intermediate messages, and implementation style never affect PASS/FAIL.
- Retain exact observable user/agent turns and observable skill attribution for human diagnosis only. Never request, infer, or save hidden reasoning.
- Do NOT modify the user's application repository, commit, push, publish, or contact production services. Target agents work only in generated fixture workspaces.
- Do NOT expose `assets/benchmarks/*/oracle/`, evaluator source, previous runs, or sibling output to a target agent.

Read [benchmark-contract.md](references/benchmark-contract.md) and [subagent-protocol.md](references/subagent-protocol.md) completely before starting a benchmark.

## Resolve the request

Collect these values from the user's request and local context:

- Targets: each target is an auditable `label=absolute-plugin-root` pair. Resolve `current` to `<active-workspace>/codex-plugin/plugins/workbench` when that directory contains `.codex-plugin/plugin.json`; otherwise ask for its path.
- Repetitions: default to `5` per target and benchmark. Honor another positive count from the user.
- Output root: default to `<active-workspace>/output/evaluate`.

If a requested target root cannot be resolved unambiguously, ask only for that path. Do not substitute a cached or legacy version silently.

## Initialize the session

From the user's active workspace, run:

```bash
node <this-skill>/scripts/benchmark-runner.mjs init \
  --target current=/absolute/path/to/current/workbench \
  --target v3=/absolute/path/to/v3/workbench \
  --repetitions 5 \
  --output-root <workspace>/output/evaluate
```

The resulting `manifest.json` freezes target roots, plugin versions, content digests, discovered skill metadata, benchmark definitions, and an alternating run schedule. Follow `schedule` in order. Do not run timed target attempts concurrently.

## Run each scheduled attempt

For every `(target, benchmark, attempt)` entry:

1. Prepare a clean fixture:

   ```bash
   node <this-skill>/scripts/benchmark-runner.mjs prepare \
     --session <session-dir> \
     --target <target-label> \
     --benchmark <benchmark-id> \
     --attempt <attempt-number>
   ```

2. Start a fresh subagent with no inherited conversation context. Use the same model, reasoning effort, sandbox, and permissions for all targets. Give it only the generated `workspace`, exact `input.md`, selected target root, and the run envelope in [subagent-protocol.md](references/subagent-protocol.md). Tell it to discover that target's native flow from the target itself; do not name expected skills.
3. Start the target-active clock immediately before sending the target prompt:

   ```bash
   node <this-skill>/scripts/benchmark-runner.mjs clock-start --run-dir <run-dir>
   ```

4. Wait for that subagent's response, then stop the clock:

   ```bash
   node <this-skill>/scripts/benchmark-runner.mjs clock-stop --run-dir <run-dir>
   ```

5. Save the exact prompt sent and exact returned response to temporary text files. Record them, including only skills and source paths actually exposed by the runtime or declared by the target agent:

   ```bash
   node <this-skill>/scripts/benchmark-runner.mjs record-turn \
     --run-dir <run-dir> \
     --input-file <exact-input.md> \
     --output-file <exact-output.md> \
     --label agent-session \
     --skill <observed-name@observed-path>
   ```

6. If the subagent asks a question, apply the clarification rules in [subagent-protocol.md](references/subagent-protocol.md). Record each question and answer as another turn. Resume the same subagent and clock only while it is actively working. Mark a genuinely missing product decision as `NEEDS_INPUT`; do not guess.
7. After the subagent gives its final response, judge the artifact. The runner first captures the diff, runs public checks, injects hidden Oracle tests only after agent completion, removes them afterward, and verifies dependency declarations and lockfile remained unchanged:

   ```bash
   node <this-skill>/scripts/benchmark-runner.mjs judge \
     --run-dir <run-dir> \
     --terminal-status completed
   ```

   Use `--terminal-status NEEDS_INPUT` or `ERROR` when applicable. Never let another target inspect the result.

If fresh subagents are unavailable, stop and explain that the benchmark cannot preserve isolation. Do not simulate multiple targets in the parent conversation.

## Summarize

After every scheduled attempt has a terminal result, run:

```bash
node <this-skill>/scripts/benchmark-runner.mjs summarize --session <session-dir>
```

Report:

- pass count and success rate for each target and benchmark;
- median successful target-active time as the tie-breaker, with p90 as a stability signal;
- `NEEDS_INPUT`, missing runs, and failed check frequencies separately;
- a concise conclusion only when the evidence supports one;
- clickable paths to `report.md`, `summary.json`, and the session directory.

When sample sizes are small, call the result directional rather than conclusive. The raw trace may explain failures, but never retroactively alter the outcome score.
