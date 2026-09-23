# Local Knowledge Change Queue

## Ownership and ordering

Curate every bounded topic in the request; do not stop after the first document. Inventory `.codocs` and locate the owner of each concept, contract, policy, or procedure before writing. Coalesce units with the same owner. Preserve a coherent explanation unless a distinct subject benefits from its own name and independent maintenance.

Order by supported dependency, otherwise preserve input order. When splitting, create or update and verify the destination before removing duplicate detail from an in-scope source. Keep useful indexes as navigation with enough context, not copies of detailed policies. Do not rewrite unrelated documents merely to add reciprocal links.

## Optional read-only research

For a small topic, inspect and edit directly. For a larger request, use existing parsers/scripts for inventory, IDs, and links; delegate only independent semantic investigations whose results justify the overhead. The main agent reconciles meaning/ownership and remains the single writer.

Select explicit supported model and effort for each helper rather than inheriting the host. Prefer `gpt-6-luna`/high for bounded fact extraction, `gpt-6-sol`/medium for cross-document duplication, and `gpt-6-astra` for difficult unresolved policy contradictions. The [official starting efforts](https://learn.chatgpt.com/docs/models#choosing-sol-terra-and-luna) (checked 2026-09-23) are Luna/high, Sol/medium, and Astra/low; use medium/high for Astra when the contradiction needs deeper analysis. Simple, easily checked extraction may use Luna/low or medium. These are adjustable candidates, not capability or usage rankings; multiple documents alone do not require Astra. Preserve explicit user profiles, including older models.

Check current host IDs/efforts, respect user limits, and pass both settings to a fresh-context spawn (`fork_turns: none` when available). If delegation is unavailable, continue locally. Disclose any permitted alternative profile instead of claiming the preferred one ran.

Give helpers bounded topics, source paths/content identities, relevant schema/rules, and a read-only boundary. Request findings, exact evidence, conflicts, and suggested ownership; do not let helpers edit files, create worktrees, or recursively delegate. Keep the main agent doing independent work. Before writing, recheck any source changed since research; results from a prior document state are not automatically applicable. Record requested profiles and host-observed effective settings when available, otherwise `unknown`.

Policy decisions stay with the user when evidence cannot settle them. Ask promptly and continue unaffected units. Do not write model assignments, task logs, or execution plans into project knowledge.

## Sequential edits

- Read current contents and existing user changes before each write; reconcile concurrent edits or block the affected unit.
- Use the local format and reference rules in [codocs-local.md](codocs-local.md). Verify each saved result before dependent edits.
- Preserve meaning and distinguish proposed policy from confirmed policy. Do not silently resolve substantive contradictions.
- A rename must preserve intended incoming reference targets and resolve ambiguity. Report out-of-scope references or incomplete scans rather than claiming completion.
- Already equivalent content remains unchanged. A determinate failure does not prevent safe independent units from proceeding.
- If a write outcome or shared identity is uncertain, inspect current state before retrying and stop only dependent work that cannot proceed reliably.

## Result

Report a summary and an ordered outcome for every unit:

- created, updated, unchanged, blocked before writing, failed, or uncertain;
- actual project/worktree and local document paths;
- why the existing owner was reused or a new owner was justified;
- factual and structural changes, preserved or repaired references;
- checks performed, results, and validation limitations;
- unresolved conflicts, partial changes, and every unprocessed unit with its blocker.

Leave edits reviewable. Do not report Wiki updates or external synchronization as part of this workflow.
