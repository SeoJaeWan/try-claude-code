# Plan Wiki Bootstrap Layout

## Required Directories

- `raw/`
- `wiki/`
- `wiki/core/`
- `wiki/patterns/`
- `wiki/tags/`
- `wiki/_meta/`
- `feedback/`
- `feedback/inbox/`
- `feedback/applied/`
- `feedback/rejected/`
- `feedback/needs-decision/`
- `feedback/stale/`
- `history/`

Do not create `wiki/docs/`. The existing `wiki/core/**`, `wiki/patterns/**`, `wiki/tags/**`, and `raw/**` files are the docs-first source documents.

## Required Initial Files

- `wiki/registry.json`
- `wiki/core/common/출처-우선순위.md`
- `wiki/core/common/의사결정-정책.md`
- `wiki/core/common/계획-산출물-계약.md`
- `wiki/core/common/실행-라우팅.md`
- `wiki/core/common/테스트와-리뷰-핸드오프.md`
- `wiki/core/common/품질-게이트.md`
- `wiki/core/common/실행-핸드오프.md`

Create these only when missing. Do not overwrite populated files without approval.

Do not create a default `wiki/index.md`. Obsidian graph navigation is built from explicit wikilinks and tag pages under `wiki/tags/**`.

## Registry Purpose

`wiki/registry.json` is the machine-readable routing contract. It should:

- list the core document paths in read order
- optionally define stage-specific `stage_core` overrides when one stage needs a narrower core set than the default planning contract
- list the registered pattern files
- define the domain taxonomy with top-level `common`, `frontend`, `backend`, and `infra` domains plus domain-local tags
- define `document_model` as `docs-first-source`
- define `graph_notes_root`, normally `tags`
- define selection policy for `brainstorm`, `plan-maker`, and `review`
- define adjacency and lint policy
- define ingest create-vs-update policy

## Initial Core Documents

Seed these planning concerns:

- `출처-우선순위.md`
- `의사결정-정책.md`
- `계획-산출물-계약.md`
- `실행-라우팅.md`
- `테스트와-리뷰-핸드오프.md`
- `품질-게이트.md`
- `실행-핸드오프.md`

## Docs-First Source Documents

The plan wiki is its own human-readable documentation. Keep one source of truth:

- `wiki/core/**` are concept and workflow policy pages
- `wiki/patterns/**` are rule reference pages
- `wiki/tags/**` are category and navigation pages
- `raw/**` are evidence reference pages

Do not generate separate duplicate docs from these files.

## Tag Pages

Create tag pages lazily from the registry domain taxonomy:

- domain landing page paths declared in `registry.graph_notes.domains`
- domain-local tag page paths declared in `registry.graph_notes.tags`

Use plain raw `status` metadata and raw `## 관련 문서` status bullets instead of creating status tag pages.

These notes are readable category pages and Obsidian graph hubs. Domain landing pages should link only to domain-local tag pages, and domain-local tag pages should link only to matching pattern files. Raw evidence should be linked from pattern rules rather than directly from domain or tag pages.

Pattern rule document filenames should use Korean title slugs. Domain/tag route pages declared in `registry.graph_notes` may use stable English taxonomy-key filenames such as `common.md` and `frontend/visual.md`. Raw evidence filenames may use Korean, English, or stable technical terms. Keep registry keys, `rule_id`, `raw_id`, domain/tag values, and other machine-readable identifiers stable.

## Feedback and History

Create feedback and history directories for docs-driven wiki maintenance:

- `feedback/inbox/` stores new docs annotation JSON files.
- `feedback/applied/`, `feedback/rejected/`, `feedback/needs-decision/`, and `feedback/stale/` store processed feedback records.
- `history/YYYY/MM/` stores operation history JSON records produced by ingest, feedback application, setup, lint, or other maintenance steps.

Feedback and history are not canonical wiki content. They are inputs and audit logs. The source of truth remains `wiki/**`, `raw/**`, and `wiki/registry.json`.
