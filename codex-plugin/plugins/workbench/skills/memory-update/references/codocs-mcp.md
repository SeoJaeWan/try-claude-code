# Codocs MCP access and recovery

This reference covers the six tools released in [Codocs v0.0.1](https://github.com/SeoJaeWan/codocs/tree/v0.0.1), checked 2026-09-28. Use the actual exposed tool schemas and connected `codocs_guide` for the installed version; do NOT invent tools or parameters from a newer README. The connection is optional and operates on project-local `.codocs` files.

## Bind the connection to the write checkout

Discover available Codocs tools and verify their selected project through the host's connection configuration or session/startup evidence. The stdio server fixes its project at startup with `--project`; without it, the startup working directory is used. Changing the agent's working directory or passing a document path does not retarget the server. The v0.0.1 tools have no per-call project selector or project-identity endpoint.

Compare the resolved project root with the actual checkout being edited, including any task worktree. Matching document IDs, relative paths, revisions, or Git common directories alone cannot distinguish two checkouts. Do NOT use an unverified or differently bound connection for this checkout's inventory, revisions, validation, or writes. Use a verified connection for the checkout or the local-file fallback in [codocs-local.md](codocs-local.md). Do NOT change MCP settings or a knowledge root without applicable authorization.

## Discover and read

| Tool | Released input and use |
|---|---|
| `codocs_guide` | `{}` for overview; `{"topic":"schema"}`, `writing`, `examples`, `updating`, or `validation` as needed. Available independently of index readiness. |
| `codocs_list` | `{}` or optional `domain`, `kind`, `status` filters; follow `nextCursor` with `{"cursor":"returned cursor"}` until null. No free-text query or caller-selected page size. |
| `codocs_get` | `{"ids":["current-id"]}`; 1–20 distinct current IDs per request. Read raw content, source paths, references/backlinks, diagnostics, and revisions for relevant owners and targets. |
| `codocs_write` | Create or update one document; see below. |
| `codocs_validate` | `{}` for the whole project, or `{"path":".codocs/order.yaml"}` for one file. |
| `codocs_refresh` | `{}` to rebuild the whole index for recovery or after direct edits; does not edit source documents. |

Read only the guide topics needed for the work, and combine the connected format with the target project's authoring and placement policies. Do NOT copy a whole guide into project knowledge or migrate existing files merely to match an example.

Use unfiltered, fully paginated inventory when establishing project-wide absence or uniqueness. Filtered results are useful for finding candidates but cannot prove no owner exists elsewhere. Parse-invalid or unidentified files may be absent from list items; include validation diagnostics and inspect relevant source files rather than treating the list as every discovered file.

`success: true` does not imply complete discovery. In `scanStatus: partial`, retained documents may have `confirmation: unconfirmed`; missing IDs, absence, uniqueness, and reference resolution cannot be established from that view. Writes and validate require complete discovery. Read confirmed evidence for independent research, address the reported scan problem within scope, and refresh when recovery is justified. Do NOT bypass this state with direct writes. On repeated refresh failure without a changed cause, report the blocker and continue only work whose evidence remains reliable.

If the index is initializing/refreshing, wait for completion or its actual error. Do NOT start another refresh or write simply because a request is slow. When `cursor_expired` occurs, restart the affected listing from its first page with its original filters. A published refresh invalidates old cursors; recheck affected catalog evidence after changes.

## Create and update

Keep the main agent as the single writer. Before each update, get the current owner again, review its content and user changes, and take the revision from that result. Send only the intended field changes:

```json
{
  "mode": "update",
  "id": "order",
  "revision": "revision from the latest reviewed get",
  "set": { "definition": "Reviewed meaning, conditions, and exceptions." }
}
```

`set` changes supplied fields and preserves unrelated fields. Use `unset` only for intended removals of optional/custom fields; do NOT unset required fields or put a field in both set and unset. Do NOT submit the entire document just to change one field. Review comments and formatting in the saved raw content when their preservation matters.

For a justified new owner, use `mode: create` with a project-relative path under `.codocs` and a `document` mapping containing `id`, `name`, `domains`, and `definition`. Establish absence and naming constraints first. An existing path is not overwritten; do NOT automatically turn a rejected create into update or repeat create because a response is delayed.

For `revision_conflict` or `change_revision_mismatch`, re-get and reconcile the latest content with the intended change before issuing a new request. Do NOT replace only the revision and replay a stale set. If the same conflict recurs without a reconciled stable source, hold that unit and its dependents and report the concurrent change.

ID changes use the old current ID as the update target and the new ID in set. The write automatically maintains `deprecatedAliases`; update set/unset cannot edit that field directly. Re-get by the new current ID after saving. Previous IDs retain code matching, not get/update lookup or name-based references. Consult `updating` before an ID/name/domain change.

Each write saves one document. Do NOT assume a name/domain change rewrites incoming references or moves its file. Inventory affected incoming references and ambiguity before the change, then repair authorized sources sequentially and verify their intended targets. A split establishes and verifies its destination before narrowing the source. Cyclic references can be created by saving A without its link to B, creating B pointing to A, then re-getting A and adding B's link.

## Interpret results before the next write

| Result | Action |
|---|---|
| `saved: true`, `indexUpdated: true` | The file is saved and its index update completed. Re-get the current ID and inspect content/references before dependent edits. |
| `saved: true`, `indexUpdated: false` | The file is already saved. Inspect the diagnostics, address the cause within scope, and use refresh to recover the index; do NOT re-save or automatically roll back. Re-get and validate before dependent edits. |
| `saved: false`, `changed: false` with success | No change was needed. Record unchanged and inspect any diagnostics. |
| Definite rejection with `saved: false` | Inspect the reported cause; resolve and reread affected state before a justified new request. Safe independent units may continue. |
| Lost/ambiguous response or transport failure | Inspect current state at the verified target before retrying. If saved content and index visibility cannot be established, record uncertain and hold dependents. Do NOT blindly replay the write or switch access methods. |

Saving and index publication are separate. Revision checks and file replacement are also separate operations; there is no cross-process lock or multi-document transaction. An absent conflict error is not proof that every concurrent edit was preserved. Verify the actual saved content and report any remaining uncertainty.

## Validate and report

Validate saved documents and affected incoming/outgoing references before dependent changes, then run project-wide validation at the end. Path validation covers one file; use affected-path checks or a project check for cross-document effects. Inspect each diagnostic's severity, code, path, and message: validate can return `success: true` while reporting errors. Review warnings rather than treating them as save failures or silently ignoring them. Separate pre-existing, out-of-scope diagnostics from issues introduced or left unresolved by this request.

Validation covers format, collisions, and references; factual correctness, coherent ownership, and useful index navigation still require the agent's review. Report actual document paths in the selected checkout, the MCP access method, saved/unchanged outcomes, relevant revisions and recovery, diagnostic results, and unresolved units. Do NOT claim a fully validated project when discovery or required checks were incomplete.
