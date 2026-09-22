# Local Codocs curation

## Select the project

Resolve the user-selected target repository and checkout; do not use the plugin repository or a hardcoded developer path as the knowledge root. Read project instructions and existing working-tree changes before editing. Inspect the `.codocs` index if present and follow relevant authoring, document, reference, and folder policies. Index filenames and folder layouts are conventions, not product requirements. An absent `.codocs` does not authorize creating or migrating a knowledge store; create one only when requested or required by applicable project policy within the local-only scope.

Read and edit local YAML directly. Wiki access, Wiki writes, and paired synchronization are outside this skill. Older project instructions describing paired updates do not expand this local-only scope; report the discrepancy if relevant without changing those instructions automatically.

## Discover and author

Build a compact inventory of actual `.yaml`/`.yml` documents under the selected `.codocs` root, including path, `id`, `name`, and `domains`. Do not confuse examples or another checkout's documents with the selected project. Respect filesystem boundaries and project discovery rules; incomplete discovery cannot establish uniqueness or absence. Read relevant owner bodies, duplicates, conflicts, and reference targets before deciding to create or split a document.

Use the target project's explicit schema/version, authoring rules, and validator as the governing format. The baseline below applies only where consistent with that project; it is not permission to migrate files or override a newer schema. If the project has no contrary rule, use this baseline with repository evidence. If a material schema conflict cannot be resolved from local rules/tooling, hold affected writes and ask while continuing independent work.

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
- Preserve existing optional/custom fields, comments, and unrelated user edits. Do not convert all files or introduce legacy `type`, `title`, `body`, or singular `domain` as schema fields.
- Describe meaning, behavior, policy, conditions, exceptions, rationale, and responsibility. Do not copy task progress, PR assignments, execution plans, or completion logs into `.codocs`. Keep unagreed policy distinguishable from confirmed policy.
- Prefer the current owner. Split only for a separately useful subject, not because of length, reference count, or an arbitrary document-role label. Use the project's placement and naming conventions without imposing the Codocs repository's folders on other projects.

## References and validation

Under the bundled baseline, Codocs body references use exact document names: `[[이름]]` or `[[도메인:이름]]`, not Wiki slugs or MCP references. Unqualified names resolve across all domains; the source document's domain has no priority. Use a qualified name when necessary. Follow the project's escaping rules for colons and literal brackets. References are interpreted in `definition` and string `examples`, not arbitrary metadata. Apply Codocs reference parsing rules even inside Markdown code fences; do not invent a fenced-code exclusion.

Discover the project's parser/validator and catalog/reference checks. Establish an initial inventory, validate changed documents and affected incoming/outgoing references before dependent edits, and run final project-wide uniqueness and reference/navigation checks. Reuse unchanged inventory/check evidence; rescan affected surfaces when concurrent edits invalidate it. Avoid a complete scan after every unrelated edit unless the tooling requires one. Do not invent a CLI or treat a generic YAML parser as complete Codocs validation. If semantic tooling is unavailable, inspect required fields, allowed values, duplicate IDs, same-domain name collisions, exact reference targets, and index reachability; report the checks performed and any unresolved limitations. Generic YAML validity alone does not establish Codocs validity. The bundled baseline excludes duplicate mapping keys, anchors/aliases, merge keys, custom tags, and multiple YAML documents per file; apply the governing project format when different.

For renames, check all affected incoming references and preserve their intended targets, including domain ambiguity. Do not claim a complete rename while affected references remain unresolved or out of scope. For splits, verify the destination before narrowing the source. Keep useful overview/navigation documents and avoid reciprocal-link-only rewrites.

## Safe local writes and reporting

Follow repository checkout/worktree instructions. Preserve existing changes and reread each file immediately before editing; if it changed since inspection, reconcile from the latest source or block that unit. Verify each saved document before the next dependent write. Direct filesystem edits do not provide MCP revision control or a multi-file transaction; do not claim either.

The authorized local write surface is the bounded `.codocs` owners and necessary index/reference documents. Do not modify application code, generated indexes, provider records, or Git history as part of curation. Leave local changes reviewable and report their actual worktree and paths.

For every knowledge unit, report created, updated, unchanged, blocked, failed, or uncertain, along with actual paths, validation evidence, and remaining work. Already-equivalent content is unchanged, not a reason to rewrite. Do not claim transactional multi-file writes or completed checks that were unavailable.
