# Review Wiki Bootstrap Layout

## Required Directories

- `raw/`
- `wiki/`
- `wiki/core/`
- `wiki/patterns/`
- `wiki/tags/`
- `wiki/_meta/`

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

Do not create a default `wiki/index.md`. Obsidian graph navigation is built from explicit wikilinks and tag graph notes under `wiki/tags/**`.

## Registry Purpose

`wiki/registry.json` is the machine-readable routing contract. It should:

- list the core document paths in read order
- optionally define stage-specific `stage_core` overrides when one stage needs a narrower core set than the default planning contract
- list the registered pattern files
- define the tag taxonomy
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

## Graph Notes

Create tag graph notes lazily from the registry taxonomy:

- `wiki/tags/{tag_group}/{tag_value}.md`

The initial taxonomy should include `status: [promoted, raw-only]` so raw evidence always has a graph anchor.

These notes are Obsidian navigation hubs. They should link to matching pattern files and raw records, and stage tag notes may also link to core documents that are loaded for that stage.
