---
name: memory-update
description: Persist one user-selected completed work artifact through the Local Work Memory MCP without changing its meaning. Invoke only as `$workbench:memory-update`; use when the user explicitly asks to store a report, plan, task result, final report, or other completed artifact, including "메모리 갱신" requests.
---

# Memory Update

Persist exactly one completed artifact. Storage is an optional side effect, not approval or permission for additional work.

Read [references/memory-change-set.md](references/memory-change-set.md) before writing.

## Procedure

1. Require an explicit user-selected complete artifact body and stable project, Work Item, repository, and producing snapshot identity.
2. Accept any completed artifact kind supported by the Local Work Memory MCP. Do not require a particular producer.
3. Reject incomplete summaries, metadata-only inputs, identity mismatches, or content that cannot be transferred without unauthorized secrets or private data.
4. Use the MCP artifact commit capability and its schema for artifact kinds, folders, identity, transfer, idempotency, and result interpretation. Do not invent unsupported paths or references.
5. Transfer the body without reinterpretation, redesign, merging, summarization, or meaning-changing redaction.
6. Return the exact persistence result and stop.

Do NOT search for additional evidence, rerun repository analysis, modify project files, mutate a Git worktree, continue the stored workflow, or perform work outside this persistence request.
