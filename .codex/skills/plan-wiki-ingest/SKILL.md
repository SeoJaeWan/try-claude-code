---
name: plan-wiki-ingest
description: Deprecated compatibility wrapper for legacy Codex review ingestion. Use `plan-wiki-update` instead to process remaining `.codex/reviews/**/*.md` files as optional raw evidence, promote reusable planning patterns, and refresh generated plan wiki indexes.
---

# Plan Wiki Ingest

This skill is retained only for old triggers. The normal maintenance path is now `plan-wiki-update`.

## Route

1. Use `plan-wiki-update`.
2. Treat `.codex/reviews/**/*.md` as legacy optional input.
3. Do not update registry taxonomy, adjacency, manual tag pages, or registered pattern catalogs.
4. Refresh generated indexes through `node .codex/tools/wiki-index.mjs --mode plan --root .codex/plan-wiki/source/wiki`.

## Guardrails

- Do not delete legacy review files unless the update batch succeeds and the user approved cleanup.
- Do not invent raw evidence or promote implementation trivia.
