# Plan Wiki Ingest Reference

## Path Contract

- Review inbox root: main repository root `.codex/reviews/`
- Review inbox file pattern: `.codex/reviews/**/*.md`
- Plan wiki root: `./.codex/plan-wiki/source`
- Required directories:
  - `raw/`
  - `wiki/`
  - `wiki/core/`
  - `wiki/patterns/`
  - `wiki/tags/`
  - `wiki/_meta/`
  - `history/`
- Required control file:
  - `wiki/registry.json`

Use `./.codex/plan-wiki/source` as the only stable source entrypoint. Do not hardcode an external vault path into other skills.

If execution begins inside a linked worktree or nested workspace, resolve the main repository root before scanning `.codex/reviews/`.

## Current Producer Contract

The current review collector writes BLOCK reviews to:

`.codex/reviews/{sanitized-branch}/{headSha}.md`

Do not assume a flat inbox. Always scan recursively.

## Operation History

Every successful, blocked, partial, or failed ingest batch should write one history JSON record under:

`history/YYYY/MM/{YYYYMMDD-HHMMSS}-ingest.json`

The history record is for docs display and audit. It must summarize inputs, raw records, pattern changes, registry changes, validation results, and source review cleanup. It must not store full review text and must not become the source of truth.

Read `references/history-model.md` before writing history records.

## Raw File Naming

Write one raw file per normalized evidence group using:

`YYYYMMDD-{evidence-summary-slug}.md`

Rules:

- `YYYYMMDD` is the ingest date in local time.
- `{evidence-summary-slug}` is derived from the planning implication or another evidence summary.
- Raw filenames may use Korean, English, or stable technical terms. Keep `raw_id` as the stable machine-readable identifier inside the file.

## Raw Document Schema

Store these fields before the docs-first evidence body:

- `raw_id`
- `source_reviews`
- `source_branches`
- `source_commits`
- `matched_plan`
- `matched_phase`
- `issue_type`
- `ingested_at`
- `status`
- `promoted_rules`
- `normalized_findings`
- `planning_implication`

Write the values of `normalized_findings`, `planning_implication`, and the evidence body in Korean. Keep metadata keys, branches, commits, rule ids, raw ids, and status values in their existing machine-readable form. Pattern rule document filenames must use Korean title slugs, while route/index pages such as domain and tag graph notes may use stable English taxonomy keys. Raw filenames may use Korean, English, or technical terms.

After the metadata block, write a readable evidence page with a top-level `#` heading and the raw evidence page schema below.

In raw `## 관련 문서`, include:

- one plain status value such as `promoted`, `raw-only`, or `partial-failure`
- one promoted-rule wikilink for each promoted or referenced pattern, when applicable

Promoted-rule links should use an Obsidian wikilink such as:

`[[wiki/patterns/frontend/accessibility/접근성-id를-실제-렌더링-슬롯에-묶기|접근성 ID를 실제 렌더링 슬롯에 묶기]]`

Suggested `status` values:

- `raw-only`
- `promoted`
- `partial-failure`

`raw-only` is valid when the review could not be matched to a plan by exact branch or when the finding is not promotable.

## Registry Schema

`wiki/registry.json` is the machine-readable source of truth for:

- core document order
- pattern file registration
- tag vocabulary
- graph note root
- docs-first document model
- selection policy
- adjacency rules
- lint policy
- ingest policy

Use `document_model: docs-first-source` in the registry. The plan wiki must not keep a separate generated documentation tree such as `wiki/docs/**`; the existing `wiki/core/**`, `wiki/patterns/**`, `wiki/tags/**`, and `raw/**` files are the human-readable documentation and the machine-readable source of truth at the same time.

Every promoted pattern file must be registered in the registry `patterns` array with:

- `rule_id`
- `path`
- `title`
- `domain`
- `tags`

Tag pages use:

- `graph_notes_root`: `tags`
- explicit `registry.graph_notes.domains[domain]` paths for domain landing pages
- explicit `registry.graph_notes.tags[domain][tag]` paths for domain-local tag pages

The registry uses `domain_taxonomy` rather than a global tag taxonomy. The approved top-level domains are `common`, `frontend`, `backend`, and `infra`; each domain owns its own local tag vocabulary. Use plain raw `status` values instead of status tag pages.

Tag pages are readable category pages and navigation hubs for Obsidian graph view. Domain landing pages should link only to domain-local tag pages, and domain-local tag pages should link only to matching patterns. They should not link directly to raw records. They are not pattern-selection candidates and are not registered in the `patterns` array.

## Docs-First Source Model

The wiki files should read like official documentation while staying directly consumable by planning agents.

- `wiki/core/**`: concept and workflow policy pages
- `wiki/patterns/**`: rule reference pages
- `wiki/tags/**`: category and navigation pages
- `raw/**`: evidence reference pages

Do not duplicate the same content into a separate docs tree. When source content changes, update the source document itself and refresh its `## 관련 문서` links.

## Korean Terminology Policy

Human-readable prose should be Korean-first. Keep English only when it is a machine-readable token, code/API/library/tool name, file path, branch, commit, rule id, frontmatter key, tag key/value, agent name, or code span.

Use Korean prose terms for general planning concepts:

- `surface` -> `표면`
- `user action` -> `사용자 행동`
- `visible success` -> `눈에 보이는 성공 상태`
- `failure outcome` -> `실패 결과`
- `trigger` -> `트리거`
- `precondition` -> `사전 조건`
- `recipient` -> `수신자`
- `delivery target` -> `전달 대상`
- `boundary` -> `경계`
- `contract` -> `계약`
- `planning` -> `계획`
- `implementation` -> `구현`
- `validation` -> `검증`
- `state` -> `상태`
- `phase` -> `단계`
- `owner` -> `소유자`
- `evidence` -> `근거`

Do not create awkward mixed phrases such as `중요한 user action`, `영향을 받는 surface`, or `validation contract를`. Write the Korean sentence naturally, preserving English only for the token that must remain English.

## Pattern File Schema

Every promoted pattern file should include YAML frontmatter with:

- `rule_id`
- `title`
- `summary`
- `tags` as an Obsidian-compatible list, not a nested object
- `domains`
- `domain_tags`
- optional `stages` and `risks` lists when they are useful for routing or review
- `raw_sources`

Use `tags` only for Obsidian tag values derived from the routing fields:

- `plan-wiki/domain/{domain}` for each `domains` value
- `plan-wiki/{domain}/{tag}` for each `domain_tags` value
- `plan-wiki/stage/{stage}` for each `stages` value
- `plan-wiki/risk/{risk}` for each `risks` value

Do not store plan wiki routing metadata as a nested object under `tags`; Obsidian treats `tags` as a reserved tag-list property.

Write `title`, `summary`, all human-readable body content, and pattern rule document filenames in Korean. Technical terms, API names, code tokens, and stable English route keys may remain English. Keep `rule_id`, `raw_id`, frontmatter keys, domain/tag keys, branch names, commits, and code/API tokens stable.

Every promoted pattern file body should use this docs-first heading order:

- `개요`
- `문제`
- `적용 조건`
- `해야 할 것`
- `피해야 할 것`
- `적용 예시`
- `판단 근거`
- `관련 문서`

Use imperative language in `해야 할 것` and `피해야 할 것`. Keep the file short enough that `architect` can scan it while planning.

In `## 관련 문서`, include:

- one wikilink for each `domain_tags` value
- one wikilink for each `raw_sources` entry

Pattern filenames should use:

- `wiki/patterns/{domain}/{primary-domain-tag}/{korean-title-slug}.md`

Do not create a default `wiki/index.md`. Obsidian graph navigation should come from `wiki/tags/**` tag pages and explicit pattern/raw/core wikilinks.

## Raw Evidence Page Schema

Raw evidence files under `raw/**` should keep the machine-readable metadata keys at the top, then use this docs-first heading order:

- top-level `#` title using the `issue_type`
- `개요`
- `핵심 발견`
- `계획상 의미`
- `출처`
- `관련 문서`

In `## 관련 문서`, include the plain status value and promoted or referenced pattern links. Do not link raw records directly to domain or tag pages; the graph path should be domain page -> tag page -> pattern rule -> raw evidence. Raw-only evidence should keep the plain status value; do not recreate `status` tag pages.

## Tag Page Schema

Tag pages at the paths declared in `registry.graph_notes` are domain and category reference pages. They should use this docs-first heading order:

- `개요`
- `하위 태그` for domain landing pages, or `관련 패턴` for domain-local tag pages
- `설명`

Domain landing pages must not link directly to pattern rules or raw evidence. Domain-local tag pages must not link directly to raw evidence. Use one bullet per linked page. Avoid long comma-separated link lines.

## Core Page Schema

Core pages under `wiki/core/**` are concept and workflow policy pages. They should include YAML frontmatter with `doc_type: core`, Korean `title`, and Korean `summary`, followed by a Korean `#` heading and a short `## 개요`. Keep the existing policy sections after the overview, then end with `## 관련 문서` when stage or tag links apply.

## Plan Matching

Match a review to a plan only when:

- the review `Branch` matches the plan `**Branch:**` header exactly

If no exact match exists:

- keep the result as `raw-only`
- do not promote a wiki rule from that evidence
- do not guess from recency or fuzzy similarity

## Grouping Model

Treat the inbox as source evidence.

- input unit: review files under `.codex/reviews/**/*.md`
- raw output unit: normalized evidence groups
- wiki output unit: reusable planning rules

One ingest batch may transform `m` source reviews into `n` raw records.

Group raw by:

- issue type
- matched plan boundary

## Promotion Decision

Promote feedback when all of the following hold:

- it can improve planning quality before implementation starts
- it can be generalized into a reusable rule
- it can point back to raw evidence

Repetition is not required. Promote one-off findings when they are planning-critical.

Keep feedback in raw only when it is mostly:

- unmatched to a plan
- project-specific debugging detail
- stylistic nit
- implementation trivia that does not improve future planning

## New Pattern Creation

Update an existing pattern file when:

- the new evidence is a semantic duplicate of an existing rule
- the same planning implication already exists and the new evidence only strengthens it

Create a new pattern file when:

- the concern is planning-relevant
- the concern is independent rather than a semantic duplicate
- the same domain/tag combination can coexist without conflicting intent

When the new evidence conflicts with an older rule:

- stop automatic promotion
- draft the exact file and registry changes that would replace the older rule with the newer one
- ask the user to approve the replacement before applying it

Whenever a pattern file is created, removed, or renamed, update `wiki/registry.json` in the same operation.

Whenever a pattern's tags or raw sources change, refresh its `## 관련 문서` section, the affected raw `## 관련 문서` sections, and the affected `wiki/tags/**` tag pages in the same batch while preserving the domain -> tag -> pattern -> raw graph path.

When a new domain or domain-local tag value outside `domain_taxonomy` appears necessary, do not silently add it during promotion. Draft the registry and affected tag-page changes in `wiki/_meta/ingest-report.md` and ask the user to approve the taxonomy expansion before applying it.

## Failure Policy

- Build the normalized raw batch before wiki promotion.
- Delete the source review files only after the raw batch, wiki changes, and registry updates all succeed.
- If any step fails, stop immediately and keep the source review files.
- If the ingest batch succeeds, remove the remaining source review files from the inbox.
- Redact or mask secrets and obvious personal identifiers before writing raw.
