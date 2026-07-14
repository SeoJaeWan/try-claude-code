# Plan Wiki Bootstrap Layout

## Required Directories

- `raw/`
- `wiki/`
- `wiki/core/`
- `wiki/patterns/`
- `wiki/generated/`
- `wiki/_meta/`
- `feedback/`
- `feedback/inbox/`
- `feedback/applied/`
- `feedback/rejected/`
- `feedback/needs-decision/`
- `feedback/stale/`
- `history/`

Do not create `wiki/docs/`. The existing `wiki/core/**`, `wiki/patterns/**`, `wiki/generated/**`, and `raw/**` files are the docs-first source and derived maintenance surface.

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

## Registry Purpose

`wiki/registry.json` is a boot config. It should:

- define `version`
- define `document_model`
- define `source_precedence`
- define roots such as `core`, `patterns`, `raw`, and `generated`
- list stage-specific `stage_core` documents

Do not use the registry as a manual taxonomy, adjacency map, tag allowlist, or pattern catalog. Documents describe themselves with frontmatter, and `wiki/generated/**` derives lookup indexes.

## Docs-First Source Documents

- `wiki/core/**` are concept and workflow policy pages.
- `wiki/patterns/**` are reusable planning guidance pages.
- `raw/**` are evidence reference pages.
- `wiki/generated/**` is derived output from `.codex/tools/wiki-index.mjs`.

## Feedback and History

Feedback and history directories are maintenance inputs and audit logs. The source of truth remains `wiki/**`, `raw/**`, and `wiki/registry.json`.
