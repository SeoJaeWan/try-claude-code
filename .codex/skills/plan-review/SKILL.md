---
name: plan-review
description: Read-only critical review skill for executable `./plans/**/plan.md` artifacts and their linked phase detail files created by `architect`. Use when Codex needs an independent cold review before execution, checking template compliance, blocking ambiguity, topology quality, owner routing, scenario-level technical input/output contracts, later `plan-materialize` derivation readiness, and registry-selected review wiki guidance without rewriting the plan.
---

<Skill_Guide>
<Purpose>
Provide a cold, skeptical review of an executable plan and report blocker, major, and minor findings before implementation begins.
</Purpose>

<Instructions>
# plan-review

Review the finished plan artifact, not the original request. Stay read-only.

## Inputs to inspect

1. Target executable plan file: `./plans/**/plan.md`
2. Linked phase detail files referenced from that `plan.md`
3. Optional orchestration state file when invoked by `orchestrator`:
   - `./.codex/artifacts/plan/{task-slug}/state.json`
4. `../review-wiki-setup/references/staging-contract.md`
5. `../review-wiki-setup/references/platform-commands.md`
6. Resolved `review_wiki_root` containing `registry.json`, core docs, and pattern guidance. Prefer `./.codex/cache/review-wiki/current`; fall back to `~/.codex/reviewWiki/wiki` only when the cache is unavailable.
7. Every core doc listed in the registry `core` array, in listed order
8. Pattern candidates selected from the registry `patterns` list using the `review` selection mode plus matching `Apply When`
9. `../architect/references/plan-template-sequential.md`
10. `../architect/references/phase-template-detail.md`
11. `../architect/references/agents-lite.md`
12. `./references/review-policy.md`
13. Repo-local execution contracts only when needed to verify routing, validation, or repo-fit claims in the plan
14. Directly referenced local prerequisite plan files only when the reviewed phase detail names them in the local prerequisite field

## Workflow

### Step 0. Read required references

Before judging the plan:

- determine execution mode first:
  - if an explicit orchestration `state.json` path is provided and `state.json.preflight.mode = "orchestrated"` with `state.json.preflight.complete = true`, enter orchestrated mode
  - otherwise enter direct mode
- in orchestrated mode:
  - read the provided `state.json`
  - require `state.json.preflight.review_wiki_root` to be present
  - treat `state.json.preflight.review_wiki_root` as authoritative
  - do not run review wiki staging
  - if `state.json.preflight` is missing, incomplete, or contradictory, block instead of guessing
- in direct mode:
  - read `../review-wiki-setup/references/staging-contract.md`
  - read `../review-wiki-setup/references/platform-commands.md`
  - resolve `review_wiki_root` in this order:
    1. `./.codex/cache/review-wiki/current`
    2. `~/.codex/reviewWiki/wiki`
  - if the cache is missing and the external wiki root is readable, run the platform-appropriate staging command from `platform-commands.md` from the workspace root, then use the refreshed cache
  - if the external wiki root is missing or broken and the cache is absent, stop and report the missing dependency explicitly
  - if the external wiki root is permission-blocked but the cache exists, continue with the cache and mention the fallback in the review assumptions
- read `{review_wiki_root}/registry.json`
- read every path listed in the registry `core` array, in order, resolving relative paths from `review_wiki_root`
- read `architect/references/plan-template-sequential.md`
- read `architect/references/phase-template-detail.md`
- read `plan-review/references/review-policy.md`

### Step 1. Load one executable plan

- Review one executable `plan.md` at a time
- Derive `task-slug` from the owning plan directory
- Load every phase detail file linked from that `plan.md`
- Derive review tags from the reviewed `plan.md`, linked phase detail files, and any explicit scope words in the request metadata when present
- Select candidate pattern files from the registry `patterns` list using the registry `selection.review` mode and `adjacency_rules`
- Read only the selected pattern files whose `Apply When` clauses actually match the reviewed plan or its phase detail files
- Derive the same deterministic `plan_revision` fingerprint from the current `plan.md` plus its linked phase detail files
- Treat the plan summary, linked phase detail files, and required references as the source of truth
- Do not infer missing policy from the original user request when the plan itself is ambiguous
- If a reviewed phase detail names a local prerequisite plan in the local prerequisite field, load only that directly referenced plan and inspect only the minimum upstream phase needed to verify the prerequisite contract
- Do not recurse into a larger plan graph or turn the review into a full multi-plan orchestration pass

### Step 2. Run a cold review

Judge the plan against:

- template compliance
- the active review wiki core contract
- the selected pattern guidance that actually matches the reviewed plan
- parity between the `plan.md` phase summary and the linked technical detail file
- blocking ambiguity
- topology quality and plan-count justification
- `owner_agent` routing
- scenario-level `input -> output` contract completeness in the phase detail files
- canonical outputs, negative outputs, and recipients or interpretation boundaries when relevant
- one-hop prerequisite contract parity when the reviewed plan references a local prerequisite plan
- verification realism and repo-fit
- whether the phase detail contracts are explicit enough for later `plan-materialize` derivation
- `visual-comparator` planning when the active core docs or selected pattern guidance require it
- `playwright-guard` planning when the active core docs require it

Prefer findings over compliments. Do not invent repo facts that the plan does not support.

### Step 3. Classify findings

- Use the severity model in `references/review-policy.md`
- Record only real issues that materially affect execution readiness, contract clarity, or later test derivation
- When a weakness comes from an explicit user tradeoff, note it accurately instead of silently normalizing it away
- If no findings remain, say so explicitly

### Step 4. Decide the outcome

- Mark the review `blocked` if any `blocker` finding exists
- Mark the review `ready-with-findings` if no blocker exists but `major` or `minor` findings remain
- Mark the review `ready` only when no findings remain
- Do not rewrite the plan in this skill

### Step 5. Write the review artifact

Write:

- `./.codex/artifacts/plan-review/{task-slug}/review.md`

Include:

- a YAML frontmatter block at the top with at least:
  - `plan_path`
  - `task_slug`
  - `plan_revision`
  - `outcome`
  - `next_action`
  - `finding_signature`
- reviewed plan path
- outcome
- blocker, major, and minor findings
- assumptions or unknowns that constrained the review
- explicit execution-readiness note

Frontmatter rules:

- `outcome`: `ready` | `ready-with-findings` | `blocked`
- `next_action`:
  - `user_gate` when `outcome = ready`
  - `architect` when `outcome = ready-with-findings` or `blocked`
- `finding_signature`: a stable short fingerprint of the current finding set for this exact `plan_revision`; use `none` when no findings remain

### Step 6. Respond in chat

- Present findings first, ordered by severity
- Use file references to the reviewed `plan.md`, any especially relevant phase detail file, and the written `review.md` artifact
- If the outcome is `blocked`, say execution should not proceed until `architect` revises the plan
- If the outcome is `ready-with-findings`, separate advisory issues from blockers clearly

## Guardrails

- Read-only: do not edit the plan, source code, or tests
- Do not silently fix or rewrite the plan inside the review
- Do not downgrade a blocker just to keep momentum
- Do not treat partial notes, briefs, or non-executable artifacts as execution-ready plans
- Do not bypass the resolved `review_wiki_root` with hardcoded external-path reads when a workspace cache exists
- In orchestrated mode, do not redo review wiki bootstrap that the orchestrator already completed
- Do not perform a second full review of upstream plans; inspect only the direct prerequisite parity needed to judge the reviewed plan's execution readiness
- Do not let missing canonical outputs, negative outputs, recipients, winner or loser rules, terminal-state policy, side-effect coupling, or invalid topology pass silently when later execution would have to guess
- Do not let summary/detail drift or unresolved contract wording force guesswork about the actual phase boundary

</Instructions>
</Skill_Guide>
