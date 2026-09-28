---
name: memory-update
description: Curate project `.codocs` knowledge and references, preferring Codocs MCP. Invoke only as `$workbench:memory-update` for "메모리를 갱신해" or "문서의 중복과 참조를 정리해"; excludes task logs and Wiki updates.
---

# Memory Update

Curate the target project's local `.codocs` knowledge with one owner per topic and useful navigation. Prefer an available Codocs MCP connection verified against the actual checkout being edited; otherwise use the local-file fallback. Codocs MCP operates on local files and does not expand the write scope. Do NOT read or write Wiki knowledge or synchronize stores.

Read [references/codocs-local.md](references/codocs-local.md) for project selection, authoring, and the local-file fallback, and [references/memory-change-set.md](references/memory-change-set.md) for curation and reporting. When using Codocs MCP, also read [references/codocs-mcp.md](references/codocs-mcp.md) for discovery, revision-based writes, diagnostics, and recovery.

## Procedure

1. Resolve the user-selected project, bounded knowledge request, and actual write checkout under repository worktree rules. Inspect instructions and existing changes. Select verified Codocs MCP or the local-file fallback, then obtain the applicable authoring rules. Do NOT use a connection to another checkout as evidence for this checkout.
2. Inventory existing documents and read relevant owners, duplicates, conflicts, and reference targets. Establish discovery completeness before inferring absence or uniqueness. Identify an existing owner before creating a new document.
3. For substantial independent topics, delegate read-only fact or duplicate analysis using the research guidance in the queue reference. Keep the caller's model unchanged and select each helper profile explicitly. The main agent reconciles findings and remains the single writer. Group units by owner and order dependent updates. Use the project's explanation-separation guidance; do not split a coherent subject by length or impose Wiki document roles.
4. Process each unit sequentially: reread current content, update its owner or create one justified document, leave equivalent content unchanged, or block only that unit. With MCP, use the revision from the latest reviewed get; reconcile conflicts before retrying. Preserve user changes and factual meaning.
5. Verify each saved document and its index visibility before dependent edits. Recover a stale index without repeating a completed write. For splits, establish the destination before narrowing the source. Repair necessary in-scope navigation after renames.
6. Validate edited documents and affected references before dependent writes, then check final catalog uniqueness and reference/navigation consistency. Inspect diagnostic severity separately from request success. Use project tooling and avoid repeating unchanged full scans; report validation limitations.
7. Ask unresolved material policy questions early while continuing independent research or safe units; do not invent confirmed policy. Continue independent safe units after a determinate failure. Stop affected dependents when current-state or write-outcome uncertainty prevents a reliable decision.
8. Return every unit's outcome with actual worktree paths, validation evidence, and remaining conflicts or unprocessed work.

Treat all bounded units as authorized curation. Modify only their `.codocs` owners and necessary index/reference documents. Do NOT modify application code, update Wiki/provider records, archive task progress, or run unrelated workflows. Installing/configuring MCP or creating/migrating a knowledge store requires applicable authorization; availability is not a prerequisite for the local-file fallback. Do NOT commit, push, merge, or deploy without applicable authorization.
