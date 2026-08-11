# Dev Wiki Artifact Persistence Contract

Persist one immutable Shape or Prepare artifact body to one canonical Dev Wiki page.

## Valid input

```yaml
artifact_kind: shape | prepare
artifact_id: <shape_report_id or execution_plan_id>
artifact_digest: <lowercase SHA-256 of normalized full_body>
run_id:
git_common_dir:
repository_id:
work_item_key:
change_id: WIKI-SHAPE-001 | WIKI-PREPARE-001
action: create | update | skip
source_type: dev_wiki
slug: projects/<stable-project-key>/work-items/<stable-work-item-key>/<shape-or-prepare>
source_id: <create omits; update/skip requires>
title:
full_body: |
  <create/update only; complete canonical artifact>
expected_revision: <update requires exact opaque value>
reason:
evidence_ids: []
```

Accept only one entry. Accept only `source_type: dev_wiki`. Require a stable slug matching:

```regex
^[a-z0-9][a-z0-9/-]{0,120}$
```

Action requirements:

| Action | Required fields | Forbidden behavior |
| --- | --- | --- |
| `create` | slug, title, full body | sending `source_id` or retrying an unknown result |
| `update` | source ID, title, full body, expected revision | patches, synthesized revision, automatic conflict merge |
| `skip` | source ID and prior canonical identity | calling `memory_write` |

Normalize only CRLF/CR line endings in `full_body` to LF. SHA-256 the exact UTF-8 bytes and require a lowercase-hex match with `artifact_digest`. Do not trim whitespace or exclude fields. The digest must not appear inside the canonical body.

Reject a body containing credentials, tokens, private keys, unapproved customer data, ignored secret-file contents, or machine-specific private paths that the producing contract forbids. A redacted body that changes the artifact meaning is not valid.

## Tool mapping

```text
create -> memory_write(action=create, source_type=dev_wiki,
                       slug, title, body=full_body)
update -> memory_write(action=update, source_type=dev_wiki,
                       source_id, title, body=full_body,
                       expected_revision)
skip   -> no tool call
```

Omit `source_id` on create. Preserve `expected_revision` byte-for-byte as an opaque string.

## Result interpretation

The MCP adapter may return service errors inside an ordinary payload. Inspect the service status, domain outcome, and returned source identity. An HTTP-success class alone does not prove that persistence and indexing completed:

```text
supported completion statuses = {200, 201}
create/update success = supported status AND outcome indexed AND non-empty returned source_id
```

Use this result matrix:

| Service evidence | Result |
| --- | --- |
| `200/indexed` with a non-empty returned `source_id` | `APPLIED`/`indexed` |
| `201/indexed` with a non-empty returned `source_id` | `APPLIED`/`indexed` |
| `202/indexed` | `INDETERMINATE` |
| `200` or `201` with `outcome != indexed` (for example, `201/completed`) | `INDETERMINATE` |
| Missing or untrustworthy `status`, `outcome`, or returned `source_id` | `INDETERMINATE` |
| `409` | Shape: `RESHAPE_REQUIRED`; Prepare: `REPREPARE_REQUIRED` |
| Trustworthy determinate non-409 `4xx` or `5xx` | `FAILED` |
| Timeout, disconnect, or transport exception | `INDETERMINATE` |

Never retry, merge, roll back, or issue another mutation after any non-success result. In particular, `202` acknowledges a request but is not proof of completed persistence.

No transaction spans multiple pages because one invocation writes one artifact page.

## Dev Wiki reference

On success return:

```yaml
dev_wiki_ref:
  source_type: dev_wiki
  source_id: <exact returned or existing value>
  slug:
  source_revision: <exact returned value or null>
  artifact_kind: shape | prepare
  artifact_id:
  artifact_digest:
  status: indexed | unchanged
```

`artifact_digest` is the immutable content binding even when the service omits a new revision. A later stage that has read access must retrieve the body and verify this digest rather than trusting a search excerpt.

## Result template

```markdown
# Memory Update Result
- status: APPLIED | NOT_NEEDED | FAILED | RESHAPE_REQUIRED | REPREPARE_REQUIRED | INDETERMINATE | BLOCKED
- run_id:
- artifact_kind:
- artifact_id:
- artifact_digest:
- action: create | update | skip
- service_status:
- service_outcome:
- transport_or_error_evidence:

## Dev Wiki reference
- source_type: dev_wiki
- source_id:
- slug:
- source_revision:
- status: indexed | unchanged | unavailable

## Next action
```

Do not claim a new revision unless the tool returned it. Do not claim failure is safe to retry when persistence is indeterminate.
