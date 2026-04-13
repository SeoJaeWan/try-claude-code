# Review Wiki Bootstrap Layout

## Required Directories

- `raw/`
- `wiki/`
- `wiki/_meta/`

## Required Initial Files

- `wiki/index.md`
- `wiki/scope-boundary.md`
- `wiki/contracts-state-validation.md`
- `wiki/rollout-verification.md`

Create these only when missing. Do not overwrite populated files without approval.

## Index Purpose

`wiki/index.md` is a routing index, not a full wiki dump. It should:

- explain that `architect` reads this file first
- list the current wiki documents
- state each document's `purpose`
- state each document's `read_when`
- state each document's `skip_when`
- explain raw fallback rules

## Initial Routing Documents

Seed these planning concerns:

- `scope-boundary.md`
  - phase boundaries
  - merge boundaries
  - shared foundation
  - prerequisites

- `contracts-state-validation.md`
  - input and output contract shape
  - canonical identifiers
  - validation rules
  - permission and state transitions

- `rollout-verification.md`
  - rollout and rollback
  - compatibility
  - migration safety
  - verification strategy
