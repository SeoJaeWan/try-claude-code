---
name: memory-update
description: Curate bounded Local Work Memory topics into focused canonical Wikis, navigable hubs, and evidence-backed relationships while processing safe writes sequentially. Invoke only as `$workbench:memory-update`; use when the user explicitly asks to register, revise, split, organize, connect, or deduplicate project knowledge. Do not use for simple completed-artifact persistence.
---

# Memory Update

Integrate every bounded Wiki topic in the request into a project knowledge graph with one canonical owner per concept or contract. Treat Wikis as curated memory, not an artifact archive or permission for work outside this curation request.

Before writing, read both:

- [references/wiki-ontology.md](references/wiki-ontology.md) for document roles, canonical ownership, hub behavior, splitting, and navigation relationships.
- [references/memory-change-set.md](references/memory-change-set.md) for queueing, sequential persistence, failure handling, and result reporting.

## Procedure

1. Require an explicit user-selected knowledge body or bounded Wiki change request and enough provenance to identify its project scope.
2. Use the Local Work Memory MCP according to the guidance and contract it exposes at invocation time. Treat the MCP as authoritative for discovery, retrieval, identity, references, revisions, persistence, concurrency, and result interpretation. Do not name, assume, or invent MCP-owned tools, fields, values, or reference formats.
3. Inspect the catalog before writing. Partition the request into concepts, contracts, conventions, decisions, evidence, guides, and hubs; locate each unit's existing canonical owner before honoring a requested destination page.
4. Coalesce units with the same owner and order the queue so an existing or newly verified anchor precedes dependent navigation. A broad-page request may update a focused owner instead; update the hub only when its overview or navigation actually changes.
5. Process one unit at a time. Retrieve only plausible duplicate, conflict, owner, and relationship candidates, then update the owner, create one justified focused Wiki, leave it unchanged, or block only that unit.
6. Preserve factual meaning while removing duplicated ownership. Keep hubs navigational, keep current contracts separate from decision history and revision-pinned evidence, and use only verified relationship targets.
7. Persist and verify one selected Wiki per write. When splitting existing content, verify the destination owner before narrowing the source. Do not rewrite related pages merely for reciprocal links.
8. Continue after determinate unit outcomes when later units remain safe. Stop only the dependent remainder when identity, concurrency, safety, or write-outcome uncertainty prevents reliable continuation.
9. Re-read the affected catalog and bodies. Check stale names after renames, broken navigation targets, duplicate canonical claims, accidental orphaning, and role leakage before reporting every unit's terminal outcome.

Treat every queued unit derived from the bounded request as authorized Wiki curation, not as unapproved additional work. Do NOT persist completed work artifacts through this skill, search unrelated external sources, modify project files, mutate a Git worktree, update provider-owned records, continue another workflow, or perform work outside this Wiki curation request.
