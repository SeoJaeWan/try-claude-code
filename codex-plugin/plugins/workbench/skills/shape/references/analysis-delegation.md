# Delegating analysis

Delegate only when the work has an independent input, a bounded result, and useful speed or quality benefits. For a short lookup, work locally or batch independent tool reads instead. Do not split the same investigation across agents unless an independent second opinion is useful.

Keep the caller's model unchanged. Select each helper's model and effort explicitly from the host's available choices, respecting the user's preferences. These are starting examples, not a fixed ranking or guaranteed cost comparison:

| Work | Candidate profile |
| --- | --- |
| Code locations and call relationships | `gpt-6-luna` / `high` |
| Behavior and impact across modules | `gpt-6-sol` / `medium` |
| Independent assessment of alternatives and failure conditions | `gpt-6-sol` / `medium` for understood alternatives; `gpt-6-astra` / `medium` or `high` for difficult uncertain tradeoffs |

Prefer these GPT-6 candidates for new choices when available; preserve explicit user profiles, including older models. Adjust for scope, uncertainty, consequence of error, and available checks. The [official starting efforts](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna) (checked 2026-09-23) are Luna/high, Sol/medium, and Astra/low; the harder review above can justify more effort. Simple, easily checked extraction may use Luna/low or medium. Cross-module scope alone does not require Astra, and effort labels do not imply equal capability or usage across models.

Do not inherit a high host effort merely because it is the host setting. Check supported combinations before spawning; use a fresh context (`fork_turns: none` when exposed) and pass both model and effort. Full-history forks may not allow overrides. If a preferred profile or delegation is unavailable, use an allowed supported choice or do the research locally, disclose the limitation, and preserve explicit user constraints.

Give each helper the objective, exact checkout/HEAD or inspected content identities, relevant requirements and project rules, read-only boundary, question, and expected evidence. Return concise findings with file/line or official-source references, uncertainties, and counterevidence. Helpers must not create worktrees, edit files, or mutate linked services. Delegate through subagent tools, not separate user-owned app tasks.

The main agent continues independent work, verifies decisive evidence, and integrates the result. Recheck changed sources before using a stale finding. Record the requested profile and host-reported effective profile when available; use `unknown` for unexposed effective settings, never the helper's self-reported identity. Stop or redirect affected research when the user changes the request and keep unrelated research running.
