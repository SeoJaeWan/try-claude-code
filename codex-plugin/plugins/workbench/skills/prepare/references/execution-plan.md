# Execution Plan Contract

Prepare converts a persisted ready Shape artifact into exact stage 8 inputs. It plans standard Git worktrees but does not create them.

## Parallel safety test

Place tasks in the same parallel wave only when all are true:

- same immutable base SHA;
- no dependency path between them;
- disjoint owned paths and indirect write surfaces;
- no producer/consumer API, schema, type, or generated-code relationship;
- isolated ports, databases, queues, accounts, and fixtures;
- formatters and generators cannot rewrite sibling surfaces;
- repository instructions permit task branches, worktrees, and task-local commits.

Otherwise serialize. Shared lockfiles, migration sequences, barrel exports, snapshots, generated clients, or runtime resources are collision surfaces even when primary files differ.

## Required Execution Plan

```yaml
plan_status: READY | BLOCKED | RESHAPE_REQUIRED
run_id:
repository_id:
work_item_key:
shape_report_id:
shape_artifact_digest:
shape_wiki_ref:
  source_id:
  slug:
  source_revision: <opaque value or null when service omitted it>
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
shape_wiki_state: applied | unchanged
prepare_wiki_state: proposed
prepare_wiki_slug:
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
resume_status_fingerprint: null
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

Every implementation and integration packet uses a unique task-scoped branch. Integration is not a privileged coordinator lane.

## Immutable selectors and task chaining

- For the first task or wave, use `kind: exact_sha` with `base_commit`.
- For a later serial task, use `kind: task_output` pointing to the preceding successful Task Result's `result_sha`.
- For a wave after integration, use `kind: integration_output` pointing to the preceding integration Task Result's `integrated_head_sha`.
- Resolve selectors only during Execute preflight after dependency results are available. Bind exact dependency heads in the immutable Execution Binding.
- A missing, ambiguous, stale, or unsuccessful dependency output blocks execution.

Every plan includes a final integration-seal packet. For a purely serial chain, its unique worktree starts from the final implementation result and uses `strategy: verify_existing_head`; it verifies ancestry, combined diff, and cross-task checks, then emits its clean HEAD as `integrated_head_sha`. For parallel work, integration packets create a unique integration worktree from the wave base and integrate pinned result SHAs.

## Branch and path policy

- Use one unique valid branch per packet, normally `codex/<run-id>/<task-id>` subject to repository conventions.
- Set `worktree_parent` to an explicit canonical absolute dedicated directory outside the repository, Git common dir, home configuration directories, and system paths.
- Make every assigned path a direct child of that parent with no `..` and no symlink component. Resolve the parent or nearest existing ancestor and reject occupied paths.
- Verify every planned branch is absent and not checked out in another worktree. The only exception is a same-task documented resume that adopts the exact recorded task branch, path, result identity, and dirty fingerprint under the resume contract below.
- Do not derive destructive cleanup targets from unresolved environment variables, globs, or command substitutions.

## Prepare artifact and persistence contract

The Dev Wiki Prepare artifact body is the durable execution contract. Include:

1. `run_id`, `execution_plan_id`, linked `shape_report_id`, Shape Wiki reference, base commit, and generated time;
2. scope and execution rationale, including why tasks are split or serialized;
3. the complete semantic Execution Plan and all Task Packets, replacing machine-local absolute path fields with stable tokens such as `<repository-root>` and `<worktree-parent>/<task-id>`;
4. dependency graph, waves, collision analysis, worktree paths/branches, and runtime allocation;
5. baseline commands, failures, verification policy, documentation policy, and delivery boundaries;
6. deviations from Shape and the reason for each deviation;
7. `supersedes` when replacing an earlier Prepare artifact.

Do not include absolute Local paths in the Dev Wiki body. Keep exact machine-bound paths only in the separately digested executable YAML returned by Prepare. Never include credentials, secrets, customer data, or ignored-file contents.

Normalize CRLF/CR line endings in the complete `full_body` to LF, SHA-256 the exact UTF-8 bytes, and lowercase-hex encode it as `artifact_digest`. Do not include the digest inside `full_body`.

Prepare proposes exactly one change:

```yaml
artifact_kind: prepare
artifact_id: <execution_plan_id>
artifact_digest: <sha256 of normalized full_body>
run_id:
git_common_dir:
repository_id:
work_item_key:
change_id: WIKI-PREPARE-001
action: create | update | skip
source_type: dev_wiki
slug: projects/<stable-project-key>/work-items/<stable-work-item-key>/prepare
source_id: <UUID from memory_get; update/skip only>
title: <work item> — Prepare
full_body: |
  <complete Prepare artifact body; create/update only>
expected_revision: <exact opaque memory_get value; update only>
reason:
evidence_ids: []
```

Use the same slug, full-body, skip, opaque revision, secret-handling, and safety rules as the Shape artifact. A ready plan is not executable until `$workbench:memory-update` returns `APPLIED`/`indexed` or `NOT_NEEDED`/`unchanged` with a Dev Wiki reference matching `artifact_id` and `artifact_digest`.

## Digest rules

Emit the Execution Plan and each Task Packet as immutable YAML artifacts with exactly one corresponding digest field and no generated timestamp inside those YAML artifacts.

- Normalize only CRLF/CR line endings to LF.
- Replace only the relevant digest scalar value with the empty string while preserving every other byte.
- SHA-256 the complete UTF-8 artifact bytes and lowercase-hex encode the result.
- Exclude no fields and trim no whitespace.

## Baseline policy

- Record existing failures exactly; do not attribute them to future task work.
- `no_new_failures` passes only when failing identities, counts, and normalized fingerprints match the baseline and no additional failure appears.
- A missing acceptance-required check blocks readiness.
- Unexpected tracked changes from install, build, or code generation block readiness until understood.

## Worktree lifecycle

- Shape and Prepare remain read-only and create no worktrees.
- Execute materializes an absent assigned path from the resolved immutable base using standard Git worktree commands and the exact planned branch.
- Every task result is a clean task-local commit SHA. Uncommitted files are never an integration input.
- A failed or invalidated task may preserve its dirty task worktree as quarantined evidence.
- `task_worktree_reuse_policy: none` prohibits path/branch reuse across distinct task IDs. It does not prohibit another attempt of the same task from adopting its quarantined worktree.
- A same-task partial diff may be adopted only when a new packet names `resume_from_result_id`, records the exact prior `resume_status_fingerprint`, sets `adopt_partial_diff: true`, and the user explicitly approves. Execute must require the same path, branch, base HEAD, changed paths, and dirty fingerprint recorded by that prior Task Result; any mismatch blocks rather than repairs the worktree.
- Every parallel wave is followed by an integration task, and every run ends with a final integration-seal result.
- Push, PR, Local merge/rebase, handoff, and cleanup remain outside implicit authority.

## Blocked result

If an entry gate, Shape Wiki verification, or required baseline check fails, do not emit executable Task Packets:

```yaml
plan_status: BLOCKED | RESHAPE_REQUIRED
run_id:
shape_report_id:
blockers: []
completed_baseline_evidence: []
task_packets_emitted: false
dev_wiki_artifact_state: blocked
required_next_input_or_action: []
```
