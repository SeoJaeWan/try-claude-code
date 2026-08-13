---
name: prepare
description: Convert a complete ready Shape Report, supplied inline or by Local Work Memory Artifact reference, into an executable task DAG, validate the clean baseline, and plan one standard Git worktree per task. Invoke only as `$workbench:prepare`. Use when the user explicitly asks to "작업을 분해해", "실행 준비해", "워크트리 계획을 확정해", or names this selector.
---

# Prepare

Perform stages 6–7 without implementing, persisting the result, or creating worktrees. Produce independently verifiable Task Packets, prove the baseline, and freeze the task-scoped Git worktree plan.

Read [references/execution-plan.md](references/execution-plan.md) before producing an Execution Plan.

## Entry gate

- Require one complete `READY` Shape Report. Accept it directly from the current task context or user input. When the user supplies a Local Work Memory Artifact reference instead, use the Local Work Memory MCP to resolve its canonical content.
- Do not require a persistence result or Artifact reference. Persistence is optional and does not change Shape authority.
- Use the Local Work Memory MCP to reference current project conventions and other relevant canonical project documents when needed. Follow the MCP tool contract rather than duplicating its usage details in this skill.
- Resolve the canonical repository root, current checkout root, Git common dir, HEAD, branch, status, and worktree list. Prepare may run read-only from primary Local or a linked worktree.
- Require the same repository identity and Shape snapshot. Recompute the content-sensitive fingerprint and return `RESHAPE_REQUIRED` on drift.
- Require a clean, stable execution base. Do not stash, reset, clean, copy, or checkpoint dirty user changes automatically.
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

Shape task notes are suggestions only. Prepare owns the final DAG, waves, paths, branches, base selectors, integration order, and worktree count. Worktree materialization belongs exclusively to Execute Task.

## Stage 7: Baseline validation

- Discover the repository's documented install, format, lint, typecheck, test, build, and development commands.
- Run only safe commands needed to establish the baseline from the current clean checkout. Do not create a worktree or install an alternative toolchain.
- Capture command, directory, exit status, duration, and concise result. Record stable identities and normalized fingerprints for pre-existing failures.
- Stop if a baseline command changes tracked files unexpectedly.
- Record ignored-file, symlink, secret, service, port, cache, and dependency-install requirements that Execute must reproduce in each task worktree.

## Output

Return one complete standalone Execution Plan and one Task Packet per task. Include immutable `base_commit`, exact task worktree count, unique branches and paths, resolvable base selectors, DAG/waves, integration tasks, baseline evidence, and documentation policy.

Set `worktree_policy: task_scoped` and `worktrees_materialized: false`. A complete `READY` plan may be passed directly to `$workbench:execute-task`, optionally persisted through `$workbench:memory-update`, revised, or left as the final result. Persistence is never an execution prerequisite.

Do NOT implement tasks, create or delete worktrees, integrate commits, call a Local Work Memory write tool, push, open a PR, or modify repository files.

Do NOT automatically invoke another Workbench skill.
