# Codocs evidence and task-owned document changes

The contract below was checked against [Codocs v0.0.1](https://github.com/SeoJaeWan/codocs/tree/v0.0.1) on 2026-09-28. Use actual exposed schemas and the connected guide for the installed version. Codocs MCP is optional and operates on local project files.

## Connection and task identity

Before using project data, verify the connection's resolved project root through host configuration or session/startup evidence. The stdio server fixes its root with `--project`, or startup cwd when omitted. These tools have no per-call project selector or project-identity endpoint; changing cwd does not retarget the server. Matching IDs, revisions, relative paths, or Git common directories cannot distinguish worktrees.

The coordinator may read only through a connection verified for its inspected checkout, and must bind that evidence to the exact source/base it represents. Each worker independently checks a connection against its assigned worktree after materializing or adopting it. Do NOT inherit the coordinator's or a sibling worker's connection as proof of that binding. When no usable connection exists for the actual checkout, read/edit that checkout's local files using its rules and tools within existing task authority. Do NOT install/reconfigure MCP to make a task runnable without applicable authorization.

The coordinator remains read-only: Do NOT call `codocs_write`, modify documents directly, or dispatch a document write to a connection serving the user's original checkout. A worker's document mutations must stay inside its packet's objective, owned or declared shared paths, and repository rules; forbidden paths and navigation collisions still apply. Report missing write ownership rather than expanding it. A read revision is not permission to write.

## Read knowledge at the task base

- `codocs_list({})` accepts optional `domain`, `kind`, `status` filters and a returned `cursor`. Follow `nextCursor` with `{"cursor":"returned cursor"}` as needed; no free-text query or configurable page size exists.
- `codocs_get({"ids":["current-id"]})` reads 1–20 distinct current IDs. Inspect each owner's raw source, path, references/backlinks, revision, confirmation, and diagnostics. Request success does not prove a unique found/confirmed owner.
- Read needed `codocs_guide` topics (`schema`, `writing`, `updating`, `validation`) to interpret the connected version. This guide is available independently of index readiness and does not replace project-specific policies.

Workers reread relevant sources in their own resolved task base and compare Git blob IDs (`git rev-parse HEAD:<path>`, or `git hash-object <path>` for working-tree content) and constraints with packet evidence before implementing. Dependency-imported knowledge may legitimately differ from the planning checkout; reconcile it with declared dependencies and approved intent, reporting material conflicts under [task-execution.md](task-execution.md). Do NOT silently use policy from another checkout or alter immutable plans.

Retain selected checkout, original path, current ID, Git blob ID, constraints, and access method in the existing input/implementation/result evidence. With MCP retain revision and relevant discovery/confirmation state as additional evidence. Do NOT use a revision token in place of the Git blob ID. A source outside Git or unreadable is a reported evidence gap.

Bounded known-ID reads need not scan the full catalog. Absence/uniqueness decisions require unfiltered, fully paginated complete discovery, including relevant invalid-file diagnostics not represented in list items. In `scanStatus: partial`, only confirmed observations support bounded facts; missing IDs and `confirmation: unconfirmed` do not establish absence or current governing policy. Continue independent work with reliable evidence and hold only affected work. Failed scans are not empty stores.

Wait for initialization/refresh completion; restart a `cursor_expired` listing with its original filters. Use `codocs_refresh({})` for justified recovery of the verified local index, then reread affected state. Do NOT loop on unchanged failures. A partial/failed scan, ambiguous target, conflict, or uncertain MCP write cannot be bypassed through direct document writes. No usable connection for another checkout is a different condition from a rejected write at this checkout.

If `.codocs` is absent, use explicit repository instructions/code evidence and report material gaps; do not create a knowledge store or fetch canonical Wiki/Jira policy as a fallback. A task explicitly authorized to establish one remains governed by its declared scope.

## Worker-owned document changes

Use this section only when approved implementation requires `.codocs` edits within the packet's declared paths. Knowledge lookup alone does not trigger document curation. Keep one writer per owned/shared surface and include affected incoming references in collision checks.

With a verified connection, reread the current owner immediately before each write, review intervening user changes, and call `codocs_write` with `mode: update`, its current `id`, that get's `revision`, and minimal `set`/`unset`. Do NOT overwrite unrelated fields, unset required fields, or put a field in both set and unset. For a justified new document, use `mode: create`, a project-relative `.codocs` path inside ownership, and the required `id`, `name`, `domains`, `definition` mapping; establish absence and name/ID constraints first. Existing paths are not overwritten, and failed creates are not automatically converted to updates.

On `revision_conflict` or `change_revision_mismatch`, re-get and reconcile meaning before a new write; do NOT replace only the revision and replay a stale payload. Hold the affected unit and dependent writes if repeated conflict leaves no stable reconciled source. For ID/name/domain changes, consult `updating`; prior IDs support code matching, while get/update uses current IDs and references use current names. Updating an ID maintains `deprecatedAliases` automatically; update set/unset cannot directly edit that field. A name change does not automatically rewrite incoming references or move a file.

Interpret each response before dependent writes:

| Result | Worker action |
|---|---|
| Successful `saved: false`, `changed: false` | Record unchanged; review diagnostics. |
| `saved: true`, `indexUpdated: true` | Re-get current ID and verify saved content and affected references. |
| `saved: true`, `indexUpdated: false` | The file is saved. Inspect the cause, recover the index with refresh, then re-get/validate; Do NOT re-save or automatically roll back. |
| Definite rejection with `saved: false` | Resolve the cause and reread before a justified retry; continue safe independent work. |
| Lost/ambiguous response | Inspect state at the verified target before retrying; if outcome or visibility remains uncertain, hold dependents and report it. Do NOT blindly replay or switch access methods. |

For a split, verify the destination before narrowing the source. For a rename, inspect/repair authorized incoming references sequentially and report out-of-scope sources. Each write saves one document; revision checks are separate from file replacement and do not provide a cross-process lock or multi-file transaction.

Without a usable connection, preserve user changes and reread immediately before direct YAML edits. Use the project's format and semantic validation tools, preserve comments/custom fields, and report manual/YAML-only checks as limited when semantic tooling is unavailable. Direct writes have no MCP revision protection. An unsupported operation may use direct editing only after resolving current-state/scope constraints; refresh any verified connection and reread before subsequent MCP operations.

Run `codocs_validate` on affected documents/references, or equivalent project tooling for local edits, and perform required final catalog checks proportional to the changed surface. `success: true` can contain error diagnostics; inspect severity and warnings, distinguishing pre-existing/out-of-scope findings. Validation proves neither business-policy truth nor all task acceptance. Record actual paths, access method, saved/unchanged/uncertain outcomes, recovery and checks in Task Result evidence. Unresolved acceptance-critical knowledge or document errors cannot be called verified; preserve the existing provisional-result and continuation rules.
