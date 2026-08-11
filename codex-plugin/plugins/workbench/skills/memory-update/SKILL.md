---
name: memory-update
description: Persist one completed Shape or Prepare artifact to its canonical Local Work Memory Dev Wiki page with guarded full-body writes and return the exact persistence reference. Invoke only as `$workbench:memory-update`. Use when the user explicitly asks to store a Shape/Prepare result in Dev Wiki, says "메모리 갱신", or names this selector.
---

# Memory Update

Persist exactly one completed Workbench artifact. Do not rediscover, redesign, merge, or reinterpret it.

Read [references/memory-change-set.md](references/memory-change-set.md) before calling `memory_write`.

## Entry gate

Require all of the following:

- an explicit `$workbench:memory-update` invocation referring to one completed artifact;
- `artifact_kind: shape` with `shape_status: READY`, or `artifact_kind: prepare` with `plan_status: READY`;
- matching `run_id`, artifact ID, artifact digest, Git common dir, repository/work-item identity, and unchanged producing-stage snapshot;
- exactly one structurally complete Dev Wiki Artifact Change Set entry;
- `source_type: dev_wiki`, a stable canonical slug, and an allowed action of `create`, `update`, or `skip`;
- complete non-null `full_body` whose normalized SHA-256 equals `artifact_digest` for create/update;
- the exact opaque `expected_revision` and `source_id` captured by the producing stage for update.

If any input is missing or inconsistent, return `BLOCKED` with `ARTIFACT_UPDATE_INPUT_INVALID` without writing.

## Apply the artifact

1. Validate artifact identity, slug, action-specific fields, line-ending normalization, body digest, and secret-safety declaration before mutation.
2. Do not run `memory_search`, `memory_get`, `memory_graph`, repository research, or source research. Retrieval and body construction belonged to Shape or Prepare.
3. For `skip`, make no tool call and return `NOT_NEEDED` with the supplied canonical reference.
4. For create, omit `source_id` and call `memory_write` with `action=create`, `source_type=dev_wiki`, slug, title, and the complete body.
5. For update, call `memory_write` with `action=update`, source ID, title, complete replacement body, and the exact expected revision. Never send a patch or empty body.
6. Inspect the returned payload's `status`, `outcome`, and `source_id`; a normally returned tool call or an HTTP-success class alone is not proof of completed persistence.
7. Do not retry, merge, roll back, substitute a returned revision, or perform another mutation after a failure, conflict, timeout, disconnect, or indeterminate response.

Create/update success requires a trustworthy result with `status` in `{200, 201}`, `outcome == "indexed"`, and a non-empty returned `source_id`; return `APPLIED`/`indexed`. A validated skip returns `NOT_NEEDED`/`unchanged` without a tool call. Do not treat another `2xx`, including `202`, as completed persistence.

- A trustworthy `409` returns `RESHAPE_REQUIRED` for a Shape artifact and `REPREPARE_REQUIRED` for a Prepare artifact.
- A determinate non-409 error returns `FAILED`.
- An unsupported `2xx`, an unexpected outcome, a missing required result field, a timeout, disconnect, transport exception, or other untrustworthy payload returns `INDETERMINATE` because persistence may already have occurred.

## Output

Return the reference's Memory Update Result with artifact identity, attempted action, service evidence, and `dev_wiki_ref`. Preserve a returned source ID and source revision exactly. If the service omits a new revision, report it as `null`; never invent one.

The resulting `dev_wiki_ref` is a handoff contract. Treat `APPLIED`/`indexed` and `NOT_NEEDED`/`unchanged` as valid persisted states:

- Prepare accepts only a matching persisted Shape reference and re-reads its canonical body.
- Execute Task accepts only a matching persisted Prepare reference and binds its artifact digest to every Task Result.

Do NOT modify repository files, invoke another Workbench skill, create a worktree, or silently continue to Prepare or Execute Task.
Do NOT automatically invoke another Workbench skill.
