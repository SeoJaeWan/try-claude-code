# Worker profiles and host dispatch

## Planned or selected profile

Honor each packet's `execution_profile.model`, `reasoning_effort`, and user limits. Model choice is not automatically Astra, nor effort automatically low or inherited. Keep the active coordinator model unchanged.

For producer-neutral input without a profile, select one during normalization and record the choice and rationale in the execution binding. Prefer supported GPT-6 candidates for new choices:

| Work characteristic | Candidate profile |
| --- | --- |
| Bounded extraction, repetitive edits, focused implementation with clear checks | `gpt-6-luna` / `high`; `low` or `medium` may suffice for simple, easily checked work |
| Ordinary or complex implementation/debugging, including understood cross-module changes | `gpt-6-sol` / `medium`; consider `high` for harder analysis or design judgment |
| Hardest multi-step work with sustained uncertainty and coupled design/integration decisions | `gpt-6-astra` / `low`; increase to `medium` or `high` when justified |

These are adjustable starting points, not fixed rankings or price guarantees. Multiple modules alone do not require Astra. Effort labels are not equivalent capability or usage levels across models. The baseline follows [official model guidance](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna), checked 2026-09-23; actual host-supported combinations govern dispatch.

When selecting a new profile, an unavailable preferred candidate may be replaced with another permitted supported choice, recording the reason. Do NOT silently upgrade or reclassify an explicit source/user profile, including GPT-5.6 settings. Apply an authorized profile change through a traceable execution-binding revision while preserving the original source/digest. For a requested model comparison, initially preserve the supported effort and compare representative outcomes, retries, time, and usage before adjusting it; this is not an extra gate for ordinary execution.

## Dispatch

1. Inspect the host's actual subagent creation arguments and model/effort choices. Account for role/config overrides if using custom agents. Do not install agents or change host configuration just to enforce a profile.
2. Use a fresh context and a complete packet. With a host exposing these arguments, pass `fork_turns: none`, `model: <packet model>`, and `reasoning_effort: <packet effort>` explicitly. Full-history forks may not accept overrides. YAML alone does not configure a worker; the actual spawn call must contain both settings.
3. Use internal subagent tools, not separate user-owned app tasks. Workers receive relevant intent, repository rules, profile, scope, base, checks, and authority without relying on parent history. Do not recursively spawn additional implementation workers outside the normalized task schedule.
4. Record planned and requested profiles plus effective settings from host metadata when exposed. An agent's claim about its own model is not proof. Use `unknown` for unexposed effective settings. If the host reports a mismatch, stop affected writes and resolve it; do not report the intended setting as applied.
5. If a specified profile cannot be requested, mark that task blocked, explain the unsupported setting and possible alternatives, and continue independent runnable tasks. Do not silently substitute or change an explicit profile. If subagent execution itself is unavailable, report that limitation rather than implementing in the coordinator.

The host bounds concurrency. Queue excess work instead of altering profiles. Identical host and worker settings are allowed when deliberately selected, not merely inherited.

## Optional diagnosis

Default `escalation` is `none`. A supplied `diagnostic_agent` policy may name model, effort, evidence-based trigger, and `max_additional_agents`. Validate its fields and supported settings before use. When the trigger occurs within authorized execution, the coordinator may spawn that bounded number of read-only diagnostic helpers with explicit profiles. Record the trigger, evidence, requested/effective profile, and result separately from the original packet. Do not change the original digest or infer permission for a more expensive profile outside the policy/user limits.

Keep one writer for a worktree. Diagnostic helpers receive an exact commit or stable captured diff/content identity; they do not edit, commit, create worktrees, or recursively delegate. Revalidate their findings against the current working state before the worker applies them. Existing workers need not be replaced or have their live model changed. Environmental failures and missing product decisions are not escalation triggers. Once the diagnostic limit is exhausted, finish remaining meaningful work and report unresolved findings instead of unbounded retries.
