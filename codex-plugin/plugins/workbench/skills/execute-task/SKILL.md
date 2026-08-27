---
name: execute-task
description: Coordinate a complete software task plan through parallel GPT-5.6 Sol/high worker agents, each operating in its own standard Git worktree, while exhausting safely runnable work and reporting implementation-time findings. Invoke only as `$workbench:execute-task`; use when the user asks to execute a prepared plan, a set of task packets, or one bounded implementation objective.
---

# Execute Task

Coordinate an executable task plan without modifying files in the coordinator checkout.

Read [references/task-execution.md](references/task-execution.md) before spawning workers or creating worktrees.

## Procedure

1. Accept any sufficiently specified execution plan, task-packet set, or bounded standalone objective. Resolve a user-provided Local Work Memory Artifact reference through the MCP contract exposed at invocation time. Do not require a particular producer or exact source field vocabulary.
2. Preserve and validate the source input, then normalize its material intent into strict self-contained runtime packets. Inherit plan-level identity where appropriate, map equivalent semantic fields, derive only mechanical runtime values that repository evidence determines, and record an immutable execution binding.
3. Keep the coordinator read-only. It may inspect Git and repository evidence but must not create worktrees, edit files, stage changes, or commit.
4. Determine runnable tasks from the dependency DAG. Parallelize only packets whose write surfaces and runtime resources are isolated.
5. Spawn one worker per runnable task with no conversation history, the complete normalized runtime packet, model `gpt-5.6-sol`, and reasoning effort `high`. Do not silently fall back to another model or effort.
6. Each worker executes exactly one packet to the maximum safe extent in its assigned standard Git worktree, attempts in-scope repairs, verifies every meaningful planned check, and returns either a verified result commit or a clearly labeled provisional candidate when authorized work is usable but verification still has findings.
7. Validate returned task identity, source packet digest when supplied, execution binding digest, base and commit IDs, implementation and verification states, continuation decision, evidence, and clean worktree. Treat an implementation-time conflict or failed check as a finding rather than an automatic run-wide stop.
8. Continue independent tasks and descendants whose material prerequisites are available through an exact verified result or an exact provisional candidate with `continuation: ALLOWED`. Resolve later selectors from that immutable commit and run integration packets through the same Sol/high worker contract.
9. Stop only affected descendants whose prerequisites are materially unavailable. Exhaust every other safely runnable packet before asking for input or returning.
10. Return one complete Execution Result that distinguishes verified results from provisional candidates and reports planned assumptions, observed conflicts, attempted repairs, unresolved findings, and actions required before delivery.

Do NOT implement directly in the coordinator, modify the source plan to fit the runtime schema, invent missing product decisions, modify the user's original checkout, reuse a worktree across tasks, weaken the requested worker model, represent a provisional candidate as verified, push, publish, open a PR, merge into a user branch, delete worktrees or branches, or perform work outside the normalized execution intent.
