# Selecting research and execution profiles

## Selection criteria

Select a model and effort independently for each bounded task, honoring explicit user choices and current host capabilities. Consider clarity, cross-module reasoning, consequence of error, and whether inexpensive checks can expose mistakes. Do not automatically inherit the host's profile or apply a fixed ladder by task title.

For new profiles without an explicit model, prefer the GPT-6 candidates below when supported. Select a permitted available alternative and record why if the preferred candidate is unavailable. Preserve supplied model/effort choices, including GPT-5.6 profiles; a new release alone does not authorize rewriting them.

| Work characteristic | Candidate model | Starting effort |
| --- | --- | --- |
| Bounded extraction, repetitive edits, focused implementation with clear acceptance checks | `gpt-6-luna` | `high`; consider `low`/`medium` for simple, easily checked work |
| Ordinary or complex implementation, tests, debugging, including understood cross-module changes | `gpt-6-sol` | `medium`; consider `high` for harder analysis or design judgment |
| Hardest multi-step work with sustained uncertainty and coupled design/integration decisions | `gpt-6-astra` | `low`; increase to `medium`/`high` when deeper reasoning is justified |

These are adjustable starting points, not fixed rankings or price guarantees. Multiple modules alone do not require Astra. Model and effort are separate choices: Luna/high is not equivalent in capability or usage to Sol/high or Astra/high. When comparing a model migration, keep the existing supported effort initially and use representative outcomes, retries, time, and usage to decide adjustments; do not require a benchmark for each ordinary task.

Use the target host's advertised model/effort combinations, not API support alone. When the future execution host cannot be inspected, label availability as unverified for execution-time preflight; do not claim a successful launch or guarantee a token bill. Selection baseline: [official model guidance](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna), checked 2026-09-23.

Each implementation/integration packet includes:

```yaml
execution_profile:
  model: gpt-6-sol
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
| File ownership and task collision review | `gpt-6-sol` / `medium` |
| Missing prerequisites and integration risks | `gpt-6-sol` / `medium` for established contracts; `gpt-6-astra` / `medium` or `high` for difficult unresolved interactions |

For each helper, explicitly select both model and effort, use a fresh context (`fork_turns: none` when available), and pass the relevant intent, repository evidence, constraints, read-only boundary, and expected findings with sources. Full-history forks may not accept overrides. Do not open user-owned app tasks for internal delegation. Do not give researchers implementation authority. Keep useful work on the main agent while they run; merge their evidence into a single consistent DAG.

If delegation is unavailable, continue locally. If a preferred profile is unavailable, choose another permitted supported research profile and disclose it, preserving explicit user limits. Report requested profiles and only host-observed effective settings; unexposed settings are `unknown`.
