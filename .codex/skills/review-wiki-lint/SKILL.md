---
name: review-wiki-lint
description: Audit the review wiki for registry drift, broken raw backlinks, duplicate or conflicting pattern rules, orphan registrations, taxonomy drift, Obsidian graph-link drift, docs-first source formatting, feedback/history record consistency, and document consistency problems. Use when Codex needs to prepare a proposed cleanup report in `wiki/_meta/lint-report.md` and wait for explicit user approval before applying any wiki cleanup.
---

# Review Wiki Lint

Use this skill to inspect the review wiki without silently rewriting it. Resolve the wiki root from `~/.codex/reviewWiki`, then read [references/checklist.md](references/checklist.md) before drafting the cleanup report.

## Workflow

1. Verify the target.
   - Review wiki root: `~/.codex/reviewWiki`
   - Required working files: `wiki/registry.json` and `wiki/_meta/lint-report.md`
   - If the link is missing or broken, stop and use `review-wiki-setup`.

2. Read the current routing and graph surface first.
   - Read `wiki/registry.json`.
   - Read every core document listed in the registry.
   - Read every registered pattern file.
   - Read every tag page under `wiki/{graph_notes_root}/`.
   - Inspect only as much raw material as needed to verify broken or suspicious backlinks.

3. Run the lint checks from the reference checklist.
   - Look for registry drift, broken `raw_sources`, broken Obsidian wikilinks, duplicate or conflicting rules, orphan registrations, unregistered files, taxonomy drift, overbroad tags, stale guidance, Korean-schema drift, Korean terminology drift, docs-first source drift, tag-page drift, malformed feedback records, and malformed history records.
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
- Ensure `wiki/index.md` is absent and registry `indexes` is absent.
- Ensure no separate `wiki/docs/**` tree exists; the existing wiki files must remain the docs-first source.
- Ensure registry `document_model` is `docs-first-source`.
- Ensure `graph_notes_root` exists and every taxonomy value has a graph note under `wiki/tags/{tag_group}/{tag_value}.md`.
- Ensure every promoted pattern has at least one valid raw backlink.
- Ensure pattern `## 관련 문서` sections link to all tag pages and all `raw_sources`.
- Ensure every raw document has a `## 관련 문서` section with a status tag note, and promoted or referenced raw records link back to every matching pattern.
- Ensure tag pages link to every pattern and raw record carrying that tag.
- Ensure duplicate or conflicting rules are identified across exact and adjacent tag groups.
- Ensure stale guidance is marked or rewritten only when the raw evidence and current core contract justify it.
- Ensure promoted pattern frontmatter includes Korean `title` and `summary`.
- Ensure promoted pattern bodies use the docs-first Korean headings `개요`, `문제`, `적용 조건`, `해야 할 것`, `피해야 할 것`, `적용 예시`, `판단 근거`, and `관련 문서`.
- Ensure human-readable prose is Korean-first and does not contain avoidable mixed phrases like `user action`, `surface`, `boundary`, `contract`, `validation`, `state`, `phase`, or `owner` unless the term is a code/API/schema/path/tag token.
- Ensure tag pages avoid long comma-separated link lines and use readable bullet lists for related patterns and raw evidence.
- Ensure new pattern files still match the one-file-per-rule registry model rather than turning into freeform note sprawl.
- Ensure feedback outcome folders and history root exist when docs feedback is enabled.
- Ensure feedback and history JSON records are valid and do not claim changed files that are missing.

## Guardrails

- Do not modify wiki content before writing the proposed cleanup report.
- Do not delete raw evidence or wiki documents without explicit approval.
- Do not rewrite whole documents when a narrow rule edit is enough.
- Do not treat lint as a semantic re-ingest pass; stay focused on quality, consistency, routing integrity, and graph-link integrity.
- Do not rewrite feedback or history records except to report malformed records or apply user-approved cleanup.

## Reference

- Read [references/checklist.md](references/checklist.md) for the exact checks and the expected `lint-report.md` structure.
