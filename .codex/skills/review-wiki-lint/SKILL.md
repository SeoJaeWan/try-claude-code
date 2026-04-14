---
name: review-wiki-lint
description: Audit the review wiki for registry drift, broken raw backlinks, duplicate or conflicting pattern rules, orphan registrations, taxonomy drift, and document consistency problems. Use when Codex needs to prepare a proposed cleanup report in `wiki/_meta/lint-report.md` and wait for explicit user approval before applying any wiki cleanup.
---

# Review Wiki Lint

Use this skill to inspect the review wiki without silently rewriting it. Resolve the wiki root from `~/.codex/reviewWiki`, then read [references/checklist.md](references/checklist.md) before drafting the cleanup report.

## Workflow

1. Verify the target.
   - Review wiki root: `~/.codex/reviewWiki`
   - Required working files: `wiki/registry.json` and `wiki/_meta/lint-report.md`
   - If the link is missing or broken, stop and use `review-wiki-setup`.

2. Read the current routing surface first.
   - Read `wiki/registry.json`.
   - Read every core document listed in the registry.
   - Read every registered pattern file.
   - Inspect only as much raw material as needed to verify broken or suspicious backlinks.

3. Run the lint checks from the reference checklist.
   - Look for registry drift, broken `raw_sources`, duplicate or conflicting rules, orphan registrations, unregistered files, taxonomy drift, overbroad tags, and stale guidance.
   - Treat lint as a review pass, not an excuse to rewrite the whole wiki.

4. Write the proposed cleanup plan to `wiki/_meta/lint-report.md`.
   - Summarize findings and the exact cleanup you plan to apply.
   - Separate blocking issues from optional tidy-ups.
   - Do not apply fixes yet.

5. Stop and wait for explicit user approval.
   - If the user approves, apply only the approved subset of changes.
   - Refresh `wiki/_meta/lint-report.md` to reflect what was actually changed and what remains deferred.
   - If approval is partial, keep the rest as pending or deferred.

## Lint Focus

- Ensure every core document and promoted pattern file used by planning is registered in `wiki/registry.json`.
- Ensure the registry does not contain orphan core or pattern paths.
- Ensure every promoted pattern has at least one valid raw backlink.
- Ensure duplicate or conflicting rules are identified across exact and adjacent tag groups.
- Ensure stale guidance is marked or rewritten only when the raw evidence and current core contract justify it.
- Ensure new pattern files still match the one-file-per-rule registry model rather than turning into freeform note sprawl.

## Guardrails

- Do not modify wiki content before writing the proposed cleanup report.
- Do not delete raw evidence or wiki documents without explicit approval.
- Do not rewrite whole documents when a narrow rule edit is enough.
- Do not treat lint as a semantic re-ingest pass; stay focused on quality, consistency, and routing integrity.

## Reference

- Read [references/checklist.md](references/checklist.md) for the exact checks and the expected `lint-report.md` structure.
