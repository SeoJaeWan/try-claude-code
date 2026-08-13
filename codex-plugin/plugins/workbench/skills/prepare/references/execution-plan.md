# Execution Plan Contract

Prepare converts one complete ready Shape Report into exact stage 8 inputs. It plans standard Git worktrees but does not create them or persist the plan.

## Shape input

Accept either:

- `inline`: the complete Shape Report is present in the current task context or user input;
- `memory_artifact`: the user supplies a Local Work Memory Artifact reference and Prepare resolves its canonical content through the MCP.

Do not require the Shape Report to have been persisted. Reject metadata-only summaries, incomplete reports, mismatched repository identities, non-`READY` reports, and stale Git snapshots.

## Parallel safety test

Place tasks in the same parallel wave only when all are true:

- same immutable base SHA;
- no dependency path between them;
- disjoint owned paths and indirect write surfaces;
- no producer/consumer API, schema, type, or generated-code relationship;
- isolated ports, databases, queues, accounts, and fixtures;
- formatters and generators cannot rewrite sibling surfaces;
- repository instructions permit task branches, worktrees, and task-local commits.

Otherwise serialize.

## Required Execution Plan

```yaml
plan_status: READY | BLOCKED | RESHAPE_REQUIRED
run_id:
repository_id:
work_item_key:
shape_report_id:
shape_input:
  kind: inline | memory_artifact
  artifact_ref: null
execution_plan_id: <run_id>/prepare/<positive revision number>
execution_plan_digest: <sha256 of canonical plan content with this field blank>
git_common_dir:
repository_root:
prepared_from_root:
base_commit:
worktree_policy: task_scoped
worktree_parent: <canonical absolute dedicated root outside repository and Git metadata>
topology: serial_task_worktrees | parallel_task_worktrees
planned_worktree_count:
worktrees_materialized: false
task_worktree_reuse_policy: none
commit_policy: task_local_required | user_confirmation_required
documentation_policy: chat_only | declared_paths
documentation_paths: []
baseline:
  - command:
    cwd:
    exit_status:
    duration:
    result: pass | pre_existing_failure | unavailable | not_run
    evidence:
    verification_policy: exact_pass | no_new_failures
    failure_ids: []
baseline_failures:
  - failure_id:
    command:
    test_identity:
    normalized_error_fingerprint:
    observed_count:
    acceptance_critical:
environment:
  package_manager:
  frozen_install_command:
  ignored_file_requirements: []
  symlink_requirements: []
  services: []
  shared_caches: []
waves:
  - wave: 1
    base_selector:
      kind: exact_sha | task_output | integration_output
      value: <commit SHA, TASK-001.result_sha, or INT-001.integrated_head_sha>
    parallel: true
    task_ids: []
tasks: []
integration:
  strategy: verify_existing_head | cherry_pick | merge_commits | repository_defined
  order: []
  cross_task_checks: []
delivery_policy:
  merge_local: false
  push: false
  pull_request: false
  handoff: manual
```

For `shape_input.kind: inline`, keep `artifact_ref: null`. For `memory_artifact`, preserve the exact MCP Typed Reference. The reference is provenance only and does not make the plan more approved than an inline input.

`planned_worktree_count` equals the number of Task Packets, including integration packets. There is no coordinator worktree. Every Task Packet owns exactly one path and branch, and no path or branch is reused within a run.

## Required Task Packet

```yaml
task_id: TASK-001 | INT-001
run_id:
execution_plan_id:
task_packet_digest: <sha256 of canonical packet content with this field blank>
kind: implementation | integration
title:
objective:
depends_on: []
wave:
parallel_group:
assigned_worktree: <unique direct child of worktree_parent>
branch: <unique codex/<run-id>/<task-id>>
base_selector:
  kind: exact_sha | task_output | integration_output
  value: <commit SHA, prior task result, or prior integration result>
inputs: []
requirement_ids: []
non_functional_requirement_ids: []
acceptance_ids: []
invariant_ids: []
decision_ids: []
requirement_contract: []
non_functional_requirement_contract: []
acceptance_contract: []
invariant_contract: []
decision_contract: []
owned_paths: []
forbidden_paths: []
shared_surfaces: []
runtime_resources: []
implementation_notes: []
focused_checks: []
broader_checks: []
verification_commands: []
expected_failure_before_implementation:
commit_policy: task_local_required | no_commit_needed
resume_from_result_id: null
resume_status_fingerprint: null
adopt_partial_diff: false
completion_contract:
  clean_worktree: true
  result_sha_required: true
```

Integration packets additionally declare `required_task_ids`, `integration_order`, `strategy`, `cross_task_checks`, and `output: integrated_head_sha`.

## Immutable selectors and task chaining

- For the first task or wave, use `kind: exact_sha` with `base_commit`.
- For a later serial task, use `kind: task_output` pointing to the preceding successful Task Result's `result_sha`.
- For a wave after integration, use `kind: integration_output` pointing to the preceding integration Task Result's `integrated_head_sha`.
- Resolve selectors only during Execute preflight after dependencies succeed.

Every plan includes a final integration-seal packet. For a purely serial chain, its unique worktree starts from the final implementation result and uses `strategy: verify_existing_head`. For parallel work, integration packets create a unique integration worktree from the wave base and integrate pinned result SHAs.

## Branch and path policy

- Use one unique valid branch per packet, normally `codex/<run-id>/<task-id>` subject to repository conventions.
- Set `worktree_parent` to an explicit canonical absolute dedicated directory outside the repository, Git common dir, home configuration directories, and system paths.
- Make every assigned path a direct child of that parent with no `..` and no symlink component.
- Verify every planned branch is absent and not checked out in another worktree.

## Digest rules

Emit the Execution Plan and each Task Packet as immutable YAML artifacts with exactly one corresponding digest field and no generated timestamp inside those YAML artifacts.

- Normalize CRLF/CR line endings to LF.
- Replace only the relevant digest scalar value with the empty string while preserving every other byte.
- SHA-256 the complete UTF-8 artifact bytes and lowercase-hex encode the result.

These execution digests bind inline task contracts. They are not Local Work Memory Artifact digests and are not required by MCP persistence.

## Baseline policy

- Record existing failures exactly; do not attribute them to future task work.
- `no_new_failures` passes only when failing identities, counts, and normalized fingerprints match the baseline and no additional failure appears.
- A missing acceptance-required check blocks readiness.
- Unexpected tracked changes from install, build, or code generation block readiness until understood.

## Direct execution and optional persistence

A complete `READY` Execution Plan and Task Packet are immediately valid inputs to Execute Task. Memory Update is optional.

When a later invocation receives only a Local Work Memory Artifact reference, Execute Task resolves the complete Prepare artifact through the MCP. Persisted and inline plans use the same plan and packet digest verification.

## Worktree lifecycle

- Shape and Prepare create no worktrees.
- Execute materializes an absent assigned path from the resolved immutable base using standard Git worktree commands and the exact planned branch.
- Every successful mutating task result is a clean task-local commit SHA.
- A failed or invalidated task may preserve its dirty task worktree as quarantined evidence.
- A same-task partial diff may be adopted only when a new packet names `resume_from_result_id`, records the exact prior `resume_status_fingerprint`, sets `adopt_partial_diff: true`, and the user explicitly approves.
- Every parallel wave is followed by an integration task, and every run ends with a final integration-seal result.

## Blocked result

```yaml
plan_status: BLOCKED | RESHAPE_REQUIRED
run_id:
shape_report_id:
blockers: []
completed_baseline_evidence: []
task_packets_emitted: false
required_next_input_or_action: []
```
