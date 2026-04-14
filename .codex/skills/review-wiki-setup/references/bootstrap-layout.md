# Review Wiki Bootstrap Layout

## Required Directories

- `raw/`
- `wiki/`
- `wiki/core/`
- `wiki/patterns/`
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

## Registry Purpose

`wiki/registry.json` is the machine-readable routing contract. It should:

- list the core document paths in read order
- list the registered pattern files
- define the tag taxonomy
- define selection policy for `architect` and `review`
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
