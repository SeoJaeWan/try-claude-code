# Execution Plan Contract

## Accepted input

Accept a software change request, issue, requirements document, design note, analysis report, or other complete change definition.

```yaml
source_input:
  kind: inline | memory_artifact
  artifact_ref: null
  source_digest:
```

For inline input, keep `artifact_ref: null`. For referenced input, preserve the supplied MCP reference exactly and use the Local Work Memory MCP to resolve its complete current body. Follow the MCP guidance and contract exposed at invocation time. Reject summaries, metadata-only references, identity mismatches, or inputs too incomplete to determine task scope and acceptance.

Every emitted task packet must be self-contained for a worker that receives no conversation history. Do not put model or reasoning-effort choices in the plan; the executor owns its worker runtime policy.

## Parallel safety

Place tasks in the same parallel wave only when all are true:

- same immutable base SHA;
- no dependency path;
- disjoint direct and indirect write surfaces;
- no producer/consumer API, schema, type, or generated-code relationship;
- isolated ports, databases, queues, accounts, and fixtures;
- formatters and generators cannot rewrite sibling surfaces;
- repository instructions permit task branches, worktrees, and task-local commits.

Otherwise serialize.

## Required plan

```yaml
status: READY | BLOCKED | NEEDS_INPUT
run_id:
repository_id:
work_item_key:
source_input:
  kind: inline | memory_artifact
  artifact_ref: null
  source_digest:
execution_plan_id: <run-id>/plan/<positive revision>
execution_plan_digest: <sha256 with this field blank>
git_common_dir:
repository_root:
prepared_from_root:
base_commit:
base_status_fingerprint:
worktree_parent: <canonical absolute dedicated root>
topology: serial | parallel
planned_worktree_count:
worktrees_materialized: false
task_worktree_reuse_policy: none
commit_policy: task_local_required | user_confirmation_required
documentation_policy: chat_only | declared_paths
documentation_paths: []
baseline: []
baseline_failures: []
environment:
  package_manager:
  frozen_install_command:
  ignored_file_requirements: []
  symlink_requirements: []
  services: []
  shared_caches: []
waves: []
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

`planned_worktree_count` equals the number of packets, including integration packets. There is no coordinator worktree and no path or branch reuse.

## Required task packet

```yaml
task_id: TASK-001 | INT-001
run_id:
execution_plan_id:
task_packet_digest: <sha256 with this field blank>
kind: implementation | integration
title:
objective:
depends_on: []
wave:
parallel_group:
assigned_worktree:
branch:
base_selector:
  kind: exact_commit | task_result | integration_result
  value:
inputs: []
requirement_ids: []
acceptance_ids: []
invariant_ids: []
decision_ids: []
requirement_contract: []
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
completion_contract:
  clean_worktree: true
  result_sha_required: true
```

Integration packets additionally declare `required_task_ids`, `integration_order`, `strategy`, `cross_task_checks`, and `output: integrated_head_sha`.

## Selectors and worktrees

- The first task or wave uses `exact_commit` with `base_commit`.
- A later serial task uses `task_result` with the preceding task identity. The executor binds it to an exact verified result or an exact provisional candidate allowed by its continuation policy.
- A wave after integration uses `integration_result` with the preceding integration identity. The executor binds it to an exact verified or explicitly usable provisional integrated head.
- Resolve selectors only after dependencies return an exact consumable commit. Planning does not predict verification success or authorize unsafe continuation.
- Every packet owns one unique valid branch, normally `codex/<run-id>/<task-id>`.
- `worktree_parent` must be outside the repository, Git metadata, home configuration, and system paths.
- Every assigned path must be a unique direct child of that parent without `..` or symlink components.

## Digests and baseline

Emit the plan and each packet as immutable YAML with exactly one corresponding digest field and no generated timestamp. Normalize CRLF/CR to LF, replace only the relevant digest value with an empty string, preserve every other byte, then SHA-256 the UTF-8 bytes.

Record pre-existing failures by stable identity, normalized fingerprint, and count. `no_new_failures` succeeds only when they match and no additional failure appears. Missing acceptance-critical checks or unexpected tracked changes block readiness.

`completion_contract.result_sha_required` requires an immutable task commit when the executor determines that the implementation is consumable. The executor may classify that commit as a verified result or a provisional candidate; a provisional candidate does not satisfy acceptance or alter this immutable plan.

## Blocked result

```yaml
status: BLOCKED | NEEDS_INPUT
run_id:
reason:
completed_evidence: []
task_packets_emitted: false
required_input_or_action: []
```
