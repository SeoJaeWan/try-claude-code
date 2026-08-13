# Finalization Contract

Finalize evaluates `base_commit..integrated_head_sha` as one product change in the final integration task's worktree. Workflow inputs may be inline or resolved from user-supplied Local Work Memory Artifact references.

## Input binding

Require exact agreement on:

- `run_id`, `repository_id`, Git common dir, base commit, and integrated head;
- `shape_report_id`, `execution_plan_id`, and execution plan digest;
- the complete expected task inventory and selected successful Task Result attempt for every packet;
- task packet and Execution Binding digests;
- dependency and integrated result SHAs.

Persistence is optional. If an Artifact reference is supplied, resolve it through the Local Work Memory MCP. Do not require a persistence result or Artifact reference.

## Risk-driven test matrix

| Risk | Candidate checks |
| --- | --- |
| duplicate or concurrent action | simultaneous requests, double click, idempotency |
| shared mutable state | race ordering, stale read/write, lock behavior |
| network dependency | timeout, reset, slow response, partial response, retry |
| resource pressure | bounded concurrency/load, queue saturation, memory/CPU limits |
| lifecycle interruption | cancel, page/process exit, restart, recovery |
| data consistency | partial failure, rollback/compensation, replay |

Run only applicable checks. State environment, parameters, bounds, and why omitted risks are not applicable or could not be tested. A required or acceptance-critical check that is failed or not verified prevents `FINALIZED`.

## Independent review packet

Give a fresh reviewer:

- requirements, invariants, acceptance criteria, and architecture decisions;
- immutable base and integrated head SHAs;
- raw integrated diff and changed-file list;
- task and integration verification evidence;
- relevant repository instructions.

Do not include the implementer's persuasive narrative. Ask for findings first, ordered by severity, with file/line evidence.

Disposition values:

- `must_fix`
- `accepted_risk` only with explicit user approval
- `false_positive`
- `follow_up`

## Entry-gate failure

When there is no valid integrated result, do not fabricate the full report. Return:

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
- status: FINALIZED | CHANGES_REQUIRED | BLOCKED
- base_commit:
- integrated_head_sha:
- final_head_sha:
- final_branch:
- final_worktree_clean:

## Input artifacts
- Shape report ID and optional Local Work Memory Artifact reference
- Execution plan ID, digest, and optional Local Work Memory Artifact reference
- Task Result IDs, task packet digests, and Execution Binding digests

## Summary

## Requirements, invariants, and acceptance result
- REQ/NFR/INV/AC ID -> pass/fail/not verified + evidence

## Architecture decisions
- DEC ID -> implementation result + source links

## Sources
- source ID -> claim and contract mapping, canonical URL, version/ref alignment, retrieval provenance and time

## Changed components

## Task and integration commits

## Verification
### Baseline comparison
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
- push/PR/handoff/task-worktree cleanup not performed
- user-selectable next actions
```

If repository docs are changed during Finalize, require validated repository-relative paths, explicit commit authorization, a documentation-only diff from `integrated_head_sha`, relevant checks, and a final clean status. Preserve both `integrated_head_sha` and `final_head_sha`.

Do not declare success while a `must_fix` finding, required failed check, required unverified check, plan/result binding mismatch, or dirty final worktree remains.
