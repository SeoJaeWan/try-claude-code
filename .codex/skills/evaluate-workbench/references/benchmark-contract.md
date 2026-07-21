# Benchmark Contract

## Evaluation claim

The benchmark compares target behavior on two fixed fixture families. It does not assign an absolute quality score to written skill instructions and does not justify claims outside these scenarios.

All target inputs use explicit Workbench invocation. Goal-dialogue turns begin with `$workbench:brainstorm`; implementation turns begin with `$workbench:executor`. A target without those canonical entrypoints is outside this benchmark contract.

The target root does not control selector resolution by itself. `$workbench:*` must resolve to that exact target in the agent's installed plugin environment. Multiple versions sharing the `workbench` namespace require separately isolated installations; otherwise a cross-version result is invalid.

| Mode | What it measures | PASS gate |
| --- | --- | --- |
| `full-loop` | Incomplete request → user dialogue → Goal Contract → same-thread implementation | Contract PASS and artifact PASS |
| `executor-only` | Complete implementation goal → artifact | Artifact PASS |

Use one mode per session. Treat `full-loop` as the primary Workbench benchmark and `executor-only` as a component diagnostic.

## Fixed cases

| ID | Surface | Hidden user decisions and artifact behavior |
| --- | --- | --- |
| `profile-cache-dedupe` | JavaScript logic | Deduplication scope, failure/TTL behavior, change boundary; same-key in-flight sharing and retry semantics |
| `optimistic-favorite-ui` | React UI | Optimistic interaction, failure isolation, accessibility/regression boundary; rollback and independent product behavior |

Each case owns:

- `interactive-prompt.md`: incomplete initial user request for `full-loop`;
- `scenario.json`: hidden user state, fixed replies, turn budget, contract request, and execution trigger;
- `prompt.md`: complete goal for `executor-only`;
- `fixture/`: the only project copied into a target workspace;
- `oracle/`: hidden artifact checks injected only after all target clocks stop.

Do not paraphrase these files or reveal `scenario.json` or `oracle/` to a target.

Every Oracle assertion must trace to an explicit scenario decision, execution prompt condition, or preserved fixture behavior. Do not enforce an unrequested implementation detail such as synchronous call timing, component shape, or a particular promise construction. Keep at least one positive calibration implementation that uses a valid alternative structure and one negative calibration that violates the stated behavior whenever an Oracle changes.

## Controlled dialogue

All targets receive the same latent user state and response policy, not necessarily identical transcripts. Different targets may ask different questions or make different proposals.

For every required decision, classify an observable target turn as one of:

- `asked`: it asks for the user's value;
- `correct`: it proposes the hidden value and needs user confirmation;
- `incorrect`: it proposes a conflicting value;
- unresolved at finalization: the controller emits the predefined `missingAtFinalize` objection.

The runner emits exact scenario text and records the selected event. The parent must not add advice. When a response does not map confidently, end the run as `EVAL_INVALID` or obtain a blinded human adjudication before continuing.

`turnBudget` limits generated clarification, confirmation, policy, and objection turns. The fixed contract request and fixed execution trigger do not count as user-burden dialogue turns.

## Goal Contract gate

Request a final contract only after every required decision has been user-confirmed. Judge the returned contract by semantic slots:

- every required decision must be present and consistent;
- no required decision may be contradicted;
- no material product decision may be invented beyond the scenario;
- the fixture workspace must still match its baseline because the user has not requested execution yet;
- uncertain mappings invalidate the evaluation rather than failing the target.

Only a passing contract receives the fixed execution trigger. The trigger does not restate requirements, so artifact checks also measure handoff retention.

## Repetition and scoring

- Default to five attempts per target and case with a fresh workspace and agent thread each time.
- Keep model, reasoning effort, sandbox, permissions, fixture, scenario, and dispatch policy equal across targets.
- Prepare all runs first and submit the full balanced schedule in one parallel spawn batch. Abort if every slot is unavailable.
- Collect each dialogue round with one parallel wait branch per active agent, stopping each clock inside its branch. Classify only after the round barrier, then dispatch all follow-ups for the next round in parallel.
- Stop target clocks during evaluator/controller work and before any public, Oracle, type, or build check.
- `PASS`, `FAIL`, and `NEEDS_INPUT` are scorable outcomes. `EVAL_INVALID`, `INFRA_ERROR`, and `MISSING` are reported but excluded from the success-rate denominator.
- In `full-loop`, rank success rate first, successful dialogue turns second, and successful target-active latency third.
- In `executor-only`, rank success rate first and successful target-active latency second.
- Compare latency only inside the same session and describe it as parallel-load latency, not uncontended model speed.
- Exact transcript wording, skill sequence, tool count, and implementation style do not change PASS/FAIL.

## Output

Write under `<workspace>/output/evaluate/<UTC run id>/`.

Each attempt contains:

```text
<target>/<benchmark>/run-NNN/
├── workspace/
├── input.md
├── run.json
├── controller/                 # full-loop only
│   ├── state.json
│   ├── replies/
│   └── execute.md
├── goal-contract.md            # full-loop contract attempt
├── contract-result.json        # full-loop semantic slot result
├── result.json
├── changes.diff
├── workspace-status.txt
├── oracle.log
└── skill-io/
    ├── conversation.md
    ├── events.jsonl
    └── NNN-<label>/
```

The session root contains `manifest.json`, `summary.json`, and `report.md`. Keep raw evaluation output out of Git.
