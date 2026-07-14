# Benchmark Contract

## Fixed cases

`evaluate-workbench` owns exactly two initial benchmark cases:

| ID | Surface | Primary behavior |
| --- | --- | --- |
| `profile-cache-dedupe` | JavaScript logic | Same-key in-flight request deduplication, rejection cleanup, and TTL preservation |
| `optimistic-favorite-ui` | React UI | Optimistic favorite state, duplicate-click protection, rollback, isolation, and accessibility |

Read each case prompt from `assets/benchmarks/<id>/prompt.md`. Never paraphrase or add target-specific hints. Copy only the case's `fixture/` directory into an agent workspace. Keep `oracle/` outside the target workspace until the target agent has returned its final result.

## Repetition and scoring

- Default to five attempts per target and case when the user gives no count.
- Use a fresh workspace and fresh subagent thread for every attempt.
- Keep model, reasoning effort, sandbox, permissions, fixture, and prompt equal across targets.
- Score `PASS` only when every public check, hidden Oracle check, build/type check, and dependency contract passes.
- Rank success rate before speed. Compare median successful target-active time only when success rates are equal; retain p90 as a stability signal.
- Report `NEEDS_INPUT` separately. Do not convert missing benchmark information into target failure.
- Do not inspect or score the reasoning path, chosen skill sequence, tool count, or intermediate implementation style.

## Output

Use `<workspace>/output/evaluate/<UTC run id>/` rather than writing into `.codex/skills/evaluate-workbench`, a target plugin, or an installed plugin cache. Raw output is local evaluation data and should normally remain ignored by Git.

Each attempt contains:

```text
<target>/<benchmark>/run-NNN/
├── workspace/
├── input.md
├── run.json
├── result.json
├── changes.diff
├── workspace-status.txt
├── oracle.log
└── skill-io/
    ├── conversation.md
    ├── events.jsonl
    └── NNN-<label>/
```

The session root contains `manifest.json`, `summary.json`, and `report.md`. `manifest.json` records resolved target roots, plugin versions, discovered skill names, and content digests so a label such as `current` remains auditable later.
