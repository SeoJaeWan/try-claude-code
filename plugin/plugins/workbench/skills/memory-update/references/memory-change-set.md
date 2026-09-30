# Local Knowledge Change Queue

## Ownership and ordering

Curate every bounded topic in the request; do not stop after the first document. Inventory `.codocs` and locate the owner of each concept, contract, policy, or procedure before writing. Coalesce units with the same owner. Preserve a coherent explanation unless a distinct subject benefits from its own name and independent maintenance.

Order by supported dependency, otherwise preserve input order. When splitting, create or update and verify the destination before removing duplicate detail from an in-scope source. Keep useful indexes as navigation with enough context, not copies of detailed policies. Do not rewrite unrelated documents merely to add reciprocal links.

## Optional read-only research

For a small topic, inspect and edit directly. For a larger request, use existing parsers/scripts for inventory, IDs, and links; delegate only independent semantic investigations whose results justify the overhead. The main agent reconciles meaning/ownership and remains the single writer.

Select an explicit tier and effort for each helper rather than inheriting the host. Prefer `focused` / `high` for bounded fact extraction, `standard` / `medium` for cross-document duplication, and `deep` / `xhigh` for difficult unresolved policy contradictions. Simple, easily checked extraction may use `focused` / `low` or `medium`. These are adjustable candidates, not capability or usage rankings; multiple documents alone do not require `deep`. Preserve explicit user profiles, including older models.

| Tier | Codex | Claude Code |
| --- | --- | --- |
| `focused` | `gpt-6-luna` | `sonnet` |
| `standard` | `gpt-6.1-sol` | `sonnet` |
| `deep` | `gpt-6.1-sol` | `opus` |

Identify the host from its subagent tool, check its supported choices, respect user limits, and start each helper in a fresh context:

- Codex: pass both `model` and `reasoning_effort`, with `fork_turns: none` when available. The Workbench starting efforts, consistent with [official model guidance](https://developers.openai.com/api/docs/guides/latest-model) (checked 2026-09-30) are focused Luna/high, standard Sol 6.1/medium, and deep Sol 6.1/xhigh.
- Claude Code: start a non-fork subagent with the `model` alias; see the [models overview](https://platform.claude.com/docs/en/models/overview) (checked 2026-09-28). Claude Code applies only the model; do not pass or report effort there. Use `fable` only when the user explicitly chooses it.

If delegation is unavailable, continue locally. Disclose any permitted alternative profile instead of claiming the preferred one ran.

Give helpers bounded topics, source paths/content identities, relevant schema/rules, and a read-only boundary. Request findings, exact evidence, conflicts, and suggested ownership; do not let helpers edit files, create worktrees, or recursively delegate. Keep the main agent doing independent work. Before writing, recheck any source changed since research; results from a prior document state are not automatically applicable. Record requested profiles and host-observed effective settings when available, otherwise `unknown`; on Claude Code, record the model only.

Policy decisions stay with the user when evidence cannot settle them. Ask promptly and continue unaffected units. Do not write model assignments, task logs, or execution plans into project knowledge.

Use `standard` / `high` when scope and solution direction are established but analysis is difficult; use `deep` / `xhigh` when the solution direction remains uncertain and design or integration decisions are coupled. On Codex both tiers use GPT-6.1 Sol; tier alone does not imply a stronger model. Preserve explicit model choices, including GPT-6 Astra, and explicit effort choices.

## Sequential edits

- Read current contents and existing user changes before each write; reconcile concurrent edits or block the affected unit. With MCP, re-get the current owner and use its reviewed revision as described in [codocs-mcp.md](codocs-mcp.md).
- Use the project format and reference rules in [codocs-local.md](codocs-local.md). Verify each saved result and index visibility before dependent edits; recover the index without replaying a completed save.
- Preserve meaning and distinguish proposed policy from confirmed policy. Do not silently resolve substantive contradictions.
- A rename must preserve intended incoming reference targets and resolve ambiguity. Report out-of-scope references or incomplete scans rather than claiming completion.
- Already equivalent content remains unchanged. A determinate failure does not prevent safe independent units from proceeding.
- If a write outcome or shared identity is uncertain, inspect current state before retrying and stop only dependent work that cannot proceed reliably.
- Use one access method for each write. A partial scan, conflict, or uncertain MCP result is not permission to bypass the condition through direct filesystem editing.

## Result

Report a summary and an ordered outcome for every unit:

- created, updated, unchanged, blocked before writing, failed, or uncertain;
- actual project/worktree and local document paths;
- access method (verified Codocs MCP or local-file fallback), with relevant revisions and any save/index recovery distinction;
- why the existing owner was reused or a new owner was justified;
- factual and structural changes, preserved or repaired references;
- checks performed, results, and validation limitations;
- unresolved conflicts, partial changes, and every unprocessed unit with its blocker.

Leave edits reviewable. Do not report Wiki updates or external synchronization as part of this workflow.
