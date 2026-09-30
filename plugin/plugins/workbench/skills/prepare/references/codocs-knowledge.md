# Project knowledge for task planning

Use this reference when `.codocs` supplies planning constraints. The tool contract below was checked against [Codocs v0.0.1](https://github.com/SeoJaeWan/codocs/tree/v0.0.1) on 2026-09-28; use the connected version's actual schemas and guide when different.

## Bind reads to the planning checkout

Prefer available Codocs MCP only after startup/configuration evidence confirms its resolved project root is `prepared_from_root`. The stdio server fixes its project with `--project`, or startup cwd when omitted. The tools have no per-call project selector or project-identity endpoint. Matching IDs, relative paths, revisions, or Git common directories does not distinguish checkouts; changing the caller's cwd does not retarget a connection.

Do NOT use an unverified or differently bound connection for this checkout's catalog, constraints, or revisions. If no usable connection exists, read local YAML in the planning checkout under project discovery/authoring rules and report the fallback. MCP is optional; Do NOT install/reconfigure it, create future worktrees, create a knowledge store, or edit project documents while planning.

## Read relevant constraints

- Use `codocs_list({})` or its optional `domain`, `kind`, `status` filters to find candidates. Follow `nextCursor` with `{"cursor":"returned cursor"}` as needed. There is no free-text query or configurable page size; filtered/unfinished results do not prove project-wide absence or uniqueness.
- Use `codocs_get({"ids":["current-id"]})` for 1–20 distinct current IDs, inspecting raw source, path, references/backlinks, revision, confirmation, and diagnostics for relevant owners and targets. Request success is not proof that every requested document is found, unique, or confirmed.
- Read relevant `codocs_guide` topics (`schema`, `writing`, `updating`, `validation`) only when the connected format affects the plan. The guide works independently of index readiness; it is product-format guidance, not a substitute for project policy.

Use the project index when present, then relevant owner documents. A bounded known-ID request does not require a full catalog scan. When absence or uniqueness determines ownership, obtain complete, unfiltered, fully paginated discovery and inspect relevant diagnostics/invalid sources omitted from list items.

For `scanStatus: partial`, use confirmed evidence only for claims it supports. Missing IDs and `confirmation: unconfirmed` do not establish absence, unique ownership, or governing current policy. Continue unaffected planning; hold tasks whose material constraints remain unknown. A null cursor does not make a partial scan complete. Failed reads do not mean an empty store.

Wait for initialization/refresh completion. On `cursor_expired`, restart the affected listing with its original filters. Use `codocs_refresh({})` only for justified recovery of the verified local index, then reread affected evidence; do not repeat unchanged failures indefinitely. Relevant `codocs_validate` calls can supply format/reference diagnostics, but `success: true` may contain errors and says nothing about factual policy validity. Do NOT call `codocs_write` or perform direct document edits.

## Carry evidence into executable packets

Use the existing `inputs`/`implementation_notes` surfaces in [execution-plan.md](execution-plan.md); do not require a new source vocabulary or rewrite supplied artifacts. Include the knowledge source checkout, original paths, current IDs, Git blob IDs, constraints and applicable checks. For MCP reads, also retain access method, revision, and relevant discovery/confirmation state. Ask Git for each blob ID — `git rev-parse <base_commit>:<path>`, or `git hash-object <path>` for working-tree content — rather than hashing content yourself or substituting revision tokens.

Check that knowledge used by each task is available at its exact execution base. A verified connection to today's planning checkout does not prove that dirty `.codocs` edits, a different commit, or a future dependency result contains the same policy. Compare relevant source identities with the chosen exact base; use its available evidence or establish the required inclusion/dependency under the existing base rules. Do NOT silently include dirty knowledge in a clean-base plan or rewrite the approved source.

Packets must remain usable without the current connection or conversation. Include the relevant constraints and instruct workers to reread at their resolved task base. A planned worktree's future connection cannot be verified during planning; record that workers must check their own binding and use their local files if needed. Do NOT instruct workers to reuse the planning connection merely because their Git common directory matches.

When project policy requires `.codocs` changes, declare owners and necessary navigation/reference paths in task ownership and collision checks, with appropriate document validation. Existing forbidden paths still apply; read access grants no write ownership. If knowledge is absent, report the gap and use explicit instructions/code evidence without creating a store or fetching Wiki/Jira rules. Only material unresolved constraints prevent affected readiness.
