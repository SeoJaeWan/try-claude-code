# Review Wiki Ingest Reference

## Path Contract

- Review inbox root: main repository root `.codex/reviews/`
- Review inbox file pattern: `.codex/reviews/**/*.md`
- Review wiki root: `~/.codex/reviewWiki`
- Required directories:
  - `raw/`
  - `wiki/`
  - `wiki/_meta/`

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

Suggested `status` values:

- `raw-only`
- `promoted`
- `partial-failure`

`raw-only` is valid when the review could not be matched to a plan by exact branch or when the finding is not promotable.

## Rule Card Schema

Every promoted rule card should include:

- `rule_id`
- `summary`
- `apply_when`
- `do`
- `avoid`
- `why`
- `raw_sources`

Use imperative language in `do` and `avoid`. Keep the card short enough that `architect` can scan it while planning.

## Current Routing Documents

The initial wiki starts with:

- `scope-boundary.md`
- `contracts-state-validation.md`
- `rollout-verification.md`

These are current documents, not a permanently closed set. New documents may be added later when a distinct planning concern emerges.

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

## New Document Creation

Update an existing wiki document when the concern fits naturally there.

Create a new wiki document immediately when:

- the concern is planning-relevant
- the concern is independent rather than a small variant of an existing topic
- forcing it into an existing document would blur the routing model

New wiki document filenames must use ASCII slugs such as:

- `migration-cutover.md`
- `ownership-routing.md`

Whenever a new document is created, update `wiki/index.md` in the same operation.

## Failure Policy

- Build the normalized raw batch before wiki promotion.
- Delete the source review files only after the raw batch, wiki changes, and index update all succeed.
- If any step fails, stop immediately and keep the source review files.
- If the ingest batch succeeds, remove the remaining source review files from the inbox.
- Redact or mask secrets and obvious personal identifiers before writing raw.
