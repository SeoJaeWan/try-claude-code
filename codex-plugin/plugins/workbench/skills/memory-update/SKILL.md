---
name: memory-update
description: Curate one canonical Local Work Memory Wiki by inspecting the existing knowledge structure before creating or updating it, avoiding duplicates, and preserving evidence-backed connections. Invoke only as `$workbench:memory-update`; use when the user explicitly asks to register, revise, organize, or connect project knowledge, including "메모리 갱신" requests. Do not use for simple completed-artifact persistence.
---

# Memory Update

Integrate exactly one canonical Wiki into the existing project knowledge structure. Treat the Wiki as curated project memory, not an artifact archive or permission for additional work.

Read [references/memory-change-set.md](references/memory-change-set.md) before writing.

## Procedure

1. Require an explicit user-selected knowledge body or bounded Wiki change intent and enough provenance to identify its project scope.
2. Use the Local Work Memory MCP according to the guidance and contract it exposes at invocation time. Treat the MCP as authoritative for discovery, retrieval, identity, references, revisions, persistence, concurrency, and result interpretation. Do not name, assume, or invent MCP-owned tools, fields, values, or reference formats.
3. Inspect the current Wiki catalog before writing. Narrow duplicate, overlap, conflict, and relationship candidates from the available catalog metadata, then retrieve only the candidate bodies needed to decide safely.
4. Choose one outcome: update the matching Wiki, create one distinct Wiki, stop because the input should be split, or block before writing when identity, evidence, safety, or current-state requirements are not satisfied.
5. Preserve factual meaning while giving the target Wiki an explicit name, a focused knowledge boundary, and evidence-backed connections to existing Wikis. Follow the MCP's current representation for relationships; never infer a persistent connection from naming or similarity alone.
6. Persist only the selected canonical Wiki through the MCP's current write contract. Do not rewrite other Wiki bodies merely to make a connection bidirectional.
7. Verify the outcome through the current MCP contract when possible. Return the action, duplicate decision, connection decision, exact supplied reference, and any uncertainty, then stop.

Do NOT persist completed work artifacts through this skill, search unrelated external sources, modify project files, mutate a Git worktree, update provider-owned records, continue another workflow, or perform work outside this Wiki curation request.
