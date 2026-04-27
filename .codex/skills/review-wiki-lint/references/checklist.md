# Review Wiki Lint Checklist

## Scope

Lint the review wiki for routing integrity, evidence integrity, Korean docs-first source consistency, and Obsidian graph-link integrity. Favor narrow fixes over broad cleanup.

## Checks

- `wiki/registry.json` exists and is valid JSON
- every core document listed in the registry exists
- registry has no `indexes` field
- `wiki/index.md` does not exist
- `wiki/docs/` does not exist
- registry `document_model` is `docs-first-source`
- registry `graph_notes_root` exists and resolves to `wiki/tags`
- registry `tag_taxonomy.status` contains `promoted` and `raw-only`
- every registered pattern file exists
- every pattern file under `wiki/patterns/` is registered in the registry
- every tag value in `tag_taxonomy` has a note at `wiki/tags/{tag_group}/{tag_value}.md`
- every tag page links to the patterns and raw records that carry that tag
- every tag page uses readable bullet lists instead of long comma-separated link lines
- every promoted pattern has at least one valid `raw_sources` backlink
- `raw_sources` targets actually exist
- every promoted pattern has `title` and `summary` frontmatter values written in Korean
- every promoted pattern body includes `개요`, `문제`, `적용 조건`, `해야 할 것`, `피해야 할 것`, `적용 예시`, `판단 근거`, and `관련 문서`
- human-readable prose is Korean-first; avoidable mixed phrases such as `user action`, `surface`, `boundary`, `contract`, `validation`, `state`, `phase`, and `owner` are translated unless they are code/API/schema/path/tag tokens
- every promoted pattern `## 관련 문서` section links to all frontmatter tag pages and all `raw_sources`
- every raw document has a `## 관련 문서` section with a status tag note
- every promoted or pattern-referenced raw document `## 관련 문서` section links back to every matching pattern
- every core document has docs-first frontmatter with `doc_type: core`, Korean `title`, and Korean `summary`
- duplicate rules are merged or clearly separated by scope
- conflicting rules are flagged across exact and adjacent tag groups
- stale guidance is identified when raw evidence or current core contract no longer supports it
- tag vocabulary matches the registry taxonomy
- overbroad tags or weak `적용 조건` clauses are identified
- new pattern files still fit the one-file-per-rule registry model instead of becoming freeform note sprawl
- no generated duplicate documentation surface is introduced
- feedback outcome folders exist when feedback records are present
- history JSON records under `history/**` are valid JSON
- history records include `id`, `type`, `status`, `started_at`, `finished_at`, `inputs`, `changes`, `summary`, and `validation`
- history records do not store full source documents or full review files
- feedback records under `feedback/**` are valid JSON and have status values matching their folder

## Report Path

Write the proposed cleanup to:

`wiki/_meta/lint-report.md`

## Report Structure

Use this shape:

```md
# Review Wiki Lint Report

## 요약
- date:
- scope:
- blocking issues:
- optional tidy-ups:

## 제안 변경
- [ ] change 1
- [ ] change 2

## 보류
- item

## 승인
- status: pending
- approved scope:
```

## Approval Rule

- Draft the report first.
- Stop and wait for explicit user approval.
- Apply only the approved subset.
- Refresh the report after applying changes.

## Guardrails

- Do not delete raw evidence without explicit approval.
- Do not rewrite entire wiki documents when a focused rule edit is enough.
- Do not invent new rules during lint unless the user explicitly asks for that.
