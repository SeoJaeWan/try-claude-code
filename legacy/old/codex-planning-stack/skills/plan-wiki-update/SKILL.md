---
name: plan-wiki-update
description: Update the shared plan wiki from user instructions, docs feedback inbox records, or legacy review evidence by editing core, pattern, or raw planning knowledge, then refreshing generated indexes and health reports. Use instead of separate plan-wiki-apply-feedback or plan-wiki-ingest when Codex needs to apply feedback, add planning knowledge, normalize a pattern, or process remaining legacy `.codex/reviews` inputs.
---

# Plan Wiki Update

Apply durable planning knowledge to the shared plan wiki. This skill merges the old feedback-application path and the old review-ingest path into one update workflow.

## Required Reading

Read only the relevant reference:

- [references/update-sources.md](references/update-sources.md) for user requests, feedback inbox records, and legacy review inputs.
- [references/pattern-model.md](references/pattern-model.md) when creating or changing `wiki/patterns/**` or `raw/**`.

## Workflow

1. Verify the plan wiki.
   - Resolve the source root as `./.codex/plan-wiki/source`.
   - Confirm `wiki/registry.json` exists.
   - If missing or broken, stop and route to `plan-wiki-setup`.

2. Classify the input.
   - User instruction: apply the requested rule, correction, or cleanup directly to the canonical source file.
   - Feedback inbox: process `feedback/inbox/*.json` and move records to outcome folders.
   - Legacy review input: process remaining `.codex/reviews/**/*.md` as optional raw evidence; do not require this path for normal operation.

3. Edit canonical source.
   - Edit `wiki/core/**`, `wiki/patterns/**`, or `raw/**`.
   - Prefer updating an existing rule when the new knowledge is the same failure pattern.
   - Create a new pattern only when it is reusable planning guidance and not merely implementation trivia.
   - Keep raw evidence concise and redacted.
   - Do not create or refresh manual `wiki/tags/**` pages.

4. Refresh generated indexes.
   - Run `node .codex/tools/wiki-index.mjs --mode plan --root .codex/plan-wiki/source/wiki`.
   - Read `wiki/generated/wiki-health.md` and `wiki/generated/normalize-proposals.md`.

5. Normalize safely.
   - Apply mechanical cleanup only when it does not change rule meaning.
   - Leave tag merge, pattern merge, core promotion, deletion, or terminology standardization as proposals unless the user approved them.

6. Finalize.
   - Move feedback records to the right outcome folder when processing feedback.
   - Preserve legacy review inputs unless the full update batch succeeded and the user approved cleanup.
   - Run `git -C .codex/plan-wiki/source status --short`.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not treat `wiki/generated/**` as canonical source.
- Do not reintroduce registry-managed taxonomy, adjacency, or manual tag pages.
- Do not let shared plan wiki rules override repo-local truth.
- Do not invent raw evidence for a pattern.
- Do not delete raw evidence, feedback records, or legacy review files without explicit approval or a completed batch contract.
