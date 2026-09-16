---
name: memory-update
description: Curate bounded project knowledge in local `.codocs` YAML documents using the project's authoring rules and verified sequential edits. Invoke only as `$workbench:memory-update`; use for "메모리를 갱신해", "프로젝트 지식을 정리해", or "문서의 중복과 참조를 정리해" requests. Do not use for completed-artifact persistence or Wiki updates.
---

# Memory Update

Update only the target project's local `.codocs` knowledge. Keep one owner per topic and preserve useful navigation. Do NOT read or write Wiki knowledge, synchronize stores, or require a memory provider.

Read [references/codocs-local.md](references/codocs-local.md) for project discovery, authoring, references, and validation, and [references/memory-change-set.md](references/memory-change-set.md) for sequential curation and reporting.

## Procedure

1. Resolve the user-selected project and bounded knowledge request. Inspect repository instructions, existing changes, and `.codocs` authoring and placement rules. This skill's local-only scope takes precedence over older paired Wiki/local update procedures; do not rewrite those procedures unless requested.
2. Inventory existing documents and read relevant owners, duplicates, conflicts, and reference targets. Identify an existing owner before creating a new document.
3. Group units by owner and order dependent updates. Use the project's explanation-separation guidance; do not split a coherent subject by length or impose Wiki document roles.
4. Process each unit sequentially: reread current content, update its owner or create one justified document, leave equivalent content unchanged, or block only that unit. Preserve user changes and factual meaning.
5. Verify every saved document before dependent edits. For splits, establish the destination before narrowing the source. Repair necessary in-scope navigation after renames.
6. Check YAML/schema, ID and name collisions, references, and navigation reachability with available project tooling. Distinguish semantic validation from generic YAML parsing and report any limitations.
7. Continue independent safe units after a determinate failure. Stop affected dependents when current-state or write-outcome uncertainty prevents a reliable decision.
8. Return every unit's outcome with actual worktree paths, validation evidence, and remaining conflicts or unprocessed work.

Treat all bounded units as authorized curation. Modify only their `.codocs` owners and necessary index/reference documents. Do NOT modify application code, update Wiki/provider records, archive task progress, run unrelated workflows, or commit, push, merge, or deploy without applicable authorization. Follow repository worktree rules for local edits.
