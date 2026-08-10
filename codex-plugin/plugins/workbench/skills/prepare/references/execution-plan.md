# Execution Plan Contract

Prepare converts a ready Shape Report into exact stage 8 inputs. The plan is evidence, not permission to run every task automatically.

## Parallel safety test

Place tasks in the same parallel wave only when all are true:

- same immutable base SHA;
- no dependency path between them;
- disjoint owned paths and indirect write surfaces;
- no producer/consumer API, schema, type, or generated-code relationship;
- isolated ports, databases, queues, accounts, and test fixtures;
- formatters/code generators cannot rewrite sibling surfaces;
- repository instructions permit branches, worktrees, and task-local commits.

Otherwise serialize. Two tasks that both touch a lockfile, migration sequence, barrel export, snapshot set, shared fixture, generated client, or shared runtime resource are not independent merely because their primary files differ.

## Required Execution Plan

```yaml
plan_status: READY | BLOCKED | RESHAPE_REQUIRED
run_id:
shape_report_id:
execution_plan_id: <run_id>/prepare/<positive revision number>
execution_plan_digest: <sha256 of canonical plan content with this field blank>
git_common_dir:
coordinator_root:
worktree_parent: <canonical absolute dedicated root outside repository and Git metadata>
base_commit:
coordinator_branch: <existing attached coordinator branch, or planned codex/<run-id>/coordinator when Shape recorded detached>
topology: coordinator_only | coordinator_plus_workers
worktree_count:
worker_count:
worker_reuse_policy: none
memory_update_state: applied | skipped | not_needed
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
  cleanup: manual
```

`worktree_count` always includes the coordinator and equals `1 + worker_count`. A coordinator-only plan has one worktree and zero workers.

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
assigned_worktree:
branch: <coordinator_branch for coordinator/integration tasks; unique codex/<run-id>/<task-id> for workers>
base_selector:
  kind: exact_sha | task_output | integration_output
  value: <commit SHA, prior serial task result, or prior integration task output>
inputs: []
requirement_ids: []
non_functional_requirement_ids: []
acceptance_ids: []
invariant_ids: []
decision_ids: []
requirement_contract:
  - id:
    text:
non_functional_requirement_contract:
  - id:
    text:
acceptance_contract:
  - id:
    text:
invariant_contract:
  - id:
    text:
decision_contract:
  - id:
    decision:
    constraints:
owned_paths: []
forbidden_paths: []
shared_surfaces:
  - path_or_resource:
    access: read_only | exclusive_write | integration_only
runtime_resources:
  - kind: port | database | queue | account | service | other
    identifier:
    allocation:
    isolation_check:
implementation_notes: []
focused_checks: []
broader_checks: []
verification_commands: []
expected_failure_before_implementation:
commit_policy: task_local_required | no_commit_needed
resume_from_result_id: null
adopt_partial_diff: false
completion_contract:
  clean_worktree: true
  result_sha_required: true
```

Integration packets additionally declare:

```yaml
required_task_ids: []
integration_order: []
strategy:
cross_task_checks: []
output: integrated_head_sha
```

Prepare cannot know result SHAs that earlier tasks have not produced. For the first task/wave, use `kind: exact_sha` with `base_commit`. For a later serial coordinator task, use `kind: task_output` pointing to the preceding successful task's `result_sha`. For a wave after integration, use `kind: integration_output` pointing to the integration task. At Execute preflight, resolve that selector and successful dependency Task Results into the deterministic immutable Execution Binding defined by Execute, including `resolved_base_sha` and exact dependency head mappings. A missing or ambiguous output blocks execution.

Every plan includes a final integration-seal packet. With `coordinator_only`, use `strategy: verify_existing_head`; the task verifies the already combined serial commits, runs cross-task checks, and returns the coordinator HEAD as `integrated_head_sha`. With workers, it integrates pinned worker results first.

Coordinator and integration packets always use the one durable `coordinator_branch`. Only worker packets use task-unique branches. Workbench v2 does not reuse a worker path across tasks or waves; `worker_count` therefore counts every planned worker worktree, not a reusable slot pool.

If Shape recorded an already attached coordinator branch, adopt and freeze that exact branch; do not invent a replacement. If Shape recorded detached HEAD, Prepare may declare one unique durable coordinator branch (default `codex/<run-id>/coordinator`, subject to repository convention) for Execute to create before the first mutation. Any other attached-branch transition requires explicit user authorization and a refreshed plan.

`worktree_parent` must be an explicit canonical absolute dedicated directory outside the repository, Git common dir, home configuration directories, and system paths. Every worker path must be a direct child, use no `..`, and have no symlink component. Resolve the parent (or nearest existing ancestor) before accepting it; reject occupied paths. Never derive a destructive target from an environment variable or glob.

An execution-ready mutating task uses `task_local_required`. If repository policy requires another confirmation, the plan stays blocked with top-level `user_confirmation_required` until confirmed. `no_commit_needed` is valid only for a read-only verification/integration seal that produces no diff. A repository that forbids durable task commits cannot use mutating Workbench execution; do not emit a READY plan.

In `coordinator_plus_workers`, the coordinator is a stable integration lane. Do not assign it one of the parallel implementation tasks.

## Baseline policy

- Record existing failures exactly; do not attribute them to future task work.
- A `no_new_failures` check passes only when the observed failing identities/count and normalized fingerprints are a subset-equivalent match to the recorded baseline and no additional failure appears. A bare nonzero exit code never proves “only existing failures”.
- A missing optional check may be `unavailable`, but a missing check required for acceptance blocks readiness.
- Do not install a different framework, test runner, HTTP client, or state manager when an established repository pattern exists.
- Unexpected tracked changes from install/build/codegen block readiness until understood.

## Worktree lifecycle

- Shape through Finalize share one coordinator identity.
- Prepare plans branches and paths; Execute may materialize an absent assigned worker from the exact planned base.
- A worker result must be a clean task-local commit SHA. Do not rely on uncommitted files surviving managed-worktree cleanup.
- Clean/result-SHA requirements apply to `COMPLETE` results. A blocked or invalidated task may preserve a dirty quarantined worktree, but it is never an integration input.
- A newly shaped/prepared task may adopt an earlier partial diff only when its packet explicitly names `resume_from_result_id`, sets `adopt_partial_diff: true`, and the user approves that adoption. Otherwise use a fresh assigned worktree.
- Every worker wave is followed by an integration task before a dependent wave starts.
- Every run, including a zero-worker serial run, ends with an integration-seal Task Result that produces `integrated_head_sha`.
- Push, PR, Local merge/rebase, handoff, and cleanup remain outside implicit authority.

## Blocked result

If the entry gate or a required baseline check fails, do not emit executable Task Packets. Return:

```yaml
plan_status: BLOCKED | RESHAPE_REQUIRED
run_id:
shape_report_id:
blockers: []
completed_baseline_evidence: []
task_packets_emitted: false
required_next_input_or_action: []
```
