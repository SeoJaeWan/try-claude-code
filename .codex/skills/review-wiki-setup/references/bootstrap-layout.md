# Review Wiki Bootstrap Layout

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
- `wiki/core/source-precedence.md`
- `wiki/core/decision-policy.md`
- `wiki/core/plan-artifact-contract.md`
- `wiki/core/execution-routing.md`
- `wiki/core/test-and-review-handoff.md`
- `wiki/core/quality-gates.md`
- `wiki/core/execution-handoff.md`

Create these only when missing. Do not overwrite populated files without approval.

Do not create a default `wiki/index.md`. Obsidian graph navigation is built from explicit wikilinks and tag pages under `wiki/tags/**`.

## Registry Purpose

`wiki/registry.json` is the machine-readable routing contract. It should:

- list the core document paths in read order
- optionally define stage-specific `stage_core` overrides when one stage needs a narrower core set than the default planning contract
- list the registered pattern files
- define the tag taxonomy
- define `document_model` as `docs-first-source`
- define `graph_notes_root`, normally `tags`
- define selection policy for `brainstorm`, `architect`, and `review`
- define adjacency and lint policy
- define ingest create-vs-update policy

## Initial Core Documents

Seed these planning concerns:

- `source-precedence.md`
- `decision-policy.md`
- `plan-artifact-contract.md`
- `execution-routing.md`
- `test-and-review-handoff.md`
- `quality-gates.md`
- `execution-handoff.md`

## Docs-First Source Documents

The review wiki is its own human-readable documentation. Keep one source of truth:

- `wiki/core/**` are concept and workflow policy pages
- `wiki/patterns/**` are rule reference pages
- `wiki/tags/**` are category and navigation pages
- `raw/**` are evidence reference pages

Do not generate separate duplicate docs from these files.

## Tag Pages

Create tag pages lazily from the registry taxonomy:

- `wiki/tags/{tag_group}/{tag_value}.md`

The initial taxonomy should include `status: [promoted, raw-only]` so raw evidence always has a graph anchor.

These notes are readable category pages and Obsidian graph hubs. They should link to matching pattern files and raw records with one bullet per linked page, and stage tag notes may also link to core documents that are loaded for that stage.

## Feedback and History

Create feedback and history directories for docs-driven wiki maintenance:

- `feedback/inbox/` stores new docs annotation JSON files.
- `feedback/applied/`, `feedback/rejected/`, `feedback/needs-decision/`, and `feedback/stale/` store processed feedback records.
- `history/YYYY/MM/` stores operation history JSON records produced by ingest, feedback application, setup, lint, or other maintenance steps.

Feedback and history are not canonical wiki content. They are inputs and audit logs. The source of truth remains `wiki/**`, `raw/**`, and `wiki/registry.json`.
