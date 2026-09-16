# Local Knowledge Change Queue

## Ownership and ordering

Curate every bounded topic in the request; do not stop after the first document. Inventory `.codocs` and locate the owner of each concept, contract, policy, or procedure before writing. Coalesce units with the same owner. Preserve a coherent explanation unless a distinct subject benefits from its own name and independent maintenance.

Order by supported dependency, otherwise preserve input order. When splitting, create or update and verify the destination before removing duplicate detail from an in-scope source. Keep useful indexes as navigation with enough context, not copies of detailed policies. Do not rewrite unrelated documents merely to add reciprocal links.

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
