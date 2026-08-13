---
name: memory-update
description: Optionally persist one completed Shape or Prepare result as an immutable Workbench Artifact through the Local Work Memory MCP. Invoke only as `$workbench:memory-update`. Use when the user explicitly asks to store a completed Workbench result or says "메모리 갱신".
---

# Memory Update

Persist exactly one user-selected completed Shape or Prepare result. This is optional artifact storage, not a workflow transition or prerequisite.

Read [references/memory-change-set.md](references/memory-change-set.md) before committing an artifact.

## Entry gate

Require all of the following:

- an explicit `$workbench:memory-update` invocation referring to one completed Shape or Prepare result;
- a complete result body with `shape_status: READY` or `plan_status: READY`;
- stable project, Work Item, run, repository, and producing snapshot identity required by the Local Work Memory MCP;
- a user-selected result whose body can be transferred without exposing unauthorized secrets or private data.

If any required identity or complete body is missing, return `BLOCKED` without writing.

## Persist the result

- Use the Local Work Memory MCP artifact commit capability to store the selected result as an immutable Workbench Artifact. Follow the MCP tool contract for identity, transfer, idempotency, staging, and result interpretation; do not duplicate those mechanics in this skill.
- Use the stable artifact folder matching the producer: `shape` for a Shape Report and `prepare` for an Execution Plan with its Task Packets.
- Do not reinterpret, redesign, merge, summarize, or repair the artifact body during persistence.
- Do not search for additional evidence, rerun repository analysis, or modify project files.
- Treat a returned Artifact reference as the persistence result. Do not turn persistence success into permission to invoke another Workbench skill.

## Output

Return the Memory Update Result from the reference with the producing skill, run identity, persistence status, and exact Local Work Memory Artifact reference when available.

Persistence is optional. Prepare accepts a complete inline Shape Report, Execute Task accepts a complete inline Execution Plan and Task Packet, and Finalize accepts complete inline workflow results regardless of whether Memory Update was used.

Do NOT modify repository files, create or mutate a Git worktree, invoke another Workbench skill, or silently continue to Prepare, Execute Task, or Finalize.

Do NOT automatically invoke another Workbench skill.
