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

## Human-readable walkthrough

For a `READY` result, preserve the complete canonical plan YAML and every digest exactly as produced. After the closing YAML fence, always append `## 작업 단계 설명` for a Korean response or an equivalent heading in the user's language. This walkthrough is presentation only: it is not part of the immutable plan or any plan or packet digest.

Explain the execution flow in wave order:

1. State the overall implementation outcome in one or two sentences.
2. For each wave, name its task IDs and titles, explain what they accomplish, and state which prior result unlocks the wave.
3. When tasks share a parallel group, group them under the same numbered stage and explain that they run independently rather than presenting them as sequential work.
4. Explain the integration task, its declared ordering or strategy, and the final cross-task verification.
5. End with baseline caveats and the manual delivery boundary, including that worktrees, merge, push, pull request, handoff, or cleanup were not performed when the plan says so.

Keep the walkthrough substantially shorter than the YAML. Do not repeat digests, complete path lists, command lists, or every contract ID unless one is necessary to understand a risk. Derive every statement from the emitted plan; do not introduce new tasks, ordering, guarantees, or authority.

Use this shape, adapting the number of stages to the actual waves:

```markdown
## 작업 단계 설명

1. **Wave 1 — 기반 준비**
   - `TASK-001`: 무엇을 준비하고 다음 wave가 왜 이 결과를 기다리는지 설명합니다.
2. **Wave 2 — 병렬 구현**
   - `TASK-002`, `TASK-003`: 서로 독립적으로 구현되는 작업을 각각 한 줄로 설명합니다.
3. **Wave 3 — 통합 및 최종 검증**
   - `INT-001`: 결과를 어떤 순서와 전략으로 통합하고 무엇을 확인하는지 설명합니다.

기존 baseline 문제와 수동으로 남겨 둔 전달 작업을 짧게 설명합니다.
```

## Blocked result

```yaml
status: BLOCKED | NEEDS_INPUT
run_id:
reason:
completed_evidence: []
task_packets_emitted: false
required_input_or_action: []
```
