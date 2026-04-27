# Review Wiki Ingest Reference

## Path Contract

- Review inbox root: main repository root `.codex/reviews/`
- Review inbox file pattern: `.codex/reviews/**/*.md`
- Review wiki root: `~/.codex/reviewWiki`
- Required directories:
  - `raw/`
  - `wiki/`
  - `wiki/core/`
  - `wiki/patterns/`
  - `wiki/tags/`
  - `wiki/_meta/`
- Required control file:
  - `wiki/registry.json`

Use the `~/.codex/reviewWiki` link as the only stable entrypoint. Do not hardcode the underlying vault path into other skills.

If execution begins inside a linked worktree or nested workspace, resolve the main repository root before scanning `.codex/reviews/`.

## Current Producer Contract

The current review collector writes BLOCK reviews to:

`.codex/reviews/{sanitized-branch}/{headSha}.md`

Do not assume a flat inbox. Always scan recursively.

## Raw File Naming

Write one raw file per normalized evidence group using:

`YYYYMMDD-{repo}-{review_id}.md`

Rules:

- `YYYYMMDD` is the ingest date in local time.
- `{repo}` is a short ASCII slug for the current repository.
- `{review_id}` is a deterministic identifier derived from the grouped issue and its matched plan boundary.

## Raw Document Schema

Store these fields before the normalized body:

- `raw_id`
- `source_reviews`
- `source_branches`
- `source_commits`
- `matched_plan`
- `matched_phase`
- `issue_type`
- `ingested_at`
- `status`
- `promoted_rules`
- `normalized_findings`
- `planning_implication`

Write the values of `normalized_findings`, `planning_implication`, and the normalized body in Korean. Keep metadata keys, paths, branches, commits, rule ids, and status values in their existing machine-readable form.

After the normalized body, always include `## 연결`.

In raw `## 연결`, include:

- one status wikilink, usually `[[wiki/tags/status/promoted|status: promoted]]` or `[[wiki/tags/status/raw-only|status: raw-only]]`
- inherited tag wikilinks when the raw record is linked to promoted patterns
- one promoted-rule wikilink for each promoted or referenced pattern, when applicable

Promoted-rule links should use an Obsidian wikilink such as:

`[[wiki/patterns/contracts-bind-accessibility-ids-to-rendered-slots|접근성 ID를 실제 렌더링 슬롯에 묶기]]`

Suggested `status` values:

- `raw-only`
- `promoted`
- `partial-failure`

`raw-only` is valid when the review could not be matched to a plan by exact branch or when the finding is not promotable.

## Registry Schema

`wiki/registry.json` is the machine-readable source of truth for:

- core document order
- pattern file registration
- tag vocabulary
- graph note root
- selection policy
- adjacency rules
- lint policy
- ingest policy

Every promoted pattern file must be registered in the registry `patterns` array with:

- `rule_id`
- `path`

Graph notes use:

- `graph_notes_root`: `tags`
- `wiki/tags/{tag_group}/{tag_value}.md`

The tag taxonomy should include `status: [promoted, raw-only]` so raw-only evidence has a graph anchor even when it has not been promoted into a reusable pattern.

Graph notes are navigation hubs for Obsidian graph view. They should link to matching patterns, matching raw records, and stage core documents when the tag is stage-related. They are not pattern-selection candidates and are not registered in the `patterns` array.

## Pattern File Schema

Every promoted pattern file should include YAML frontmatter with:

- `rule_id`
- `title`
- `summary`
- `tags`
- `raw_sources`

Write `title`, `summary`, and all human-readable body content in Korean. Keep `rule_id`, filenames, tag keys and values, paths, and raw-source paths in English.

Every promoted pattern file body should include:

- `요약`
- `적용 조건`
- `해야 할 것`
- `피해야 할 것`
- `이유`
- `연결`

Use imperative language in `해야 할 것` and `피해야 할 것`. Keep the file short enough that `architect` can scan it while planning.

In `## 연결`, include:

- one wikilink for each tag note in the pattern frontmatter
- one wikilink for each `raw_sources` entry

Pattern filenames should use:

- `wiki/patterns/{rule_id}.md`

Do not create a default `wiki/index.md`. Obsidian graph navigation should come from `wiki/tags/**` graph notes and explicit pattern/raw/core wikilinks.

## Plan Matching

Match a review to a plan only when:

- the review `Branch` matches the plan `**Branch:**` header exactly

If no exact match exists:

- keep the result as `raw-only`
- do not promote a wiki rule from that evidence
- do not guess from recency or fuzzy similarity

## Grouping Model

Treat the inbox as source evidence.

- input unit: review files under `.codex/reviews/**/*.md`
- raw output unit: normalized evidence groups
- wiki output unit: reusable planning rules

One ingest batch may transform `m` source reviews into `n` raw records.

Group raw by:

- issue type
- matched plan boundary

## Promotion Decision

Promote feedback when all of the following hold:

- it can improve planning quality before implementation starts
- it can be generalized into a reusable rule
- it can point back to raw evidence

Repetition is not required. Promote one-off findings when they are planning-critical.

Keep feedback in raw only when it is mostly:

- unmatched to a plan
- project-specific debugging detail
- stylistic nit
- implementation trivia that does not improve future planning

## New Pattern Creation

Update an existing pattern file when:

- the new evidence is a semantic duplicate of an existing rule
- the same planning implication already exists and the new evidence only strengthens it

Create a new pattern file when:

- the concern is planning-relevant
- the concern is independent rather than a semantic duplicate
- the same tag combination can coexist without conflicting intent

When the new evidence conflicts with an older rule:

- stop automatic promotion
- draft the exact file and registry changes that would replace the older rule with the newer one
- ask the user to approve the replacement before applying it

Whenever a pattern file is created, removed, or renamed, update `wiki/registry.json` in the same operation.

Whenever a pattern's tags or raw sources change, refresh its `## 연결` section, the affected raw `## 연결` sections, and the affected `wiki/tags/**` graph notes in the same batch.

## Failure Policy

- Build the normalized raw batch before wiki promotion.
- Delete the source review files only after the raw batch, wiki changes, and registry updates all succeed.
- If any step fails, stop immediately and keep the source review files.
- If the ingest batch succeeds, remove the remaining source review files from the inbox.
- Redact or mask secrets and obvious personal identifiers before writing raw.
