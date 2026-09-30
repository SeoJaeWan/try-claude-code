# Selecting research and execution profiles

## Selection criteria

Select a tier and effort independently for each bounded task, honoring explicit user choices and current host capabilities. Consider clarity, cross-module reasoning, consequence of error, and whether inexpensive checks can expose mistakes. Do not automatically inherit the host's profile or apply a fixed ladder by task title.

Plans record a host-neutral tier and effort so any supported host can execute them; the executing host maps the tier through [Host models](#host-models). Preserve an explicit user-chosen model, including older models; a new release alone does not authorize rewriting it.

| Tier | Work characteristic | Starting effort |
| --- | --- | --- |
| `focused` | Bounded extraction, repetitive edits, focused implementation with clear acceptance checks | `high`; consider `low`/`medium` for simple, easily checked work |
| `standard` | Ordinary or complex implementation, tests, debugging, including understood cross-module changes | `medium`; consider `high` for harder analysis or design judgment |
| `deep` | Hardest multi-step work with sustained uncertainty and coupled design/integration decisions | `low`; increase to `medium`/`high` when deeper reasoning is justified |

These are adjustable starting points, not fixed rankings or price guarantees. Multiple modules alone do not require `deep`. Tier and effort are separate choices: `focused`/`high` is not equivalent in capability or usage to `standard`/`high` or `deep`/`high`. When comparing a model migration, keep the existing supported effort initially and use representative outcomes, retries, time, and usage to decide adjustments; do not require a benchmark for each ordinary task.

Each implementation/integration packet includes:

```yaml
execution_profile:
  tier: standard
  effort: medium
  model: null # set only when the user explicitly chose a host model
  rationale: Several modules share state transitions within an established design.
  escalation: none
```

Only when justified, replace `escalation: none` with a bounded read-only diagnostic policy:

```yaml
escalation:
  mode: diagnostic_agent
  tier: deep
  effort: high
  trigger: A reproducible failure crosses modules and remains unexplained after focused diagnosis.
  max_additional_agents: 1
```

This permits extra diagnosis within authorized execution, not broader implementation authority or live model switching. Installation failures, missing permissions, and unresolved product choices require their actual remedy, not a stronger model. Any hard user cost/profile limits still apply. Do not add escalation to every task.

## Host models

| Tier | Codex | Claude Code |
| --- | --- | --- |
| `focused` | `gpt-6-luna` | `sonnet` |
| `standard` | `gpt-6-sol` | `sonnet` |
| `deep` | `gpt-6-astra` | `opus` |

- Codex: the starting efforts follow the [official model guidance](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna) (checked 2026-09-23). Requests carry both model and effort.
- Claude Code: use the model alias; see the [models overview](https://platform.claude.com/docs/en/models/overview) (checked 2026-09-28). Use `fable` only when the user explicitly chooses it. Claude Code applies only the model, so `focused` and `standard` both use `sonnet`. Do not pass or report effort there; the planned effort still records intent for hosts that apply it.

Use the target host's advertised model/effort combinations, not API support alone. When the future execution host cannot be inspected, label availability as unverified for execution-time preflight; do not claim a successful launch or guarantee a token bill.

## Research during planning

This is separate from the future task profiles. Delegate independent read-only investigation when it has a bounded result and saves time or adds an independent check. Otherwise use local analysis or parallel tool reads.

| Planning investigation | Candidate profile |
| --- | --- |
| File ownership and task collision review | `standard` / `medium` |
| Missing prerequisites and integration risks | `standard` / `medium` for established contracts; `deep` / `medium` or `high` for difficult unresolved interactions |

For each helper, explicitly select the tier's host model, start a fresh context, and pass the relevant intent, repository evidence, constraints, read-only boundary, and expected findings with sources. Identify the host from its subagent tool:

- Codex: pass `model`, `reasoning_effort`, and `fork_turns: none` when available. Full-history forks may not accept overrides.
- Claude Code: start a non-fork subagent with the `model` alias only.

Use internal subagent tools, not separate user-owned tasks or threads. Do not give researchers implementation authority. Keep useful work on the main agent while they run; merge their evidence into a single consistent DAG.

If delegation is unavailable, continue locally. If a preferred profile is unavailable, choose another permitted supported research profile and disclose it, preserving explicit user limits. Report requested profiles and only host-observed effective settings; unexposed settings are `unknown`. On Claude Code, report the model only.
