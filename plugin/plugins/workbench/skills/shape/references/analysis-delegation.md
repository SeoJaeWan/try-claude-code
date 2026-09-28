# Delegating analysis

Delegate only when the work has an independent input, a bounded result, and useful speed or quality benefits. For a short lookup, work locally or batch independent tool reads instead. Do not split the same investigation across agents unless an independent second opinion is useful.

Keep the caller's model unchanged. Select each helper's tier and effort explicitly, respecting the user's preferences. These are starting examples, not a fixed ranking or guaranteed cost comparison:

| Work | Candidate profile |
| --- | --- |
| Code locations and call relationships | `focused` / `high` |
| Behavior and impact across modules | `standard` / `medium` |
| Independent assessment of alternatives and failure conditions | `standard` / `medium` for understood alternatives; `deep` / `medium` or `high` for difficult uncertain tradeoffs |

Preserve explicit user profiles, including older models. Adjust for scope, uncertainty, consequence of error, and available checks. Simple, easily checked extraction may use `focused` / `low` or `medium`. Cross-module scope alone does not require `deep`, and effort labels do not imply equal capability or usage across tiers.

## Host models

| Tier | Codex | Claude Code |
| --- | --- | --- |
| `focused` | `gpt-6-luna` | `haiku` |
| `standard` | `gpt-6-sol` | `sonnet` |
| `deep` | `gpt-6-astra` | `opus` |

Identify the host from its subagent tool and check its supported choices before spawning. Start each helper in a fresh context:

- Codex: pass both `model` and `reasoning_effort`, with `fork_turns: none` when exposed. Full-history forks may not allow overrides. The [official starting efforts](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna) (checked 2026-09-23) are Luna/high, Sol/medium, and Astra/low; the harder review above can justify more effort. Do not inherit a high host effort merely because it is the host setting.
- Claude Code: start a non-fork subagent with the `model` alias; see the [models overview](https://platform.claude.com/docs/en/models/overview) (checked 2026-09-28). Effort follows the session. Use `fable` only when the user explicitly chooses it.

If a preferred profile or delegation is unavailable, use an allowed supported choice or do the research locally, disclose the limitation, and preserve explicit user constraints.

Give each helper the objective, exact checkout/HEAD or inspected content identities, relevant requirements and project rules, read-only boundary, question, and expected evidence. Return concise findings with file/line or official-source references, uncertainties, and counterevidence. Helpers must not create worktrees, edit files, or mutate linked services. Delegate through internal subagent tools, not separate user-owned tasks or threads.

The main agent continues independent work, verifies decisive evidence, and integrates the result. Recheck changed sources before using a stale finding. Record the requested profile and host-reported effective profile when available; use `unknown` for unexposed effective settings and `session` for Claude Code effort, never the helper's self-reported identity. Stop or redirect affected research when the user changes the request and keep unrelated research running.
