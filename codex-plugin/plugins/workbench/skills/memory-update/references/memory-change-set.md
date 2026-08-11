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

The MCP adapter may return service errors inside an ordinary payload. Inspect both fields:

```text
create/update success = status 200 AND outcome indexed
```

Handle all other results conservatively:

- `400`: invalid artifact/change set; return `FAILED`;
- `403`: forbidden source type or write; return `FAILED`;
- `409`: return `RESHAPE_REQUIRED` for Shape or `REPREPARE_REQUIRED` for Prepare;
- `5xx`: return `FAILED` only with a trustworthy determinate response;
- `200` with another outcome: return `INDETERMINATE`;
- timeout, disconnect, transport exception, or missing trustworthy payload: return `INDETERMINATE` and never retry automatically.

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
