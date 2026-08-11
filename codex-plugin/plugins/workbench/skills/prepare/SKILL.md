---
name: prepare
description: Convert a persisted ready Shape artifact into an executable task DAG, validate the clean baseline, plan one standard Git worktree per task, and propose the canonical Dev Wiki Prepare artifact. Invoke only as `$workbench:prepare`. Use when the user explicitly asks to "작업을 분해해", "실행 준비해", "워크트리 계획을 확정해", or names this selector.
---

# Prepare

Perform stages 6–7 without implementing or creating worktrees. Produce independently verifiable task packets, prove the baseline, and freeze the task-scoped Git worktree plan.

Read [references/execution-plan.md](references/execution-plan.md) before producing an Execution Plan.

## Entry gate

- Require a completed Shape Report with `shape_status: READY` and one Memory Update Result with `status: APPLIED` or `NOT_NEEDED` whose `artifact_kind`, `artifact_id`, and `artifact_digest` match that Shape.
- Use `memory_get` on the returned Shape `source_id`. Verify the canonical body, work item identity, run identity, and normalized body digest before planning. A search excerpt or Memory Update claim without the canonical body is insufficient.
- Resolve the canonical repository root, current checkout root, Git common dir, HEAD, branch, status, and worktree list. Prepare may run read-only from primary Local or a linked worktree.
- Require the same Git common dir and Shape snapshot. Recompute the content-sensitive fingerprint. Return `RESHAPE_REQUIRED` on drift.
- Require a clean, stable execution base. Do not stash, reset, clean, copy, or checkpoint dirty user changes automatically.
- Retrieve any existing canonical Prepare artifact for this work item with `memory_search` followed by `memory_get` so an update can carry the exact opaque revision and complete replacement body.
- Respect target-repository Git instructions. If they prohibit task branches, task-local commits, or standard Git worktrees, report the conflict instead of falling back to in-place execution.

## Stage 6: Task breakdown

1. Turn acceptance criteria and architecture decisions into small, independently testable tasks.
2. Build an explicit dependency DAG and execution waves.
3. For every task embed the relevant requirement, acceptance, invariant, and decision text. Define kind, inputs, owned and forbidden paths, shared-surface access, runtime allocations, checks, completion criteria, commit policy, and the exact task-scoped worktree path and branch.
4. Detect indirect collision surfaces including lockfiles, migrations, generated clients/indexes, barrel exports, snapshots, fixtures, shared types, ports, databases, queues, and external test accounts.
5. Allow parallel tasks only when they share the same immutable base, have no dependency path, do not overlap direct or indirect write surfaces, and have isolated runtime resources.
6. Choose `serial_task_worktrees` or `parallel_task_worktrees`. Every implementation and integration Task Packet gets one unique path and one unique `codex/<run-id>/<task-id>` branch. Do not reserve or reuse a coordinator worktree.
7. Add `kind: integration` tasks after every parallel implementation wave and a final integration-seal task for every plan. Integration also runs through `$workbench:execute-task` in its own worktree.
8. Validate unique IDs, acyclicity, dependency existence, same-wave non-reachability, worker-to-integration edges, branch validity and vacancy, ref availability, path containment and vacancy, and one-worktree-per-task uniqueness.

Shape's task notes are suggestions only. Prepare owns the final DAG, waves, paths, branches, base selectors, integration order, and worktree count. Worktree materialization belongs exclusively to Execute Task.

## Stage 7: Baseline validation

- Discover the repository's documented install, format, lint, typecheck, test, build, and development commands.
- Run only safe commands needed to establish the baseline from the current clean checkout. Do not create a worktree or install an alternative toolchain.
- Capture command, directory, exit status, duration, and concise result. Record stable identities and normalized fingerprints for pre-existing failures.
- Stop if a baseline command changes tracked files unexpectedly.
- Record ignored-file, symlink, secret, service, port, cache, and dependency-install requirements that Execute must reproduce in each task worktree.

## Draft the Prepare artifact

- Freeze the Execution Plan and Task Packets as immutable artifacts with the reference's digest rules.
- Draft one canonical Dev Wiki Prepare artifact containing the Shape reference, base commit, task DAG, task packets, execution rationale, baseline evidence, worktree plan, verification policy, and delivery boundaries.
- Produce exactly one Dev Wiki Artifact Change Set entry. Do not call `memory_write` during Prepare.

## Output

Return one Execution Plan, one Task Packet per task, and one proposed Dev Wiki Artifact Change Set. Include immutable `base_commit`, exact task worktree count, unique branches and paths, resolvable base selectors, DAG/waves, integration tasks, baseline evidence, and documentation policy.

Set `worktree_policy: task_scoped`, `worktrees_materialized: false`, and `dev_wiki_artifact_state: proposed`. A plan is not executable until an explicit `$workbench:memory-update` persists the matching Prepare artifact.

Do NOT implement tasks, create or delete worktrees, integrate commits, write memory, invoke another Workbench skill, push, open a PR, or modify repository files.
Do NOT automatically invoke another Workbench skill.
