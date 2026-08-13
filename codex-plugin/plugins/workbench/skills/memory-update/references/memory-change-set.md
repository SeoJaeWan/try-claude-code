# Optional Workbench Artifact Persistence Contract

Persist one completed Shape or Prepare result through the Local Work Memory MCP. Persistence is a user-selected side effect and never a workflow gate.

## Valid input

Require one complete result and the identity needed by the MCP artifact commit contract:

```yaml
producer: shape | prepare
run_id:
project_id:
work_item_id:
work_item_key:
repository_snapshot:
  repository_id:
  base_commit:
  status_fingerprint:
title:
content: <complete Shape Report or complete Execution Plan with Task Packets>
```

- Accept `shape_status: READY` for Shape.
- Accept `plan_status: READY` for Prepare.
- Map the producer to the stable artifact folder `shape` or `prepare`.
- Require an existing canonical Work Item accepted by the MCP. Do not invent or register one from Memory Update.
- Reject incomplete summaries, metadata-only input, identity mismatches, or unauthorized sensitive content.

## MCP use

Use the Local Work Memory MCP artifact commit capability. Follow the MCP tool schema and result contract for operation identity, inline or staged transfer, idempotent retry, canonical success, and error interpretation.

Do not copy MCP transport, staging, or response mechanics into this skill. Do not use Dev Wiki mutation for Shape or Prepare results: they are immutable Workbench Artifacts, not current project knowledge.

Do not alter the artifact body during transfer. If safe persistence requires meaning-changing redaction, return `BLOCKED` instead.

## Result status

Return one of:

- `COMMITTED`: the MCP reports canonical Artifact commit success and returns an exact Artifact reference;
- `ALREADY_COMMITTED`: an idempotent call returns the previously committed exact Artifact reference;
- `BLOCKED`: input, identity, authorization, or safety validation failed before a trustworthy commit;
- `FAILED`: the MCP reports a determinate failure;
- `INDETERMINATE`: transport or response evidence cannot establish whether canonical commit occurred.

Preserve the exact MCP Typed Reference. Do not synthesize a path, artifact ID, revision, or digest.

## Memory Update Result

```markdown
# Memory Update Result
- status: COMMITTED | ALREADY_COMMITTED | BLOCKED | FAILED | INDETERMINATE
- producer: shape | prepare
- run_id:
- project_id:
- work_item_id:
- work_item_key:
- folder: shape | prepare
- operation_id:
- transport_or_error_evidence:

## Artifact reference
- ref: <exact Local Work Memory MCP Typed Reference or unavailable>
- current: true | false | unavailable

## Workflow effect
- persistence_required_for_prepare: false
- persistence_required_for_execute: false
- persistence_required_for_finalize: false
```

Memory Update returns after persistence. It never approves, starts, or blocks another Workbench skill solely because storage was or was not performed.
