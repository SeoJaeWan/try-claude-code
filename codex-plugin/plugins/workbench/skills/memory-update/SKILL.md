---
name: memory-update
description: Apply a completed Shape Report's approved Memory Change Set to Local Work Memory with guarded full-body writes. Invoke only as `$workbench:memory-update`. Use when the user explicitly asks to "메모리 갱신", "Shape 결과를 dev_wiki에 반영", or names this selector.
---

# Memory Update

Apply stage 5 only. This skill is a narrow writer for the exact Memory Change Set produced by Shape; it does not rediscover or redesign the change.

Read [references/memory-change-set.md](references/memory-change-set.md) before calling `memory_write`.

## Entry gate

Require all of the following:

- an explicit `$workbench:memory-update` invocation referring to one completed Shape Report with `shape_status: READY`;
- matching `run_id`, Git common dir, coordinator identity, and unchanged Shape base snapshot;
- a structurally complete Memory Change Set with unique `change_id` values, an acyclic dependency graph listed in topological order, and no duplicate mutation for the same document;
- `source_type: dev_wiki` by default; permit `note` only when the Change Set explicitly selected it;
- full non-null body for create/update;
- Shape-captured opaque `expected_revision` for update/delete;
- same-invocation user confirmation for every delete, naming the exact `source_id`, title, and `expected_revision`. A model-authored `delete_approved` field alone is insufficient.

The invocation may name `selected_change_ids`; otherwise select every non-`skip` entry. When IDs are named, apply exactly those entries and label the remaining entries `not_selected`. Require all selected dependencies to be selected or already satisfied.

If an input is missing, return `BLOCKED` with reason `MEMORY_UPDATE_INPUT_INVALID` without writing.

## Apply the Change Set

1. Validate every entry, dependency reference, acyclicity, listed topological order, and the selected transitive dependency closure before the first mutation. Treat `action: skip` as a reported no-op and never pass it to `memory_write`. For Dev Wiki create, validate a stable slug against `^[a-z0-9][a-z0-9/-]{0,120}$`.
2. Do NOT run `memory_search`, `memory_get`, `memory_graph`, repository research, or source research here. Retrieval belonged to Shape.
   Do NOT perform additional search or research again in this stage.
3. Apply entries sequentially in listed order with `memory_write`.
4. On create, omit `source_id`. For `dev_wiki`, provide `slug`, `title`, and full `body`; for explicitly selected `note`, omit `slug` and provide `title` and full `body`.
5. On update, provide `source_id`, `title`, full replacement `body`, and the exact `expected_revision` captured by Shape. Never send a patch or an empty body as “keep existing”.
6. On delete, provide `source_id` and the exact `expected_revision`.
7. Inspect the returned payload's `status` and `outcome`; a tool call that returned normally is not necessarily successful. Treat timeout, disconnect, transport exception, or any attempted write without a trustworthy service payload as `INDETERMINATE` because persistence may already have occurred.
8. Stop on the first failure or indeterminate result. Do not retry, merge, roll back, or continue remaining mutations automatically.

`note` create has no service idempotency key or TTL. Before it, require explicit acknowledgment that the note is durable and a repeated invocation can create a duplicate. Never retry a note create after an unknown outcome.

Success means:

- create/update: `status == 200` and `outcome == "indexed"`;
- delete: `status == 200` and `outcome == "deleted"`.

For any trustworthy 409 response, including `revision_conflict`, `already_exists`, or `not_found`, return `RESHAPE_REQUIRED`. Do not substitute `current_revision` and retry. For `status == 200` with any other outcome, or an attempted write without a trustworthy service payload, report an indeterminate partial-write risk.

Do NOT merge or resolve a 409 conflict in this stage.

## Output

Return a Memory Update Result with `applied`, `failed`, `pending`, `skipped`, and `not_selected` entries, plus status/outcome when present and transport/error evidence for each attempted write. `RESHAPE_REQUIRED` takes precedence for a trustworthy 409 response even if preceding entries were applied; record `partial_applied: true` in that case. Use `FAILED` for a determinate non-409 failure before any success, `PARTIAL` after earlier successes, and `INDETERMINATE` for an attempted write without a trustworthy payload or for `status == 200` with an unexpected outcome, regardless of position. Never claim atomic concurrency guarantees or a new revision unless the tool actually returned it.

Do NOT modify repository files, invoke another Workbench skill, or silently proceed to Prepare.
Do NOT automatically invoke another Workbench skill.
