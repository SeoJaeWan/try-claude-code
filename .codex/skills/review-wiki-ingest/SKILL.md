---
name: review-wiki-ingest
description: Ingest Codex review files from the main repository root under `.codex/reviews/**/*.md` into the user-level review wiki by reading the source reviews, matching them to plans by branch, normalizing them into integrated raw evidence records, promoting planning-relevant feedback into reusable wiki rules, updating `wiki/index.md`, and deleting source review files only after batch success. Use when Codex needs to convert collected BLOCK review output into durable planning knowledge for future `architect` runs.
---

# Review Wiki Ingest

Use this skill to process review inbox files into the review wiki. Resolve the review wiki root from `~/.codex/reviewWiki`, then read [references/data-model.md](references/data-model.md) before editing raw or wiki files.

## Workflow

1. Verify the path contract.
   - Input inbox root: main repository root `.codex/reviews/`
   - Input file pattern: `.codex/reviews/**/*.md`
   - Review wiki root: `~/.codex/reviewWiki`
   - Required output directories: `raw/`, `wiki/`, `wiki/_meta/`
   - If the link is missing or broken, stop and use `review-wiki-setup`.
   - If running from a worktree or nested workspace, resolve the main repository root first.

2. Load the inbox files one by one.
   - Recursively scan the inbox root for markdown review files.
   - Treat the inbox as a batch of source reviews rather than a one-file to one-raw pipeline.
   - A single batch may produce `n` raw records where `n` does not need to match the source review count.
   - Read the reviews carefully enough to identify issue groups, branch context, commit context, and planning implications.

3. Match reviews to plans before promotion.
   - Match each review by exact `Branch` equality against a plan `**Branch:**` header.
   - If the plan match fails, keep the normalized output as raw-only and do not promote wiki rules from that review.
   - Do not guess the plan from recency or fuzzy similarity.

4. Build normalized raw evidence.
   - Create integrated raw records from one or more source reviews.
   - Group evidence by issue type plus plan boundary.
   - Do not preserve full source review text or verbatim excerpts unless needed for clarity.
   - Keep only the information needed to understand the issue, its context, and its planning implication.
   - Derive a deterministic raw filename using the rule in the reference file.
   - Redact or mask secrets, tokens, passwords, and obvious personal identifiers before saving.
   - Record the raw metadata fields from the reference schema.

5. Decide what gets promoted into wiki rules.
   - Promote only feedback that improves future planning quality.
   - Do not require repetition. A one-off review may still be promotable when it is planning-critical.
   - Keep implementation-only or unmatched findings in raw unless they can be restated as reusable planning guidance.

6. Update existing wiki documents before creating new ones.
   - Start from `wiki/index.md`.
   - Prefer adding or strengthening an existing rule card when the concern already fits a current document.
   - Create a new wiki document immediately when the concern is planning-relevant, independent, and does not fit naturally into existing documents.
   - When creating a new document, use an ASCII slug filename and register it in `wiki/index.md`.

7. Update the affected rule cards.
   - Use the rule-card schema from the reference file.
   - Add `raw_sources` backlinks.
   - Favor concise, imperative planning guidance over long summaries.
   - Strengthen existing `do` or `avoid` guidance only when the new evidence actually changes the rule.

8. Finalize atomically per ingest batch.
   - Delete the source inbox files only after the raw batch, wiki updates, and index updates all succeed.
   - If any step fails, stop immediately and keep the source review files in place.
   - If the ingest batch succeeds, remove the remaining source review files from the inbox.
   - Do not continue with partial cleanup after a failed batch.

## Promotion Rules

- Promote when the feedback can change future planning quality before implementation starts.
- Promote when the feedback can be generalized into a reusable rule with a raw evidence link.
- Promote when the feedback is planning-critical even if it has appeared only once.
- Keep in raw only when the feedback is unmatched, project-local debugging detail, style nit, or implementation trivia that does not improve later planning.

## Guardrails

- Do not delete or rewrite existing wiki documents broadly just because a new review disagrees; resolve only the affected rules.
- Do not create one markdown file per rule.
- Do not force raw to mirror source review files one-to-one.
- Do not store unredacted sensitive values in raw.
- Do not let wiki guidance override repo-local truth when a later `architect` run consumes the wiki.
- Do not invent evidence. Every promoted rule must link back to one or more raw documents.

## Reference

- Read [references/data-model.md](references/data-model.md) for path contracts, raw schema, rule-card schema, file naming, and new-document creation policy.
