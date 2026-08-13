# Work Artifact Persistence Contract

## Valid input

Require one complete artifact and the identity required by the MCP artifact commit contract:

```yaml
artifact_kind:
producer:
run_id:
project_id:
work_item_id:
work_item_key:
repository_snapshot:
  repository_id:
  base_commit:
  status_fingerprint:
title:
content: <complete artifact body>
```

- `artifact_kind` and its storage folder must be supported or returned by the MCP contract.
- `producer` is provenance only and does not control eligibility.
- Require an existing canonical Work Item accepted by the MCP.
- Reject incomplete summaries, metadata-only inputs, identity mismatches, or unauthorized sensitive content.

## MCP use

Use the Local Work Memory MCP artifact commit capability. Follow its schema and result contract for operation identity, supported artifact kinds, transfer mode, idempotent retry, canonical success, and error interpretation.

Do not synthesize a folder, path, artifact ID, revision, digest, or Typed Reference. Do not alter the artifact body. If safe persistence requires meaning-changing redaction, return `BLOCKED`.

## Result status

- `COMMITTED`: canonical commit success with an exact Artifact reference.
- `ALREADY_COMMITTED`: idempotent success returning the existing exact reference.
- `BLOCKED`: input, identity, authorization, support, or safety validation failed before a trustworthy commit.
- `FAILED`: the MCP reports a determinate failure.
- `INDETERMINATE`: transport or response evidence cannot establish whether the commit occurred.

## Result

```markdown
# Memory Update Result
- status: COMMITTED | ALREADY_COMMITTED | BLOCKED | FAILED | INDETERMINATE
- artifact_kind:
- producer:
- run_id:
- project_id:
- work_item_id:
- work_item_key:
- operation_id:
- transport_or_error_evidence:

## Artifact reference
- ref: <exact MCP Typed Reference or unavailable>
- current: true | false | unavailable

## Workflow effect
- approval_granted: false
- additional_work_started: false
```

Return immediately after the persistence result.
