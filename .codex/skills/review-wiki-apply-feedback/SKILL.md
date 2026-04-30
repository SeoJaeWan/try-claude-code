---
name: review-wiki-apply-feedback
description: Apply review wiki docs feedback JSON files from `~/.codex/reviewWiki/feedback/inbox/*.json` into the user-level review wiki source documents by re-locating selected text, updating `wiki/core/**`, `wiki/patterns/**`, or `raw/**`, refreshing affected tag/raw/pattern graph links, moving feedback records to an outcome folder, and writing operation history. Use when Codex needs to turn human docs annotations into durable review wiki source updates without treating rendered docs as the source of truth.
---

# Review Wiki Apply Feedback

Use this skill to process feedback captured from the review wiki docs UI. Resolve the review wiki root from `~/.codex/reviewWiki`, then read [references/feedback-model.md](references/feedback-model.md) and [references/history-model.md](references/history-model.md) before editing wiki files.

## Workflow

1. Verify the path contract.
   - Review wiki root: `~/.codex/reviewWiki`
   - Feedback inbox: `feedback/inbox/*.json`
   - Feedback outcome folders: `feedback/applied/`, `feedback/rejected/`, `feedback/needs-decision/`, `feedback/stale/`
   - Operation history root: `history/`
   - Source document roots: `wiki/core/`, `wiki/patterns/`, `wiki/tags/`, and `raw/`
   - Required control file: `wiki/registry.json`
   - If the link is missing or broken, stop and use `review-wiki-setup`.

2. Load feedback records one by one.
   - Treat feedback as human annotation input, not as raw review evidence.
   - Validate each JSON record against the feedback model.
   - Keep the feedback `id`, `source_path`, `selection`, and `feedback` fields intact.
   - Do not modify a feedback record before deciding its outcome.

3. Re-locate the selected text.
   - Resolve `source_path` relative to the review wiki root.
   - Use `selection.quote` first.
   - Use `selection.prefix` and `selection.suffix` to disambiguate repeated quotes.
   - If the source file is missing or the selected text cannot be located confidently, mark the feedback as `stale` and do not edit the wiki.
   - If the feedback was captured on a tag page, prefer applying the correction to the linked core, pattern, or raw source that generated the tag page.

4. Classify the requested change.
   - Apply directly when the change is a typo, wording cleanup, Korean terminology cleanup, broken link alias, or local clarification that does not change rule meaning.
   - Apply directly when the feedback asks for a missing example or condition and the existing raw evidence already supports it.
   - Require user approval when the feedback would create, delete, rename, split, merge, or semantically weaken/strengthen a pattern rule.
   - Require user approval when the feedback would change `wiki/registry.json`, `domain_taxonomy`, rule ids, raw ids, or source precedence policy.
   - Reject only when the requested change contradicts raw evidence, repo-local truth, or the review wiki source model.

5. Edit the source documents.
   - Edit the canonical source file, not a rendered docs copy.
   - Keep pattern rule filenames, route filenames, rule ids, raw ids, tag keys and values, paths, branch names, commits, and code spans stable unless a user-approved semantic change requires otherwise. Pattern rule filenames are Korean title slugs; domain/tag route filenames and raw filenames may use English or technical terms.
   - Keep human-readable prose Korean-first.
   - Preserve raw evidence integrity; do not invent evidence to satisfy feedback.
   - If a pattern changes, refresh its related raw backlinks and affected tag pages.
   - If raw evidence changes, refresh any linked pattern and affected tag pages.
   - If tag pages change, derive them from current pattern and registry state rather than hand-editing stale summaries.

6. Validate the result.
   - Check `wiki/registry.json` remains valid JSON.
   - Check Obsidian wikilinks still resolve.
   - Check affected domain pages link only to tag pages, affected tag pages link only to matching patterns, and patterns remain the owner of raw evidence links.
   - Check pattern frontmatter keeps `tags` as an Obsidian-compatible list and stores routing metadata in `domains`, `domain_tags`, `stages`, and `risks`.
   - Check `wiki/index.md` and `wiki/docs/**` were not introduced.
   - Run the configured docs build when a docs project exists and the user asked for docs verification.

7. Finalize the feedback record.
   - Move or rewrite the feedback JSON into the correct outcome folder.
   - Use `applied` when wiki source files changed successfully.
   - Use `needs-decision` when user approval is required before changing source files.
   - Use `stale` when the selected text no longer maps to the source document.
   - Use `rejected` only when the feedback is invalid or contradicts source evidence.
   - Include a short outcome summary and changed file list in the feedback JSON.

8. Write operation history.
   - Write one history record for the feedback batch under `history/YYYY/MM/`.
   - Use `type: feedback`.
   - Include input feedback ids, outcome counts, changed files, validation results, and a concise human-readable summary.
   - History is an audit log for docs display, not the source of truth.

## Guardrails

- Do not route docs feedback through `review-wiki-ingest`; feedback is not review evidence.
- Do not edit generated docs output as the canonical fix.
- Do not silently change registry, domain taxonomy, rule ids, raw ids, pattern rule filenames, or route filenames.
- Do not apply stale selections by guessing from topic similarity.
- Do not turn tag-page feedback into tag-page-only edits when the underlying pattern, raw, or core source needs the fix.
- Do not delete feedback records; move them to an outcome folder with status and history.
- Do not write history as a replacement for source document updates.

## Reference

- Read [references/feedback-model.md](references/feedback-model.md) for feedback JSON schema, statuses, and selection matching.
- Read [references/history-model.md](references/history-model.md) for operation history schema and docs exposure rules.
