# Worker profiles and host dispatch

## Planned or selected profile

Honor each packet's `execution_profile` tier, effort, any explicit `model`, and user limits. Tier choice is not automatically `deep`, nor effort automatically low or inherited. Keep the active coordinator model unchanged.

For producer-neutral input without a profile, select one during normalization and record the choice and rationale in the execution binding. A source profile that names only `model` and `reasoning_effort` is an explicit model choice; map `reasoning_effort` to `effort` and preserve the model. Select new profiles by tier:

| Tier | Work characteristic | Starting effort |
| --- | --- | --- |
| `focused` | Bounded extraction, repetitive edits, focused implementation with clear checks | `high`; `low` or `medium` may suffice for simple, easily checked work |
| `standard` | Ordinary or complex implementation/debugging, including understood cross-module changes | `medium`; consider `high` for harder analysis or design judgment |
| `deep` | Hardest multi-step work with sustained uncertainty and coupled design/integration decisions | `low`; increase to `medium` or `high` when justified |

These are adjustable starting points, not fixed rankings or price guarantees. Multiple modules alone do not require `deep`. Effort labels are not equivalent capability or usage levels across tiers or models.

When selecting a new profile, an unavailable preferred candidate may be replaced with another permitted supported choice, recording the reason. Do NOT silently upgrade or reclassify an explicit source/user profile, including older explicit models. Apply an authorized profile change through a traceable execution-binding revision while preserving the original source/digest. For a requested model comparison, initially preserve the supported effort and compare representative outcomes, retries, time, and usage before adjusting it; this is not an extra gate for ordinary execution.

## Host models

Resolve the tier to the executing host's model. An explicit `model` overrides the tier mapping on the host that supports it.

| Tier | Codex | Claude Code |
| --- | --- | --- |
| `focused` | `gpt-6-luna` | `haiku` |
| `standard` | `gpt-6-sol` | `sonnet` |
| `deep` | `gpt-6-astra` | `opus` |

- Codex: the starting efforts follow the [official model guidance](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna) (checked 2026-09-23); actual host-supported combinations govern dispatch.
- Claude Code: use the model alias; see the [models overview](https://platform.claude.com/docs/en/models/overview) (checked 2026-09-28). Use `fable` only when the user explicitly chooses it. Claude Code cannot set effort per subagent; workers run at the session effort, which is not a profile mismatch.

## Dispatch

1. Identify the host from its subagent tool and inspect its actual creation arguments and model choices. Account for role/config overrides if using custom agents. Do not install agents or change host configuration just to enforce a profile.
2. Use a fresh context and a complete packet. YAML alone does not configure a worker; the actual spawn call must carry the resolved settings.
   - Codex: pass `fork_turns: none`, `model: <resolved model>`, and `reasoning_effort: <packet effort>` explicitly. Full-history forks may not accept overrides.
   - Claude Code: start a non-fork subagent with `model: <resolved alias>`. Effort follows the session.
3. Use internal subagent tools, not separate user-owned tasks or threads. Workers receive relevant intent, repository rules, profile, scope, base, checks, and authority without relying on parent history. Do not recursively spawn additional implementation workers outside the normalized task schedule.
4. Record planned and requested profiles plus effective settings from host metadata when exposed. An agent's claim about its own model is not proof. Use `unknown` for unexposed effective settings and `session` for Claude Code effort. If the host reports a model mismatch, stop affected writes and resolve it; do not report the intended setting as applied.
5. If a resolved model cannot be requested, mark that task blocked, explain the unsupported setting and possible alternatives, and continue independent runnable tasks. Do not silently substitute or change an explicit profile. If subagent execution itself is unavailable, report that limitation rather than implementing in the coordinator.

The host bounds concurrency. Queue excess work instead of altering profiles. Identical host and worker settings are allowed when deliberately selected, not merely inherited.

## Optional diagnosis

Default `escalation` is `none`. A supplied `diagnostic_agent` policy may name tier or model, effort, evidence-based trigger, and `max_additional_agents`. Validate its fields and supported settings before use. When the trigger occurs within authorized execution, the coordinator may spawn that bounded number of read-only diagnostic helpers with explicit profiles. Record the trigger, evidence, requested/effective profile, and result separately from the original packet. Do not change the original digest or infer permission for a more expensive profile outside the policy/user limits.

Keep one writer for a worktree. Diagnostic helpers receive an exact commit or stable captured diff/content identity; they do not edit, commit, create worktrees, or recursively delegate. Revalidate their findings against the current working state before the worker applies them. Existing workers need not be replaced or have their live model changed. Environmental failures and missing product decisions are not escalation triggers. Once the diagnostic limit is exhausted, finish remaining meaningful work and report unresolved findings instead of unbounded retries.
