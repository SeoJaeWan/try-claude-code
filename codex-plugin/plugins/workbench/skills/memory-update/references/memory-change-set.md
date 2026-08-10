# Memory Change Set Application Contract

This stage applies an already shaped change. It performs no retrieval or design work.

## Valid input

Every mutation must come verbatim from one `shape_status: READY` Shape Report and contain:

- a unique `change_id` within the Change Set;
- `depends_on` as an array, empty when independent;
- the action-specific fields below.

Before any write, require every dependency ID to name another entry in the same Change Set, reject self-dependencies and cycles, and require the listed order to be topological so every dependency precedes its dependent. A selected subset must include the full transitive dependency closure or prove each omitted dependency was already applied by this same Change Set result.

| Action | Required fields |
| --- | --- |
| `create/dev_wiki` | `slug`, `title`, non-null `full_body` |
| `create/note` | `title`, non-null `full_body` |
| `update` | `source_type`, `source_id`, `title`, non-null `full_body`, `expected_revision` |
| `delete` | `source_type`, `source_id`, `title`, `expected_revision`; same-invocation user confirmation is also required |

Accept only `dev_wiki` or explicitly selected `note`. Do not pass `area`, `project`, or `repository`; they are not `memory_write` inputs.

For Dev Wiki create, require a stable slug matching:

```regex
^[a-z0-9][a-z0-9/-]{0,120}$
```

## Tool mapping

```text
create -> memory_write(action=create, source_type, slug?, title, body=full_body)
update -> memory_write(action=update, source_type, source_id, title,
                       body=full_body, expected_revision)
delete -> memory_write(action=delete, source_type, source_id,
                       expected_revision)
```

Omit `source_id` on create. Preserve `expected_revision` byte-for-byte as an opaque string.

The current service has no note-create idempotency key or note TTL. Treat note creation as durable, require explicit acknowledgment of duplicate-on-replay risk, and do not retry an unknown result.

## Result interpretation

The MCP adapter returns service errors inside an ordinary tool payload. Always inspect both fields:

```text
create/update success = status 200 AND outcome indexed
delete success        = status 200 AND outcome deleted
```

Handle all other results conservatively:

- `400`: invalid Change Set or request; stop;
- `403`: forbidden source type; stop;
- `409`: return to Shape; never refresh the revision and retry here;
- `5xx`: stop and preserve partial result evidence;
- `200` with unexpected outcome: indeterminate; an earlier persistence step may have occurred;
- timeout, disconnect, transport exception, or any result without a trustworthy service payload: indeterminate; persistence may already have occurred, so never retry automatically.

Apply sequentially and stop on first failure. Do not assume a transaction spans multiple entries, and do not attempt rollback.

By default select every non-`skip` entry. If the explicit invocation supplies `selected_change_ids`, select exactly those IDs and verify their transitive `depends_on` closure before any write. Report unselected entries separately from entries that are pending because execution stopped.

## Current service limitations

- A successful write may omit the new revision. Do not invent one; a later Shape retrieves it again.
- Expected-revision validation is not a single atomic database compare-and-swap. Serializing this Change Set reduces Workbench self-races but cannot exclude external writers.
- Therefore report guarded revision use, not guaranteed atomic optimistic concurrency.

## Result template

```markdown
# Memory Update Result
- status: APPLIED | FAILED | PARTIAL | RESHAPE_REQUIRED | INDETERMINATE | BLOCKED
- partial_applied: true | false
- run_id:

## Applied
- change_id, source_type, source_id/slug, status, outcome

## Failed
- change_id, status if present, outcome if present, transport/error evidence, current_revision if returned

## Pending
- unattempted change IDs

## Skipped
- Shape entries with action skip

## Not selected
- entries excluded by explicit selected_change_ids

## Next action
```

Status precedence is `RESHAPE_REQUIRED` for every trustworthy 409 response, even when earlier entries succeeded; use `partial_applied: true` to preserve that fact. A missing or untrustworthy response after an attempted write, or `status: 200` with an unexpected outcome, is always `INDETERMINATE` because persistence may already have occurred; never retry it automatically. A determinate non-409 failure is `FAILED` before any success and `PARTIAL` after prior success. Gate failures use `BLOCKED` with a specific reason code.
