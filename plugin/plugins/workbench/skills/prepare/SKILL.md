---
name: prepare
description: Plan software tasks, dependencies, isolated worktrees, checks, and per-task model tiers. Explicit invocation only; use for "작업을 분해해", "실행 계획을 만들어", or "워크트리 계획을 확정해".
disable-model-invocation: true
---

# Prepare

Return an executable plan without implementing, persisting it, or creating worktrees. Keep the caller's model unchanged.

Read [execution-plan.md](references/execution-plan.md) for the packet contract and [model-selection.md](references/model-selection.md) when choosing task or research profiles.

## Procedure

1. Accept any sufficient change definition inline or through a user-provided Local Work Memory Artifact. Resolve supplied references using the MCP's current contract; do not require a particular producer.
2. Resolve repository identity, checkout, Git common dir, exact HEAD, status, and worktree inventory. Establish a clean, stable execution base without stashing, resetting, copying, or checkpointing user changes. If requested work depends on dirty changes, establish their inclusion or base with the user.
3. Read relevant local `.codocs` and repository instructions, preferring Codocs MCP verified for the planning checkout, using [codocs-knowledge.md](references/codocs-knowledge.md). Record raw-source digests, material constraints, and access evidence in self-contained packets; verify their relationship to the execution base. Use local files when no usable connection exists, or explicit instructions and code evidence for absent knowledge. Keep supplied Wiki Artifacts as task inputs. Do NOT query Jira or canonical Wikis for project rules.
4. Delegate independent ownership/collision or prerequisite/risk investigations when useful, selecting explicit helper profiles. The main agent reconciles findings and owns the final plan. Ask undiscoverable material questions early while continuing independent planning; do not declare affected tasks ready without the answer.
5. Define independently verifiable tasks, dependencies, owned/forbidden paths, indirect collisions, runtime resources, checks, immutable base selectors, and unique worktree/branch assignments. Record the intended local PR source/head integration target, durable checkpoint, and safe task-worktree cleanup with push disabled; preserve explicit no-integration/no-cleanup intent. Keep a small change as one task; add integration only when separate results need combining or cross-task verification.
6. Select and explain each task's tier and effort. Parallelize work whose required contracts/artifacts are already available and whose write surfaces/resources are isolated. Waves explain the DAG; they are not whole-run scheduling barriers.
7. Run only safe commands needed for the baseline. Record pre-existing failures, validate packets and digests, then return the immutable plan and append a concise human-readable walkthrough including task profiles and their reasons. Stop after planning.

Do NOT implement, create/delete worktrees, integrate commits, persist the plan, modify repository files, push, or publish. A plan describes actions and does not itself grant commit or external-action authority.
