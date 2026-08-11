# Shape Report Contract

Use this contract for the stages 0–4 deliverable. The report is a Markdown document returned in the conversation unless the user explicitly requests a file.

## Native coordinator bootstrap contract

Apply this only when the calling checkout is primary Local and the user explicitly invoked `$workbench:shape`.

1. Call the Codex app's `list_projects` tool. Select exactly one Git project whose canonical local root equals the current repository root. Do not guess from repository name alone. If no exact match or multiple matches exist, return the Shape Gate Result.
2. Call `create_thread` once with the selected `projectId`, omit model and thinking overrides, and use this target:

   ```yaml
   type: project
   projectId: <exact list_projects result>
   environment:
     type: worktree
     startingState:
       type: working-tree
   ```

3. Set the initial prompt to invoke `$workbench:shape`, state that native coordinator bootstrap is complete, and reproduce only the user's task request. Exclude system/developer text, injected skill contents, tool output, credentials, and unrelated conversation history.
4. Accept either `threadId` or a queued `clientThreadId` as success. Do not send a second message, poll, wait for completion, or duplicate stages 0–4 in the Local task; `create_thread` already starts the continuation with its initial prompt.
5. Emit the Shape Bootstrap Result and the host's created-task directive when supported. The continuation task becomes user-owned and produces the Shape Report in its own conversation.

Do not use `fork_thread`: a worktree fork does not copy the active unfinished turn, so it cannot reliably carry the current Shape request. Do not use `handoff_thread`: the calling task cannot hand itself off. Do not fall back to shell Git worktree creation.

## Identity and fingerprint construction

- Create `run_id` once as `wb-<UTC YYYYMMDDTHHMMSSZ>-<HEAD first 12>-<six random lowercase hex>`. Preserve it across later Shape revisions for the same run.
- Set `shape_report_id` to `<run_id>/shape/<positive revision number>` and increment the revision every time Shape refreshes the snapshot or decisions.
- Adopt the current linked checkout as coordinator and set `coordinator_id` to the SHA-256 of the NUL-separated UTF-8 tuple `(run_id, absolute git_common_dir, absolute coordinator_root)`. Report the digest, never the tuple's sensitive contents beyond the separately listed paths.
- Compute `status_fingerprint` locally from HEAD plus the bytes of `git status --porcelain=v1 -z --untracked-files=all`, staged and unstaged binary diffs, and path+SHA-256 for every untracked regular file. Hash symlink targets rather than following them. Do not print file contents. If a special/unreadable file prevents a complete hash, mark the fingerprint `incomplete` and block Prepare readiness.

## Evidence rules

Label material statements as one of:

- `Fact / repository-fact`: directly observed in the current checkout;
- `Fact / memory-fact`: read from Local Work Memory with `memory_get`;
- `Fact / jira-fact`: read from the exact linked Jira artifact;
- `Fact / figma-fact`: inspected from the exact linked Figma artifact;
- `Fact / external-fact`: verified against a canonical official source;
- `Inference`: reasoned from cited facts;
- `Assumption`: required but not yet verified;
- `Decision`: selected approach with rationale;
- `unverified`: evidence was unavailable or ambiguous.

Local evidence uses an absolute clickable file link with one line number. External evidence uses a canonical clickable URL. Context7 is recorded as retrieval provenance; it is not the official source classification by itself.

For each external source, record:

```text
S-### title
classification: official-docs | primary-repository | context7-index | secondary
source_url:
canonical_official_url: # optional unless classification is official-docs/primary-repository
library_version:
source_version_or_ref:
version_alignment: exact | documented-compatible | mismatch | unverified | not_applicable
retrieved_via: context7 | direct
retrieved_at: <ISO-8601 UTC timestamp>
context7_library_id:
query_summary:
supports: REQ/NFR/INV/AC/DEC IDs
```

Use `not_applicable` for library-specific fields when the source is a direct official policy, standard, regulation, or other non-library primary source. Never put a secondary or Context7 index URL in `canonical_official_url`.

Do not add arbitrary source counts. Gather enough evidence to support every material decision, and avoid sources unrelated to a decision.

## Required report sections

```markdown
# Shape Report — <request>

## Status
- shape_status: READY | BLOCKED | NEEDS_INPUT
- blockers: []
- unresolved_questions: []
- run_id:
- shape_report_id:
- worktree_required: true
- generated_at:

## Run identity and base snapshot
- git_common_dir:
- coordinator_root:
- coordinator_id: <run_id + git_common_dir + coordinator_root identity>
- head_sha:
- branch:
- detached:
- staged_paths:
- unstaged_paths:
- untracked_paths:
- status_fingerprint:
- dirty_policy: clean | adopted_dirty
- primary_local_head:
- primary_local_status_paths: # repo-relative and redacted when sensitive
- local_divergence: none | unrelated | needs_input

## Request framing
- problem statement
- desired outcome
- scope
- out of scope
- constraints
- assumptions
- unresolved questions

## Stage 0 — Local Work Memory
- queries issued
- documents used: source_type, source_id, title, source_revision
- relevant prior decisions
- unresolved retrievals

## Stage 0 — Jira and Figma evidence
- Jira records: evidence ID, issue key, canonical URL, fields/comments used, observed updated_at, retrieved_at, supported REQ/NFR/INV/AC/DEC IDs
- Figma records: evidence ID, canonical URL, file key, node ID, component/token/screenshot evidence used, observed version or last_modified, retrieved_at, supported REQ/NFR/INV/AC/DEC IDs
- unavailable or authorization-blocked artifacts
- source conflicts and disposition

## Stage 0 — Repository exploration
- structure and entrypoints
- existing patterns and dependencies
- tests, build, CI, and error handling
- relevant project instructions

## Requirements
- REQ-### functional requirement
- NFR-### non-functional requirement

## Invariants
- INV-###

## Acceptance criteria
- AC-### observable outcome and failure behavior

## Research and sources
- source records and claim mapping

## Architecture decisions
### DEC-### <title>
- status
- decision
- alternatives
- evidence
- trade-offs and consequences

## Risks and open questions

## Memory Change Set

## Execution implications
- likely task boundaries
- parallel candidates only
- shared/collision surfaces
- worktree_required: true

## Next choices
```

## Memory Change Set

The Change Set is proposed by Shape and applied only by explicit `$workbench:memory-update` invocation.

Use `source_type: dev_wiki` unless the user explicitly requested `note`. A default canonical project page may use `projects/<stable-project-key>/context`; derive and record the stable key rather than relying only on a machine-specific absolute path.

An update entry contains:

```yaml
- change_id: MEM-001
  action: update
  source_type: dev_wiki | note
  source_id: <UUID from memory_get>
  title: Project context
  full_body: |
    Complete replacement Markdown for create/update.
  expected_revision: null # exact opaque memory_get value for update/delete
  reason:
  evidence_ids: []
  depends_on: []
  delete_requires_same_invocation_confirmation: true
```

Rules:

- Never include more than one mutation for the same source identity.
- Give every entry a unique `change_id`. Require every `depends_on` ID to exist in the same Change Set, reject cycles, and list entries in topological order so dependencies precede dependents.
- A create entry omits the `source_id` field entirely so the service generates it. A Dev Wiki create adds `slug`; a note create does not.
- Update carries the complete merged body, never a patch.
- Do not create an update when the current body is null or unresolved.
- Treat `source_revision` as opaque; never synthesize it.
- Mark no-op knowledge as `skip` rather than rewriting it.
- If no durable knowledge changed, emit an empty mutation list plus `memory_update_state: not_needed`; do not manufacture a rewrite.
- Deletion is exceptional and requires same-invocation confirmation of source ID, title, and revision during Memory Update; a Boolean written by Shape is not authorization.

## Visibility and secret handling

- Report repository-relative paths. Replace a path that itself reveals a secret or sensitive identifier with `<sensitive-path:sha256-prefix>`; the status fingerprint still detects drift.
- Do not reproduce credentials, tokens, private keys, customer data, or unnecessary personal data in sources, excerpts, or the Change Set.
- A create/update entry must contain the exact complete body that would be written. If that body contains material that cannot safely appear in the report, do not redact and then write the corrupted body; mark the mutation blocked and request a user-approved secure handoff mechanism.
- Quote only the minimum memory excerpt needed for human judgment; keep the full current body out of narrative sections.

## Status precedence

- `BLOCKED`: any required gate, dependency, evidence, safety, or environment condition prevents a trustworthy result. This takes precedence over questions.
- `NEEDS_INPUT`: no blocker exists, but a user decision would materially change requirements or architecture.
- `READY`: all required evidence and decisions are sufficient for the stated scope.
- Always list every blocker and unresolved question rather than hiding secondary conditions behind the top-level status.

## Handoff semantics

- Shape does not automatically apply memory or prepare execution.
- `READY` means the report can be consumed by a later explicit skill or ordinary Codex.
- Any base snapshot drift makes the report stale for Prepare.
- A 409 from Memory Update requires a refreshed Shape because the saved body/revision may be stale.

## Shape Bootstrap Result

When Shape is invoked from the primary Local checkout and native worktree-task creation succeeds or is queued, stop the Local invocation before stages 0–4 and return only:

```markdown
# Shape Bootstrap Result
- shape_status: CONTINUING_IN_WORKTREE
- worktree_required: true
- bootstrap_status: CREATED | QUEUED
- source_root:
- continuation_task_id: # threadId or clientThreadId returned by the host
- starting_state: working-tree
- required_action: None. Shape continues in the created Codex Worktree task.
```

Use the host's created-task directive when available so the continuation is visible and clickable. Do not claim that stages 0–4 ran in the Local task, and do not wait for or mirror the continuation's final report into the Local task.

## Shape Gate Result

When the current directory is not a Git repository, native Codex worktree-task creation is unavailable, the saved project cannot be resolved, creation fails, or a linked coordinator otherwise cannot be established, stop before stages 0–4 and return only:

```markdown
# Shape Gate Result
- shape_status: BLOCKED
- worktree_required: true
- reason:
- current_root:
- required_action:
```

Do not return this gate merely because the current checkout is primary Local. Attempt native coordinator bootstrap first. Never use `git worktree add` as a fallback because it does not move or rebind the calling Codex task.

If the linked-worktree gate passes but Local Work Memory is unavailable, retain the established run identity and return the partial report with `shape_status: BLOCKED`, completed repository observations, the unresolved dependency, and no execution-ready Memory Change Set.
