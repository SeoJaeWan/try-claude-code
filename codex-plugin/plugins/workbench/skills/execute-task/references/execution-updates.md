# Questions and changes during execution

## Questions without a run-wide pause

Discover repository facts before asking. Ask a material user decision as soon as it is needed, using a non-blocking question tool when available, and identify affected tasks. Keep independent work running; wait only where the missing decision changes authorized behavior. With a blocking-only host, finish available independent work before yielding for the answer and explain the limitation. Silence or elapsed time is not an answer. A discovered conflict is not automatically a request for new permission when existing authority already covers its repair.

## Steering and revisions

A clear new user instruction governs the current objective within higher-priority constraints. Do not ask the user to approve the same change again. Preserve original source plans and packets as history; do not use immutability as a reason to ignore the update.

- Clarification that does not change acceptance, ownership, dependencies, or checks: send the clarification to affected workers, obtain acknowledgment, and record it against the current binding.
- A change to those material fields: hold affected queued tasks, stop or interrupt affected writers when their continued changes would conflict, and wait for acknowledgment/quiescence before replacement work. Running shell/tool operations may outlive an interrupt; confirm they have stopped before allowing another writer.
- Cancellation or scope reduction: stop affected work and descendants, preserve resulting files/commits, and keep unrelated authorized work running. A cancellation of the entire request stops the run; do not continue under the persistence rule.

After quiescence, inspect affected worktree status/diffs/HEAD. Record a new plan/binding revision containing the user instruction, predecessor revision, changed task IDs/contracts, and result-reuse decisions. Recompute changed packet binding digests. If a source plan defines a canonical revision/hash format, use it for any newly issued source plan too; never invent a source digest for a producer-neutral packet set. For all input forms, record an execution revision as YAML with `intent_revision`, `previous_revision`, `user_instruction`, task-to-binding identities/reuse decisions, and `revision_digest`. Hash its LF-normalized UTF-8 bytes with only `revision_digest` blank, then insert SHA-256. This execution record does not overwrite a supplied source plan. Unchanged packet bytes retain their original identity/digest and are referenced from the new revision. Do not relabel them as newly validated results.

Choose reuse by evidence: unchanged work may retain its verified result; affected completed work needs the necessary new checks or a repair task. Never count an old passing result as acceptance of changed requirements. Bind replacement tasks to exact available commits and assign unique branches/worktrees under the usual policy. For interrupted uncommitted work, populate the optional packet `resume_state` with `observed_head_commit`, `owned_change_digests` (path, staged/unstaged/untracked identity and content digest), `worker_id`, and `quiescence_evidence`; bind these fields into the new packet digest. Verify them immediately before resuming. Then either resume the same task/worktree under an explicit revised binding or carry an inspected patch into a fresh assigned worktree. Do not discard changes, create an unauthorized checkpoint commit, or copy unrelated files. Unknown edits/ownership require resolution; known changes from this run do not require repetitive approval merely because they are uncommitted.

Send the replacement packet or follow-up to the affected worker and require acknowledgment of the revision before dependent mutations. Recalculate dependency/resource checks and release only work whose current prerequisites exist. If steering tools are unavailable, hold affected new work and resume from a safe recorded boundary rather than pretending an instruction reached a worker.

## Reporting and completion

Record each material update with: source instruction, previous/current revision, affected tasks, stopped or acknowledged workers, reused/invalidated results, and checks to repeat. Tag each returned result with its intent revision and execution binding. Late results from superseded packets are evidence only until explicitly reconciled.

Completion applies to the latest authorized scope. Do not claim completion while a required decision, failed acceptance-critical check, or unreconciled affected result remains. Keep implementation and integration verification; no extra universal review stage is introduced. For a small one-task run, include only the applicable identity, profile, result, verification, and findings fields rather than empty revision machinery.
