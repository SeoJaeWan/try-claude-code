---
name: memory-update
description: Curate every bounded Local Work Memory Wiki topic in a user request by inspecting the existing knowledge structure, processing canonical Wiki changes sequentially, avoiding duplicates, and preserving evidence-backed connections. Invoke only as `$workbench:memory-update`; use when the user explicitly asks to register, revise, organize, or connect one or more project-knowledge topics, including "메모리 갱신" requests. Do not use for simple completed-artifact persistence.
---

# Memory Update

Integrate every bounded Wiki topic in the request into the existing project knowledge structure. Treat the Wikis as curated project memory, not an artifact archive or permission for work outside this curation request.

Read [references/memory-change-set.md](references/memory-change-set.md) before writing.

## Procedure

1. Require an explicit user-selected knowledge body or bounded Wiki change request and enough provenance to identify its project scope.
2. Use the Local Work Memory MCP according to the guidance and contract it exposes at invocation time. Treat the MCP as authoritative for discovery, retrieval, identity, references, revisions, persistence, concurrency, and result interpretation. Do not name, assume, or invent MCP-owned tools, fields, values, or reference formats.
3. Inspect the current Wiki catalog before writing. Partition the supplied content into every distinct in-scope knowledge unit, coalesce units that belong to the same canonical Wiki boundary, and order the resulting queue so verified anchors precede dependent connections. Do not ask the user to select only one unit or stop merely because the request contains multiple units.
4. Process the queue sequentially. For each unit, narrow duplicate, overlap, conflict, and relationship candidates from catalog metadata; retrieve only the candidate bodies needed to decide safely; then choose one outcome: update the matching Wiki, create one distinct Wiki, leave it unchanged, or block that unit before writing.
5. Preserve factual meaning while giving each selected Wiki an explicit name, a focused knowledge boundary, and evidence-backed connections to existing or earlier verified Wikis. Follow the MCP's current relationship representation; never infer a persistent connection from naming or similarity alone.
6. Persist only the current queue unit's selected canonical Wiki through each MCP write. Do not rewrite other Wiki bodies merely to make a connection bidirectional. Verify and record the outcome, then refresh any state needed before processing the next unit.
7. Continue with later independent units after an unchanged result, determinate failure, or unit-level pre-write block. Stop only the affected remainder when shared identity, safety, concurrency, or current-state uncertainty makes further writes unsafe.
8. Return only after every safely processable unit has reached a terminal outcome. Report the ordered per-unit actions, duplicate and connection decisions, exact supplied references, uncertainties, and any unprocessed units with reasons.

Treat every queued unit derived from the bounded request as authorized Wiki curation, not as unapproved additional work. Do NOT persist completed work artifacts through this skill, search unrelated external sources, modify project files, mutate a Git worktree, update provider-owned records, continue another workflow, or perform work outside this Wiki curation request.
