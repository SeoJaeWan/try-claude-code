# Canonical Wiki Ontology

Use this contract to decide where requested knowledge belongs before writing.

## One owner per knowledge unit

A concept, type, state rule, execution order, policy table, or current decision has one active canonical owner. Other Wikis may provide the minimum context needed to navigate to that owner, but they do not copy its detailed model, table, or normative wording.

When a user names a destination Wiki, treat it as a retrieval hint rather than proof of ownership. If a focused owner already exists, update it. Update the named broad page only when its overview or navigation must change, and explain the routing in the result.

## Document roles

Classify each selected Wiki by body role independently of the MCP's supported `kind` values.

| Role | Owns | Does not own |
|---|---|---|
| Hub | Field overview, component map, reading path | Child types, detailed rules, duplicated tables |
| Concept | One independently answerable domain idea | Cross-cutting workflow or historical rationale |
| Contract | Verifiable current behavior or boundary | Why an old alternative was rejected |
| Convention | Reusable authoring, placement, naming, or validation policy | Feature-specific product state |
| Decision | Choice, alternatives, evidence used, revisit conditions | The evolving current contract |
| Evidence | Revision-pinned observation, reproduction, provenance, gaps | Policy promotion without a decision |
| Guide | When and in what order to apply commands or contracts | A duplicate command catalog or domain definition |

Use a current Concept, Contract, or Convention as the implementation owner. Decision and Evidence pages point to it rather than re-declaring it.

## Hub behavior

A hub should answer:

- What field is this?
- What are its major components?
- Which canonical Wiki answers each detailed question?
- Which higher-level policy and evidence sources constrain it?

A hub may show a small orientation flow or ownership map. It should not repeat child type definitions, cardinality rules, command lists, test matrices, or transition tables.

## Split and creation test

Create or extract a focused Wiki when at least one condition holds:

- two or more Wikis need the same knowledge unit;
- the unit can change or be verified independently;
- it answers a stable question on its own;
- duplicate ownership would create drift risk;
- a current contract must be separated from a decision or evidence record.

Keep a detail in its current owner when it is used only there, lacks independent identity, or is a speculative candidate without product evidence. Do not turn every heading into a Wiki.

## Update routing

For each knowledge unit:

1. Search titles, slugs, headings, kinds, and plausible synonyms.
2. Retrieve only candidate owners, duplicates, conflicts, and relationship anchors.
3. Identify the current owner or justify a new focused boundary.
4. Preserve facts in the owner before removing duplicated detail elsewhere.
5. Keep the former broad page as a hub when it still has navigational value.
6. Tombstone only when the old page has no distinct role and its useful meaning is safely preserved.

Prefer a focused update over rewriting every related Wiki. Bidirectional navigation is optional; canonical ownership is not.

## Navigation relationships

Use the project's existing relationship convention when present. If none exists and the MCP does not support Wiki-to-Wiki edges, a selected Wiki may use body-level navigation like this, matching the document language:

```markdown
## 관계

- 상위 개념: 「Exact catalog title」 (`stable-slug`)
- 구성 요소: 「Exact catalog title」 (`stable-slug`)
- 적용 계약: 「Exact catalog title」 (`stable-slug`)
- 결정 근거: 「Exact catalog title」 (`stable-slug`)
- 구현 근거: 「Exact catalog title」 (`stable-slug`)
- 대체 관계: 「Exact catalog title」 (`stable-slug`)
```

Use only relevant relation types. A body-level relation is navigation metadata, not a persistent MCP connection. Verify title and slug from the current catalog, and ignore examples inside fenced code when validating targets.

Prefer directional labels such as parent concept, component, current contract, decision basis, implementation evidence, and replacement over an untyped "related" list.

## Structural migration

For a broad document with duplicated sections:

1. Map each section to an existing or justified focused owner.
2. Create or update and verify missing owners sequentially.
3. Rewrite the broad document as an overview and component map.
4. Replace detailed duplicate sections with short context plus verified navigation.
5. Repair old titles after renames within the bounded change set.
6. Preserve Decision and Evidence bodies unless the request includes them or current-contract duplication must be removed.

Do not claim an atomic move when the MCP performs separate writes. If a destination write is indeterminate, do not narrow the source.

## Validation

Before reporting completion, check:

- each changed current rule has one active canonical owner;
- hubs do not duplicate child types or detailed normative tables;
- Decision and Evidence pages do not masquerade as the current contract;
- body navigation resolves to exact catalog titles and slugs;
- old titles are absent from affected navigation after a rename;
- new pages are reachable from a useful hub or are intentionally standalone;
- repeated relationship lines are not misclassified as duplicated knowledge;
- unrelated Wikis were not rewritten merely to add reciprocal links.

Report unresolved conflicts, intentional standalone pages, retained historical repetition, and any unit left unchanged or blocked.
