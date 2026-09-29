---
name: execute-task
description: Execute software tasks in isolated worktrees, integrate verified results into the local PR source branch, and safely clean task worktrees without pushing. Explicit invocation only; use for "계획을 실행해", "작업을 구현해", or "task를 실행해".
disable-model-invocation: true
---

# Execute Task

Coordinate execution while keeping the coordinator checkout read-only. Keep the caller's model unchanged; pass each task's resolved model, and effort where the host supports it, to workers.

Read [task-execution.md](references/task-execution.md) for identity, normalization, scheduling, worktrees, and results, and [worker-profiles.md](references/worker-profiles.md) before spawning. Read [review-delivery.md](references/review-delivery.md) for local PR-head integration, durable checkpoints, and safe cleanup. Read [execution-updates.md](references/execution-updates.md) when a question, changed instruction, cancellation, or interrupted worker requires it.

## Procedure

1. Accept a sufficient plan, packet set, or bounded objective. Resolve user-provided Artifact references using the Local Work Memory MCP's current contract. Do not require a particular producer or exact source field vocabulary. Resolve the local PR source/head target and integration authority early; continue independent implementation if delivery information is missing. Honor explicit no-integration and no-cleanup instructions.
2. Preserve source inputs and normalize self-contained runtime packets with exact repository/base identity, ownership, dependencies, checks, and execution profiles. Read relevant `.codocs` rules using [codocs-access.md](references/codocs-access.md), preferring MCP verified for the inspected checkout. Carry raw-source digests, constraints, and access evidence in implementation notes. Supplied Wiki Artifacts remain task inputs; do NOT query canonical Wikis or Jira for project rules.
3. Keep the coordinator read-only. It may inspect evidence and schedule but must not create worktrees, edit, stage, commit, integrate, or remove worktrees.
4. Start each runnable task up to capacity using its resolved profile, a fresh context, and its complete packet. Preflight unsupported settings per task; continue independent supported tasks. Schedule by dependencies and isolated resources, not a global wave barrier.
5. Each worker owns one packet and its standard Git worktree. It rechecks Codocs binding and knowledge at that task base, using local files when no usable connection exists. Only the assigned worker may make authorized `.codocs` changes within owned/shared paths. It implements, attempts in-scope repairs, performs meaningful planned checks and self-review, and returns a verified commit or clearly labeled provisional candidate with findings.
6. Validate result identity, source/binding digests, exact commits, current intent revision, verification, continuation evidence, and worktree state. Continue from verified results or exact provisional candidates with `continuation: ALLOWED` when their material prerequisites suffice.
7. Ask material questions when discovered and keep independent work running. Apply clear user steering to affected workers and issue traceable revisions; preserve unaffected results and never treat silence as a required decision.
8. Exhaust safely runnable work. Have a worker integrate the verified final result into the confirmed local PR source branch, verify that head, save a durable checkpoint outside removable worktrees, and safely clean eligible task-owned worktrees. Report preservation or cleanup failures accurately. Keep the coordinator read-only and remote push `NOT_REQUESTED`.
9. Return the Execution Result and yield. Subsequent fixes use the update protocol and fresh local branch/checkpoint evidence; repeat affected verification, local integration, and safe cleanup. Do NOT schedule a reminder/automation, poll reviews, or keep a sleep/wait loop alive.

Keep task checks, self-review, integration checks, and verified/provisional distinctions. Do NOT add a mandatory independent review, blanket load/failure testing, or an extra approval/report gate. Add special checks or review only when requested or justified by the actual change.

Do NOT implement in the coordinator, overwrite source plans, invent product decisions, share write ownership, silently substitute a planned profile, or represent provisional results as verified. Do NOT push, merge the PR into its base branch, create a PR, deploy, delete branches, or force-remove worktrees. Local source-checkout integration is allowed only under the clean, idle, authorized exception in the delivery contract; preserve all other user checkouts.
