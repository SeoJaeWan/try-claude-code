# Finalization Contract

## Input binding

Require exact agreement on:

- repository identity and Git common dir;
- canonical target worktree and clean status;
- immutable `base_commit` and `head_sha`;
- branch, ancestry, and complete base-to-head diff.

Optional supporting evidence may include requirements, invariants, acceptance criteria, architecture decisions, execution plans, task results, test logs, and user-provided Local Work Memory Artifact references. Resolve supplied references through the MCP and preserve their provenance. Do not require a particular producer or workflow history.

When expected behavior is incomplete, reconstruct only what repository evidence and the user request support. Mark material uncertainty as `not_verified`; a missing acceptance-critical fact prevents `FINALIZED`.

## Risk-driven test matrix

| Risk | Candidate checks |
| --- | --- |
| duplicate or concurrent action | simultaneous requests, double click, idempotency |
| shared mutable state | race ordering, stale read/write, lock behavior |
| network dependency | timeout, reset, slow or partial response, retry |
| resource pressure | bounded concurrency/load, queue saturation, memory/CPU limits |
| lifecycle interruption | cancel, exit, restart, recovery |
| data consistency | partial failure, rollback, compensation, replay |

Run only applicable checks. State environment, parameters, bounds, and why omitted risks are not applicable or could not be tested. Failed or unverified acceptance-critical checks prevent `FINALIZED`.

## Independent review

Give a fresh reviewer:

- the user request and available requirements or acceptance evidence;
- immutable base and head SHAs;
- raw integrated diff and changed-file list;
- verification evidence;
- relevant repository instructions.

Do not include the implementer's persuasive narrative. Request findings first, ordered by severity, with file and line evidence.

Disposition values:

- `must_fix`
- `accepted_risk` only with explicit user approval
- `false_positive`
- `follow_up`

## Gate result

When the exact Git change cannot be established, return:

```markdown
# Finalization Gate Result
- status: BLOCKED
- reason:
- base_commit:
- head_sha:
- unperformed_checks:
- required_input:
```

## Final report

```markdown
# Workbench Final Report — <base-short>..<head-short>

## Status
- status: FINALIZED | CHANGES_REQUIRED | BLOCKED
- base_commit:
- head_sha:
- final_head_sha:
- branch:
- worktree_clean:

## Evidence used
- user request and repository evidence
- optional artifact references
- optional task and test records

## Summary

## Requirements and acceptance result
- criterion -> pass | fail | not_verified + evidence

## Changed components

## Verification
### Functional and regression checks
### Failure, concurrency, and load checks
### Unperformed checks

## Independent review
- reviewer separation
- findings and dispositions

## Documentation
- chat_only or changed paths

## Known limitations and remaining risks

## Delivery state
- push, PR, handoff, and cleanup not performed
```

If documentation is changed, require validated repository-relative paths, explicit authorization, a documentation-only diff from the reviewed head, relevant checks, and a final clean status. Preserve the reviewed `head_sha` and resulting `final_head_sha`.

Do not declare success while a `must_fix` finding, failed required check, required unverified check, ambiguous Git range, or dirty final worktree remains.
