# Selecting research and execution profiles

## Selection criteria

Select a model and effort independently for each bounded task, honoring explicit user choices and current host capabilities. Consider clarity, cross-module reasoning, consequence of error, and whether inexpensive checks can expose mistakes. Do not automatically inherit the host's profile or apply a fixed ladder by task title.

| Work characteristic | Candidate model | Candidate effort |
| --- | --- | --- |
| Bounded extraction, repetitive edits, clear existing pattern | `gpt-5.6-luna` | `low` or `medium` |
| Implementation, tests, debugging within an understood structure | `gpt-5.6-sol` | `low` or `medium` |
| Coupled behavior, uncertain design, difficult integration/root cause | `gpt-6-astra` (or Sol when sufficient) | `medium` or `high` |

These are initial heuristics, not benchmark results, price rankings, or required defaults. Astra/low and Sol/high may each be appropriate. Use supported IDs and efforts advertised by the target host rather than assuming every listed profile is always available. When the future execution host cannot be inspected, label availability as unverified for execution-time preflight; do not claim a successful launch or estimate a guaranteed token bill.

Each implementation/integration packet includes:

```yaml
execution_profile:
  model: gpt-5.6-sol
  reasoning_effort: medium
  rationale: Several modules share state transitions within an established design.
  escalation: none
```

Only when justified, replace `escalation: none` with a bounded read-only diagnostic policy:

```yaml
escalation:
  mode: diagnostic_agent
  model: gpt-6-astra
  reasoning_effort: high
  trigger: A reproducible failure crosses modules and remains unexplained after focused diagnosis.
  max_additional_agents: 1
```

This permits extra diagnosis within authorized execution, not broader implementation authority or live model switching. Installation failures, missing permissions, and unresolved product choices require their actual remedy, not a stronger model. Any hard user cost/profile limits still apply. Do not add escalation to every task.

## Research during planning

This is separate from the future task profiles. Delegate independent read-only investigation when it has a bounded result and saves time or adds an independent check. Otherwise use local analysis or parallel tool reads.

| Planning investigation | Candidate profile |
| --- | --- |
| File ownership and task collision review | `gpt-5.6-sol` / `medium` |
| Missing prerequisites and integration risks | `gpt-6-astra` / `medium` or `high` |

For each helper, explicitly select both model and effort, use a fresh context (`fork_turns: none` when available), and pass the relevant intent, repository evidence, constraints, read-only boundary, and expected findings with sources. Full-history forks may not accept overrides. Do not open user-owned app tasks for internal delegation. Do not give researchers implementation authority. Keep useful work on the main agent while they run; merge their evidence into a single consistent DAG.

If delegation is unavailable, continue locally. If a preferred profile is unavailable, choose another permitted supported research profile and disclose it, preserving explicit user limits. Report requested profiles and only host-observed effective settings; unexposed settings are `unknown`.
