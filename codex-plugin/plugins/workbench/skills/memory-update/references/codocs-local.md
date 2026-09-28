# Project selection, authoring, and local-file fallback

## Select the project

Resolve the user-selected target repository and checkout; do not use the plugin repository or a hardcoded developer path as the knowledge root. Read project instructions and existing working-tree changes, and establish the actual write checkout under repository worktree rules before choosing an access method. Inspect the `.codocs` index if present and follow relevant authoring, document, reference, and folder policies. Index filenames and folder layouts are conventions, not product requirements. An absent `.codocs` does not authorize creating or migrating a knowledge store; create one only when requested or required by applicable project policy within the local-only scope.

Prefer available Codocs MCP tools after verifying their project binding as described in [codocs-mcp.md](codocs-mcp.md). A connection targeting a user's original checkout cannot be reused for an isolated worktree merely because both belong to the same Git repository. When no usable connection exists for the selected checkout, continue through the local-file fallback below and report that choice. Do NOT install or reconfigure MCP simply to make it available unless authorized.

Wiki access, Wiki writes, and paired synchronization are outside this skill. Older project instructions describing paired updates do not expand this local-only scope; report the discrepancy if relevant without changing those instructions automatically.

## Discover and author

Build a compact inventory of actual `.yaml`/`.yml` documents under the selected `.codocs` root, including path, `id`, `name`, and `domains`, using verified MCP or local discovery. Do not confuse examples or another checkout's documents with the selected project. Respect filesystem boundaries and project discovery rules; incomplete discovery cannot establish uniqueness or absence. Read relevant owner bodies, duplicates, conflicts, and reference targets before deciding to create or split a document.

Use the target project's explicit schema/version, authoring rules, and validator as the governing format. With MCP, read relevant `codocs_guide` topics from the connected version; otherwise use project tooling/docs and the baseline below where consistent. The baseline is not permission to migrate files or override a newer schema. If project rules conflict with what the connected version accepts, hold affected writes and resolve the mismatch rather than using direct edits to bypass it.

The bundled baseline has one YAML mapping per file:

```yaml
id: example-policy
name: 예시 정책
domains:
  - 개발
definition: |
  정책이 적용되는 조건과 판단 근거를 설명한다.
```

- Required fields are nonblank `id`, `name`, `definition`, and a nonempty string array `domains`. IDs match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and are unique project-wide. Names must be unique within each declared domain.
- Optional `kind` is `policy`, `procedure`, `decision`, or `discussion`; optional `status` is `proposed`, `confirmed`, or `deprecated`. Do not infer implementation completion from `confirmed` or automatically add omitted fields.
- Optional `examples` is a string array; `deprecatedAliases` is an array of objects with a required previous `id` and optional `message`. Previous IDs support code matching; get/update uses the current ID, and document references use the current name. Follow the applicable guide for ID changes.
- Preserve existing optional/custom fields, comments, and unrelated user edits. Do not convert all files or introduce legacy `type`, `title`, `body`, or singular `domain` as schema fields.
- Describe meaning, behavior, policy, conditions, exceptions, rationale, and responsibility. Do not copy task progress, PR assignments, execution plans, or completion logs into `.codocs`. Keep unagreed policy distinguishable from confirmed policy.
- Prefer the current owner. Split only for a separately useful subject, not because of length, reference count, or an arbitrary document-role label. Use the project's placement and naming conventions without imposing the Codocs repository's folders on other projects.

## References and validation

Under the bundled baseline, Codocs body references use exact document names: `[[이름]]` or `[[도메인:이름]]`, not Wiki slugs or MCP references. Unqualified names resolve across all domains; the source document's domain has no priority. Use a qualified name when necessary. Follow the project's escaping rules for colons and literal brackets. References are interpreted in `definition` and string `examples`, not arbitrary metadata. Apply Codocs reference parsing rules even inside Markdown code fences; do not invent a fenced-code exclusion.

Establish an initial inventory, validate changed documents and affected incoming/outgoing references before dependent edits, and run final project-wide uniqueness and reference/navigation checks. With MCP, follow [codocs-mcp.md](codocs-mcp.md); use the project's parser/validator and catalog/reference checks for the fallback. Reuse unchanged inventory/check evidence; rescan affected surfaces when concurrent edits invalidate it. Avoid a complete scan after every unrelated edit unless the tooling requires one. Generic YAML validity alone does not establish Codocs validity. The bundled baseline excludes duplicate mapping keys, anchors/aliases, merge keys, custom tags, and multiple YAML documents per file; apply the governing project format when different.

For renames, check all affected incoming references and preserve their intended targets, including domain ambiguity. Do not claim a complete rename while affected references remain unresolved or out of scope. For splits, verify the destination before narrowing the source. Keep useful overview/navigation documents and avoid reciprocal-link-only rewrites.

## Local-file fallback

Use this path when MCP is unavailable for the actual checkout, or the user explicitly chooses direct editing. Read and edit YAML only under that checkout. Do NOT switch to direct writes to bypass a revision conflict, partial/failed discovery, ambiguous target, validation rejection, or uncertain write outcome. Resolve that condition first; a denied MCP write is not evidence that direct editing is safe.

Discover the project's parser/validator rather than inventing a CLI. If semantic tooling is unavailable, inspect required fields, allowed values, duplicate IDs, same-domain name collisions, exact reference targets, and index reachability, reporting the checks and their limitations. A filesystem scan with inaccessible paths is incomplete even if YAML parsing succeeds.

Follow repository checkout/worktree instructions. Preserve existing changes and reread each file immediately before editing; if it changed since inspection, reconcile from the latest source or block that unit. Verify each saved document before the next dependent write. Direct filesystem edits do not provide MCP revision control or a multi-file transaction; do not claim either.

If direct edits are necessary for an operation unsupported by an otherwise verified connection, check the connected guide and scope first. Afterwards refresh that connection and re-get affected documents before any dependent MCP writes; old revisions and cursors are no longer evidence of current state.

The authorized local write surface is the bounded `.codocs` owners and necessary index/reference documents. Do NOT modify application code, generated indexes, provider records, or Git history as part of curation. Report the chosen access method, actual worktree and paths, checks, limitations, and remaining work using [memory-change-set.md](memory-change-set.md).
