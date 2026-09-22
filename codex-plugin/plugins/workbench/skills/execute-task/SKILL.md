---
name: execute-task
description: Execute software plans or bounded objectives with per-task worker profiles and isolated Git worktrees. Invoke only as `$workbench:execute-task` for "계획을 실행해", "작업을 구현해", or "task를 실행해".
---

# Execute Task

Coordinate execution while keeping the coordinator checkout read-only. Keep the caller's model unchanged; pass explicit per-task model and effort settings to workers.

Read [task-execution.md](references/task-execution.md) for identity, normalization, scheduling, worktrees, and results, and [worker-profiles.md](references/worker-profiles.md) before spawning. Read [execution-updates.md](references/execution-updates.md) when a question, changed instruction, cancellation, or interrupted worker requires it.

## Procedure

1. Accept a sufficient plan, packet set, or bounded objective. Resolve user-provided Artifact references using the Local Work Memory MCP's current contract. Do not require a particular producer or exact source field vocabulary.
2. Preserve source inputs and normalize self-contained runtime packets with exact repository/base identity, ownership, dependencies, checks, and execution profiles. Read relevant `.codocs` rules and carry source paths/content digests and constraints in implementation notes. Supplied Wiki Artifacts remain task inputs; do NOT query canonical Wikis or Jira for project rules.
3. Keep the coordinator read-only. It may inspect evidence and schedule but must not create worktrees, edit, stage, or commit.
4. Start each runnable task up to capacity using its explicit model and effort, a fresh context, and its complete packet. Preflight unsupported settings per task; continue independent supported tasks. Schedule by dependencies and isolated resources, not a global wave barrier.
5. Each worker owns one packet and its standard Git worktree. It implements authorized changes, attempts in-scope repairs, performs meaningful planned checks and self-review, and returns a verified commit or clearly labeled provisional candidate with findings.
6. Validate result identity, source/binding digests, exact commits, current intent revision, verification, continuation evidence, and worktree state. Continue from verified results or exact provisional candidates with `continuation: ALLOWED` when their material prerequisites suffice.
7. Ask material questions when discovered and keep independent work running. Apply clear user steering to affected workers and issue traceable revisions; preserve unaffected results and never treat silence as a required decision.
8. Exhaust safely runnable work, then report implementation, verification, profiles, revisions, remaining findings, and required actions in one Execution Result.

Keep task checks, self-review, integration checks, and verified/provisional distinctions. Do NOT add a mandatory independent review, blanket load/failure testing, or an extra approval/report gate. Add special checks or review only when requested or justified by the actual change.

Do NOT implement in the coordinator, overwrite source plans, invent product decisions, edit the user's original checkout, share write ownership, silently substitute a planned profile, represent provisional results as verified, push, publish, open a PR, merge into a user branch, or delete worktrees/branches.
