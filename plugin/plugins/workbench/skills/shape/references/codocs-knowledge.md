# Read project knowledge through Codocs

Use this reference when project `.codocs` evidence informs the analysis. The tool contract below was checked against [Codocs v0.0.1](https://github.com/SeoJaeWan/codocs/tree/v0.0.1) on 2026-09-28; use the connected version's exposed schemas and guide when different.

## Select the analysis checkout

Prefer an available Codocs MCP connection whose resolved startup project matches `analysis_root`. Verify this through host configuration or session/startup evidence. The stdio server fixes its root at startup using `--project`, or startup cwd when omitted; changing the agent's cwd does not retarget it. These tools have no per-call project selector or project-identity endpoint. Matching document IDs, revisions, relative paths, or a Git common directory cannot establish which checkout is connected.

Do NOT use an unverified or differently bound connection as this checkout's evidence. If no usable connection exists, read the actual checkout's local YAML using its discovery rules and tools. Do NOT install/reconfigure MCP, create a knowledge store, or edit source documents as part of analysis. This fallback does not turn a known unreadable source into absent knowledge.

## Query and interpret

- `codocs_list({})` lists documents; optional filters are `domain`, `kind`, and `status`. Follow `nextCursor` with `{"cursor":"returned cursor"}` when more candidates are needed. There is no free-text query or caller-selected page size. A filtered/unfinished listing cannot establish project-wide absence or uniqueness.
- `codocs_get({"ids":["current-id"]})` reads 1–20 distinct current IDs. Inspect each relevant result's raw source, path, references/backlinks, revision, confirmation, and diagnostics; request success alone does not establish a found, unique, confirmed owner.
- `codocs_guide({})` gives overview; read `schema`, `writing`, `updating`, or `validation` topics only when needed to interpret the connected format. The guide is available without a ready index and describes the product format, not the target project's business policy.

Start from the project's navigation when present, then read relevant owners and reference targets. Do not require a full catalog scan for a bounded known-ID question. When absence or uniqueness affects a decision, use an unfiltered fully paginated inventory with complete discovery; validation diagnostics or local discovery may expose parse-invalid files missing from list items.

In `scanStatus: partial`, confirmed findings may support bounded claims, while `confirmation: unconfirmed`, missing IDs, uniqueness, and absent documents remain uncertain. Continue independent analysis with reliable evidence; hold only conclusions whose material policy or target depends on unresolved sources. Do NOT treat a null cursor or `success: true` as complete discovery. Failed reads are not empty knowledge.

Wait for initialization/refresh completion rather than repeatedly issuing queries because a request is slow. On `cursor_expired`, restart the affected listing with its original filters. A justified `codocs_refresh({})` rebuilds only the verified local index; use it for reported index recovery, then reread affected evidence. Repeated failure without a changed cause is a reported gap, not an unlimited retry loop.

`codocs_validate({})` or a single-file `path` may provide relevant format/reference diagnostics; do not impose project-wide validation on every analysis. Inspect diagnostic severity separately from request success. Validation does not prove natural-language facts or policy. Do NOT call `codocs_write` or perform direct document edits.

## Bind findings to source evidence

Record access method (verified MCP or local files), selected checkout, original source path, current ID, constraints used, and the Git blob ID of the exact content read. With MCP, also retain its revision and relevant discovery/confirmation state. Keep the existing focused/snapshot rules in [shape-report.md](shape-report.md); MCP does not certify a Git base, a whole-checkout snapshot, or unchanged files.

Ask Git for that ID instead of hashing content yourself: `git rev-parse <commit>:<path>` for committed content or `git hash-object <path>` for working-tree content. Git already stores it, so it is exact and costs one command. Do NOT substitute an MCP revision for it. If the source is outside Git or unreadable, record the evidence gap rather than fabricating an ID. Recheck relevant changing sources before final claims. Keep supplied Wiki Artifacts separately identified and do not fetch Wiki/Jira rules when `.codocs` is missing.
