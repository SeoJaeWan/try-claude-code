---
name: prepare
description: Convert a ready Shape Report into an executable task DAG, validate the baseline environment, and lock the coordinator/worker worktree topology. Invoke only as `$workbench:prepare`. Use when the user explicitly asks to "작업을 분해해", "실행 준비해", "워크트리 계획을 확정해", or names this selector.
---

# Prepare

Perform stages 6–7: create independently verifiable task packets and prove that the planned execution environment has a trustworthy baseline.

Read [references/execution-plan.md](references/execution-plan.md) before producing an Execution Plan.

## Entry gate

- Require a completed Shape Report whose status is ready and whose run identity matches the current linked coordinator worktree.
- Recheck HEAD and the staged/unstaged/untracked fingerprint. If it differs from Shape, return `RESHAPE_REQUIRED`.
- Require a clean, stable execution base. Do NOT stash, reset, clean, copy, or checkpoint dirty user changes automatically. Ask the user to restart from a clean coordinator or explicitly checkpoint, then reshape.
- Respect target-repository Git instructions. If they prohibit the required worktree or commit behavior, report the conflict; do not fall back to in-place execution.
- Record Memory Update state as `applied`, `skipped`, or `not_needed`. Do not call it automatically.

## Stage 6: Task breakdown

1. Turn acceptance criteria and architecture decisions into small, independently testable tasks.
2. Build an explicit dependency DAG and execution waves.
3. For every task, embed the relevant functional requirement, non-functional requirement, acceptance, invariant, and decision text, then define kind, inputs, owned paths, forbidden paths, access modes for shared surfaces, concrete runtime allocations, focused checks, completion criteria, and exact commit policy.
4. Detect indirect collision surfaces: lockfiles, migrations, generated clients/indexes, barrel exports, snapshots, fixtures, shared types, ports, databases, queues, and external test accounts.
5. Allow parallel tasks only when they share the same immutable base, have no dependency edge, do not overlap direct or indirect write surfaces, and have isolated runtime resources.
6. Choose the exact topology here:
   - `coordinator_only`: one linked coordinator worktree, serial tasks;
   - `coordinator_plus_workers`: one coordinator plus the exact worker worktrees needed by each parallel wave.
   This is the plan's exact single-or-parallel topology decision.
7. Add `kind: integration` tasks to the same DAG after every worker wave, and always add a final integration-seal task even for `coordinator_only`. The seal verifies the coordinator's combined serial result and emits `integrated_head_sha`. Integration uses `$workbench:execute-task`; there is no sixth skill.
8. Validate unique task IDs, acyclicity, dependency existence, same-wave non-reachability, complete worker-to-integration edges, branch-name validity, ref availability, assigned-path containment/vacancy, and that planned branches are not checked out elsewhere.

Shape's parallel notes are suggestions only. Prepare owns the final worker count, assignment, branch names, base selectors, and integration order. Workbench v2 uses `worker_reuse_policy: none`: every worker task gets a unique path/branch, including across waves. In `coordinator_plus_workers`, reserve the coordinator for integration; all tasks in a parallel implementation wave use workers.

## Stage 7: Baseline validation

- Discover the repository's documented install, format, lint, typecheck, test, build, and development commands.
- Validate only safe commands needed to establish the baseline, then run the broadest relevant checks practical for the scope.
- Use frozen/immutable dependency installation where supported. Share download caches only; do not symlink worktree-local dependencies or build caches.
- Capture command, directory, exit status, duration, and a concise result. For every pre-existing failure, record a stable failure ID, test identity, normalized error fingerprint, observed count, acceptance-critical flag, and `no_new_failures` comparison policy. Distinguish passing checks, pre-existing failures, unavailable checks, and checks intentionally not run.
- If a baseline command changes tracked files unexpectedly, stop and report the diff.
- Record ignored-file, symlink, secret, service, port, and `.worktreeinclude` requirements for each worker.

## Output

Return one Execution Plan and one Task Packet per task using the reference schema. It must include an immutable initial `base_commit`, exact coordinator/worker count, planned worktree paths and unique branches, resolvable base selectors for later waves, DAG/waves, integration tasks, baseline evidence, and repository documentation policy.

Do NOT implement tasks, integrate commits, write memory, invoke another Workbench skill, push, open a PR, or delete worktrees.
Do NOT automatically invoke another Workbench skill.
