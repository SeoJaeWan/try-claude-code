---
name: plan-wiki-lint
description: Audit the plan wiki for registry drift, broken raw backlinks, duplicate or conflicting pattern rules, orphan registrations, taxonomy drift, Obsidian graph-link drift, docs-first source formatting, feedback/history record consistency, and document consistency problems. Use when Codex needs to prepare a proposed cleanup report in `wiki/_meta/점검-보고서.md` and wait for explicit user approval before applying any wiki cleanup.
---

# Plan Wiki Lint

Use this skill to inspect the plan wiki without silently rewriting it. Resolve the wiki root from `~/.codex/planWiki`, then read [references/checklist.md](references/checklist.md) before drafting the cleanup report.

## Workflow

1. Verify the target.
   - Plan wiki root: `~/.codex/planWiki`
   - Required working files: `wiki/registry.json` and `wiki/_meta/점검-보고서.md`
   - If the link is missing or broken, stop and use `plan-wiki-setup`.

2. Read the current routing and graph surface first.
   - Read `wiki/registry.json`.
   - Read every core document listed in the registry.
   - Read every registered pattern file.
   - Read every tag page under `wiki/{graph_notes_root}/`.
   - Inspect only as much raw material as needed to verify broken or suspicious backlinks.

3. Run the lint checks from the reference checklist.
   - Look for registry drift, broken `raw_sources`, broken Obsidian wikilinks, duplicate or conflicting rules, orphan registrations, unregistered files, taxonomy drift, overbroad tags, stale guidance, Korean-schema drift, Korean terminology drift, docs-first source drift, tag-page drift, malformed feedback records, and malformed history records.
   - Treat lint as a review pass, not an excuse to rewrite the whole wiki.

4. Write the proposed cleanup plan to `wiki/_meta/점검-보고서.md`.
   - Summarize findings and the exact cleanup you plan to apply.
   - Separate blocking issues from optional tidy-ups.
   - Do not apply fixes yet.

5. Stop and wait for explicit user approval.
   - If the user approves, apply only the approved subset of changes.
   - Refresh `wiki/_meta/점검-보고서.md` to reflect what was actually changed and what remains deferred.
   - If approval is partial, keep the rest as pending or deferred.

## Lint Focus

- Ensure every core document and promoted pattern file used by planning is registered in `wiki/registry.json`.
- Ensure the registry does not contain orphan core or pattern paths.
- Ensure `wiki/index.md` is absent and registry `indexes` is absent.
- Ensure no separate `wiki/docs/**` tree exists; the existing wiki files must remain the docs-first source.
- Ensure registry `document_model` is `docs-first-source`.
- Ensure `graph_notes_root` exists, every top-level domain has a `registry.graph_notes.domains[domain]` page, and every `domain_taxonomy.tags` value has a `registry.graph_notes.tags[domain][tag]` page.
- Ensure every promoted pattern has at least one valid raw backlink.
- Ensure domain landing pages link only to domain-local tag pages.
- Ensure domain-local tag pages link only to matching pattern rules, not raw records.
- Ensure pattern `## 관련 문서` sections link to all tag pages and all `raw_sources`.
- Ensure every raw document has a `## 관련 문서` section with a plain status value and promoted or referenced pattern links, without direct domain/tag links.
- Ensure duplicate or conflicting rules are identified across exact domain tags and registry-declared adjacent domain tags.
- Ensure stale guidance is marked or rewritten only when the raw evidence and current core contract justify it.
- Ensure promoted pattern frontmatter includes Korean `title` and `summary`.
- Ensure promoted pattern frontmatter uses Obsidian-compatible `tags` as a list, not a nested routing object.
- Ensure `domains`, `domain_tags`, `stages`, and `risks` mirror the derived `plan-wiki/...` values in `tags`.
- Ensure promoted pattern bodies use the docs-first Korean headings `개요`, `문제`, `적용 조건`, `해야 할 것`, `피해야 할 것`, `적용 예시`, `판단 근거`, and `관련 문서`.
- Ensure human-readable prose is Korean-first and does not contain avoidable mixed phrases like `user action`, `surface`, `boundary`, `contract`, `validation`, `state`, `phase`, or `owner` unless the term is a code/API/schema/path/tag token.
- Ensure tag pages avoid long comma-separated link lines and use readable bullet lists for related tags or patterns.
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

- Read [references/checklist.md](references/checklist.md) for the exact checks and the expected `점검-보고서.md` structure.
