# Task Plan Execution Contract

## Accepted input

Accept exactly one of:

- `execution_plan`: a plan with enough repository identity, intent, acceptance, ownership, dependency, and verification material to normalize its tasks;
- `task_packet_set`: one or more bounded packets whose explicit or inferable dependencies can be normalized;
- `standalone`: one bounded objective whose missing mechanical execution details can be discovered from the current repository.

Compatibility is semantic rather than producer- or field-name-specific. Accept equivalent representations such as plan-level repository identity inherited by tasks and `acceptance_contract` used as observable acceptance conditions. Do not require a source to duplicate plan-level values into every task.

Reject metadata-only or insufficient inputs, stale immutable identities, supplied digest mismatches, and moving branch names used in place of commit IDs after binding. For material ambiguity in objective, ownership, or product decisions, ask promptly and hold affected tasks while continuing independently specified work; do not invent decisions. Missing mechanical values such as a unique branch, worktree path, exact repository command, or runtime resource name may be derived only when repository evidence determines them without changing product intent.

For a standalone objective, normalize one task when sufficient; split only when independent deliverables and verification justify it. Create integration tasks only when separate results need combining or cross-task verification. Do not implement in the coordinator.

## Project knowledge

Use local `.codocs` concepts, architecture, policies, conventions, and contracts as the implementation basis. Resolve supplied Wiki Artifact references as read-only task inputs under the provider’s current contract; do not query canonical Wikis or Jira for project rules. During normalization, carry relevant document paths, content digests, and constraints in `implementation_notes` so workers do not depend on conversation history.

Each worker rereads relevant `.codocs` from its own exact task base before implementation. If these differ materially from the packet’s evidence or conflict with approved intent, report the conflict and resolve only what is within the packet’s authority; do not silently change the immutable plan. If `.codocs` is absent, report the gap and use explicit repository instructions and code evidence, asking only for missing material policy. Do not create a knowledge store or fetch Wiki rules as a fallback.

When `.codocs` changes are required by project policy, they must fit the packet’s owned or declared shared paths. Include their navigation/reference surfaces in collision checks; report missing ownership instead of widening the write surface. Do not write Wiki knowledge or persist work artifacts as implementation documentation.

## Coordinator boundary

The coordinator owns scheduling and evidence only.

The caller selects the coordinator model; loading the skill does not switch it or create a replacement coordinator. Record the actual coordinator model and effort when exposed by the host, otherwise `unknown`. Worker settings are selected per packet, not inherited from this coordinator.

- Resolve repository identity, Git common dir, invocation root, exact base commit ID, current worktree inventory, and every task dependency.
- Preserve source bytes and verify plan and packet digests when provided. A producer-neutral input without a supplied digest receives an execution binding rather than a fabricated source digest.
- Treat `base_commit` as the exact Git commit from which a task starts. Do not substitute a moving branch name after binding.
- Normalize compatible source material into the runtime packet contract below. Record every inherited value, semantic mapping, and mechanically derived value in the execution binding.
- Allocate unique branches and worktree paths when they are absent and can be derived safely. Allocation does not create or adopt the worktree.
- Inspect only what is needed to validate scheduling and returned results.
- Do not create or adopt worktrees, install dependencies, run implementation commands, edit files, stage, or commit.
- Do not require a particular plan producer, source schema, or field vocabulary.

## Worker runtime

Read [worker-profiles.md](worker-profiles.md) before dispatch. Pass both selected model and effort explicitly with a fresh context and the complete normalized packet. Validate current host capabilities, preserve user limits, and block only affected tasks when a specified profile is unsupported. Do not silently inherit or substitute. Available agent capacity bounds concurrency; queue excess work.

## Normalization and execution binding

Keep the source plan or packet immutable. Normalize only after validating its available identity and digest evidence.

- Inherit `repository_id`, `git_common_dir`, exact base identity, environment, and delivery policy from plan-level fields when task-local copies are absent.
- Map requirement statements to `requirements`, acceptance statements such as `acceptance_conditions` or `acceptance_contract` to `acceptance_conditions`, invariants to `invariants`, and governing decisions to `decisions`. Preserve source IDs for traceability when present. A proposed or unresolved decision is not governing unless the source or user has accepted it; ask when it materially affects implementation and hold only the affected work.
- Preserve explicit dependencies, selectors, ownership, forbidden paths, runtime isolation, checks, commit authority, and supplied execution profiles. Select a missing profile using the worker-profile criteria and record it as a runtime selection rather than fabricating a source choice. Do not weaken a prohibition during normalization.
- Derive a branch, assigned worktree, runtime resource label, or repository verification command only when the derivation is deterministic and does not invent product behavior.
- Ask when objective, observable acceptance, ownership, a material dependency, or a product decision remains ambiguous; hold affected tasks and continue independent work. Return `NEEDS_INPUT` when no remaining safe work can proceed without that decision. Return `BLOCKED` for affected work whose exact repository or base identity cannot be established safely.

Set the initial `intent_revision` from a supplied revision identity, or derive `<run-id>/intent/1` for input without one.

Serialize each normalized runtime packet as standalone immutable YAML without anchors, aliases, or merge keys; required content must not depend on another packet's YAML context. Set `execution_binding_digest` to an empty string while hashing its normalized LF UTF-8 bytes with SHA-256, then insert the resulting digest. `task_packet_digest` preserves a supplied source packet digest and is `null` when none exists. The binding digest identifies the exact packet given to the worker; it does not replace or rewrite a source digest.

## Minimum normalized runtime packet

```yaml
task_id:
run_id:
intent_revision:
kind: implementation | integration
title:
objective:
execution_profile:
  model: # selected supported model ID
  reasoning_effort: # selected supported effort
  rationale:
  escalation: none
repository_id:
git_common_dir:
base_selector:
  kind: exact_commit | task_result | integration_result
  value:
depends_on: []
assigned_worktree:
branch:
requirements: []
acceptance_conditions: []
invariants: []
decisions: []
source_contract_ids: []
owned_paths: []
forbidden_paths: []
shared_surfaces: []
runtime_resources: []
implementation_notes: []
focused_checks: []
broader_checks: []
verification_commands: []
commit_policy: task_local_required | no_commit_needed
task_packet_digest: null
execution_binding_digest:
resume_state: null # optional observed_head_commit, owned_change_digests, worker_id, quiescence_evidence
```

An integration packet also declares required task IDs, integration order, strategy, cross-task checks, dependency-imported paths, separately owned integration-edit paths, and the expected `integrated_head_sha` output. Validate imports and repairs against forbidden paths; do not treat integration as unrestricted write authority. The coordinator binds each required task ID to an exact verified result commit or an exact provisional candidate at runtime.

## Execution principle

Preserve each approved plan revision as an immutable record of intent. A later explicit user instruction may supersede it through the [update protocol](execution-updates.md); immutability does not override user steering. Treat implementation-time conflicts, failed checks, and inaccurate planning assumptions as execution findings, not automatic reasons to replace the plan or stop the run.

- Attempt the smallest repair that remains inside the packet's objective, contracts, owned or declared shared surfaces, and authority.
- When a finding remains, finish every later implementation step and check that is still safe, executable, and meaningful.
- Create a provisional candidate commit when authorized implementation is structurally usable by downstream work even though verification has not passed.
- Continue downstream work from a provisional candidate only when the worker explicitly returns `continuation: ALLOWED` with evidence that the required material interface exists.
- Never treat continuation as acceptance. Only passing verification produces a verified result, and only passing final integration checks produces a final integration commit.
- Ask material questions as soon as discovered, without ending independent work. Exhaust all independent and materially runnable work before the final `NEEDS_INPUT`, `ACTION_REQUIRED`, or `BLOCKED` result, unless the user cancels or pauses.

## Scheduling

1. Mark a task runnable when each dependency provides an exact verified result or allowed provisional candidate, all needed contracts/artifacts exist, and the result remains applicable to the current intent revision. Waves do not impose extra barriers.
2. Tasks may run in parallel only when they have no dependency path, use the same resolved base commit where required, have disjoint direct and indirect write surfaces, and isolate ports, databases, queues, accounts, fixtures, formatters, generators, and build outputs.
3. Spawn one worker per runnable task with its explicit execution profile up to capacity. Queue the rest. API/type relationships are not a barrier once their exact prerequisites exist and sibling writes/resources are isolated.
4. Process completions, material questions, and user updates as they arrive. Validate terminal Task Results before releasing descendants; do not wait for unrelated tasks. Apply the update protocol before accepting results from affected workers.
5. Continue independent branches after any unrelated finding or blocker. Continue dependent branches from usable provisional candidates and record that scheduling decision.
6. Stop only the affected descendants when `continuation: NOT_POSSIBLE`, no exact commit exists, or the required material interface is absent. A failed check alone is not a scheduling barrier.
7. Resolve selectors only from exact immutable commits. Prefer a verified result; otherwise use an explicitly allowed provisional candidate without changing the original plan or packet digest.
8. Run each materially runnable integration packet in its declared order. Carry unresolved findings into integration so it can expose or mechanically repair cross-task incompatibilities.
9. Do not stop unrelated execution solely for a conflict. Ask necessary decisions promptly, continue independent work, and consolidate findings and revision history in the Execution Result.

## Worker procedure

Each worker performs exactly one packet:

1. Re-resolve the Git common dir and exact base commit ID from the normalized runtime packet, and verify its execution binding digest plus any supplied source packet digest.
2. Validate the assigned path as a unique direct child of a dedicated parent outside the repository, Git metadata, home configuration, and system paths, with no `..` or symlink component.
3. For a new worktree, require the assigned path and branch to be absent and the branch name valid; create the equivalent of `git worktree add -b <branch> <worktree> <base-commit>`. An existing path/branch follows the adoption or resume check below instead; do not recreate or rewind it.
4. Adopt an existing clean path only when its path, common dir, branch, task identity, and HEAD match the packet; no other task may own that worktree. For an interrupted same-task resume, follow the update protocol: prove ownership of known run-produced edits and bind the resumed state explicitly. Unknown or unrelated dirty changes require user resolution; do not silently adopt them.
5. Run all task commands and mutations only inside the assigned worktree. Read its relevant `.codocs` and reconcile the packet evidence according to the project-knowledge rules above before implementing.
6. Implement the smallest change satisfying the packet. When implementation exposes a conflict or failed assumption, attempt the smallest repair inside the same objective and authorized surfaces. Compare staged and unstaged changes with owned and declared shared/generated surfaces; stop mutation on unexplained files without deleting or absorbing them.
7. Run focused checks before relevant broader checks. Reuse evidence only for the same relevant code state and valid environment; changes to the checked surface invalidate it. After a failure, continue meaningful independent checks and record commands, duration, result, and evidence. Do not add blanket load testing or mandatory separate review to routine changes.
8. Inspect the final diff and perform a correctness, security, failure-handling, scope, and verification self-review. Classify every finding as `resolved_in_task`, `carried_to_integration`, `action_required`, or `hard_blocker`.
9. Stage only authorized paths and inspect the staged patch. For `task_local_required`, create at most one task-authored result commit in addition to dependency commits applied by a declared integration strategy: a `verified_result` when verification passes, or a `provisional_candidate` when the implementation is structurally usable but findings remain. Require a clean worktree after either commit and never label the provisional commit as verified.
10. Set `continuation: ALLOWED` only when an exact commit exists and downstream work can consume the required material interface without inventing a product decision or expanding authority. Otherwise set `continuation: NOT_POSSIBLE` and state the missing prerequisite.
11. Preserve any unsuccessful uncommitted worktree as diagnostic evidence. Cleanup is a separate explicit user action.

For integration packets, consume the coordinator-bound exact verified results and allowed provisional candidates. Attempt every declared integration and cross-task check that remains meaningful. Resolve incompatibilities only when the correct result is mechanically determined and stays inside authorized integration surfaces. If final verification passes, return a verified `integrated_head_sha`; otherwise return a clearly labeled `candidate_integrated_head_sha` when a usable integrated candidate exists. Preserve product or public-contract conflicts as `action_required`, execute unrelated remaining work, and report them after the run instead of silently changing the approved plan.

## Task Result

```markdown
# Task Result — <task-id>
- status: COMPLETE | IMPLEMENTED_WITH_FINDINGS | PARTIAL | NEEDS_INPUT | BLOCKED
- implementation_status: COMPLETE | PARTIAL | NOT_STARTED
- verification_status: PASS | FAIL | NOT_RUN
- continuation: ALLOWED | NOT_POSSIBLE
- result_id:
- run_id:
- task_id:
- kind:
- intent_revision:
- planned_profile: # model and effort, or null if absent from source
- requested_profile: # actual spawn arguments
- effective_profile: # host-observed model/effort or unknown
- task_packet_digest: # supplied source digest or null
- execution_binding_digest:
- worktree:
- worktree_created: true | false
- branch:
- base_commit:
- observed_head_commit:
- commit_kind: verified_result | provisional_candidate | none
- result_commit: # verified only
- candidate_commit: # provisional only
- phase_reached:
- mutation_occurred:
- worktree_clean:

## Scope
- changed paths
- ownership exceptions

## Verification
- command, result, duration, evidence

## Review
- finding and disposition

## Implementation-time findings
- planned assumption
- observed conflict or failure
- attempted repair
- disposition: resolved_in_task | carried_to_integration | action_required | hard_blocker
- downstream impact and evidence

## Deviations, remaining risks, and checks not run

## Integration output
- integrated_head_sha: # verified integration only
- candidate_integrated_head_sha: # provisional integration only
```

`COMPLETE` requires completed implementation and passing verification. `IMPLEMENTED_WITH_FINDINGS` and `PARTIAL` do not claim acceptance, but may release a dependent task when they provide an exact provisional candidate and `continuation: ALLOWED`. Status alone never releases a dependency.

## Execution Result

```markdown
# Workbench Execution Result — <run-id>
- status: COMPLETE | ACTION_REQUIRED | PARTIAL | NEEDS_INPUT | BLOCKED
- repository_id:
- base_commit:
- coordinator_model: # actual model or unknown
- coordinator_reasoning_effort: # actual effort or unknown
- worker_profiles: # per task: planned, requested, host-observed effective (or unknown)
- intent_revision:
- revision_history: []
- diagnostic_agents: []
- task_count:
- attempted_tasks: []
- complete_tasks: []
- provisional_tasks: []
- unattempted_tasks: []
- final_result_commit: # verified single-task result or integrated result
- final_integration_commit: # verified integration only, null when unnecessary
- candidate_integration_commit: # provisional only

## Task results
- task ID -> status, implementation status, verification status, continuation, commit kind, exact commit, worktree, evidence

## Scheduling
- executed waves
- descendants continued from provisional candidates
- queued, serialized, or unattempted tasks and reasons

## Plan-versus-execution findings
- planned assumption
- observed conflict or failure
- attempted repair
- final disposition
- exact action required before delivery

## Remaining risks and manual actions
- push, PR, user-branch merge, handoff, and cleanup not performed
```

Return `COMPLETE` only when all required implementation and applicable verification pass for the latest authorized scope. A single-task result can be the final head without an extra integration packet. Do not add a mandatory independent review or approval gate. Return `ACTION_REQUIRED` when all safely runnable work was attempted but unresolved findings still prevent acceptance. Return `PARTIAL` when material prerequisites made some planned work impossible to attempt, `NEEDS_INPUT` when a user decision or new authority is required, and `BLOCKED` when execution could not make meaningful progress. Preserve original plans and report execution findings; incorporate explicit user changes through traceable revisions rather than silently replacing intent.
