# Finalization Contract

Finalize evaluates `base_snapshot..integrated_head_sha` as one product change.

## Risk-driven test matrix

Map each relevant risk to a concrete scenario:

| Risk | Candidate checks |
| --- | --- |
| duplicate or concurrent action | simultaneous requests, double click, idempotency |
| shared mutable state | race ordering, stale read/write, lock behavior |
| network dependency | timeout, reset, slow response, partial response, retry |
| resource pressure | bounded concurrency/load, queue saturation, memory/CPU limits |
| lifecycle interruption | cancel, page/process exit, restart, recovery |
| data consistency | partial failure, rollback/compensation, replay |

Run only applicable checks. State the environment, parameters, bounds, and why omitted risks are not applicable or could not be tested.

## Independent review packet

Give a fresh reviewer:

- requirements, invariants, acceptance criteria, and architecture decisions;
- immutable base and integrated head SHAs;
- raw integrated diff and changed-file list;
- task and integration verification evidence;
- relevant repository instructions.

Do not include the implementer's persuasive narrative. Ask for findings first, ordered by severity, with file/line evidence. Require explicit coverage of correctness, security, concurrency, performance, failure handling, maintainability, architecture consistency, and tests.

Disposition values:

- `must_fix`: cannot finalize; create new shaped/prepared work;
- `accepted_risk`: user-approved with rationale;
- `false_positive`: disproved with evidence;
- `follow_up`: valid but outside current acceptance boundary.

## Entry-gate failure

When there is no integrated result, do not fabricate the full report. Return:

```markdown
# Finalization Gate Result
- status: INTEGRATION_REQUIRED | BLOCKED
- run_id:
- reason:
- integrated_head_sha: unavailable
- documentation_changes: none
- unperformed_checks:
  - integrated diff validation
  - failure/concurrency/load validation
  - independent review
- required_next_input:
```

## Final report

```markdown
# Workbench Final Report — <run_id>

## Status
- FINALIZED | CHANGES_REQUIRED | BLOCKED
- base_sha:
- integrated_head_sha:
- final_head_sha:
- final_branch:

## Summary

## Requirements and acceptance result
- REQ/NFR/AC ID -> pass/fail/not verified + evidence

## Architecture decisions
- DEC ID -> implementation result + source links

## Sources
- source ID -> claim/REQ/NFR/INV/AC/DEC mapping, source URL, canonical official URL if verified, version/ref alignment, retrieval provenance and ISO-8601 retrieval timestamp

## Changed components

## Task and integration commits

## Verification
### Baseline
### Functional and regression checks
### Failure, concurrency, and load checks
### Unperformed checks

## Independent review
- reviewer identity/context separation
- findings and dispositions

## Documentation
- chat-only or changed paths

## Known limitations and remaining risks

## Delivery state
- Local drift observed
- push/PR/handoff/cleanup not performed
- user-selectable next actions
```

If repository docs are changed during Finalize, rerun relevant checks and create only the authorized finalization commit. Preserve both `integrated_head_sha` and `final_head_sha`.

Do not declare success while a `must_fix` finding or required failed check remains.
