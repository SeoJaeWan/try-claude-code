# Planning Policy

Canonical detailed rules for `architect`.

Use this file for:

- blocking vs derivable vs deferrable decision policy
- sequential-only plan artifact contract
- plan split rules for multiple sequential plan files
- test-materialization handoff rules
- quality gates
- execution handoff requirements

`SKILL.md` should stay flow-oriented. Keep detailed planning policy here.

---

## Review Wiki Routing

The review wiki is a required planning input when its index is available at `~/.codex/reviewWiki/wiki/index.md`.

Rules:

- Read `~/.codex/reviewWiki/wiki/index.md` before planning, not after drafting.
- Treat the index as a router:
    - always read the index itself
    - then read only the wiki document or documents whose `read_when` matches the request and repo-local context
- Do not bulk-read the whole wiki when the index already narrows the relevant documents.
- Prefer repo-local truth when a wiki rule conflicts with current source, config, or validation contracts.
- If the review wiki link or index is missing, broken, or unreadable, surface that fact explicitly instead of silently proceeding as if no review guidance exists.
- Follow raw backlinks only when the routed wiki rule is ambiguous, appears to conflict with another rule, or needs direct evidence review for a planning-critical decision.

Use the review wiki especially when:

- split topology or phase boundaries are debatable
- canonical identifiers, outputs, or interpretation paths must be chosen
- validation, state-transition, permission, or rollout rules affect the plan
- rollback safety, migration, or verification strategy could materially change the execution plan

---

## Blocking Decision Policy

Classify missing information as:

- `blocking`: changes architecture, contracts, test scope, or user-visible behavior
- `derivable`: can be confirmed from local repo context without user input
- `deferrable`: low-risk default that does not materially change implementation or validation

Treat ambiguity as `blocking` when it can change:

- architecture or major boundaries
- API/data contracts
- schema or business rules
- UX behavior, permissions, validation, or state transitions
- navigation, error handling, accessibility expectations, or acceptance tests

### Frontend UI Contracts

For frontend/UI scope, user-visible behavior ambiguity is always `blocking` when it can change:

- what surface is affected
- what user action matters
- what visible outcome defines success or failure
- whether the change is behavior-affecting or presentation-only

`architect` does not need to freeze full E2E metadata inside the plan.
However, the plan must expose enough boundary, input, output, and expected outcome information for `plan-materialize` to derive tests or stop with an explicit blocker.

### Behavior-Changing Contracts

For behavior-changing scope, the plan must expose a stable scenario-level `input -> output` contract.

At minimum, the relevant phase detail must make clear:

- trigger or precondition
- key inbound state or data
- canonical output that must happen
- negative output that must not happen when absence is part of the product policy
- recipient, delivery target, or final interpretation boundary when delivery or interpretation matters

When the scenario has execution risk beyond a simple one-shot path, the phase detail must also make clear:

- whether there are competing completion paths
- whether any path is deferred relative to the initiating input
- the terminal state rule
- the losing path rule when a loser must become no-op
- whether any side effect is coupled to the winning state transition

Treat ambiguity as `blocking` when a plan could support multiple plausible canonical outputs, identifiers, data shapes, or interpretation paths for the same scenario.
Treat ambiguity as `blocking` when a plan implies the risk patterns above but does not define the invariant that resolves them.

---

## Plan Artifact Requirements

Every executable plan directory must include:

1. `**Branch:** {type}/{task-slug}`
2. One reviewer-facing `plan.md`
3. One linked phase detail file per phase under `phases/{nn}-{phase-slug}.md`
4. For each phase summary in `plan.md`:
    - `목적`
    - `변경 내용`
    - `이전 상태`
    - `이후 상태`
    - `관련 영역`
    - `상세`
5. For each phase detail file:
    - `owner_agent`
    - `목적`
    - `boundary`
    - `input`
    - `output`
    - `작업`
    - `검증`
6. Optional per-phase detail fields when needed:
    - `선행조건`
    - `제약`
    - `side effects`
    - `failure/validation`
Use `plan-template-sequential.md` as the `plan.md` skeleton and `phase-template-detail.md` as the per-phase detail skeleton.
Do not add extra top-level narrative sections to `plan.md` unless the user explicitly asks or another rule in this file explicitly requires them.
The owning plan directory name is the canonical `task-slug`. Reuse that same slug unchanged in the `Branch` summary and worktree directory name.

Every executable plan file must include a `Branch` header:

- `**Branch:** {type}/{task-slug}`

Worktree directory naming reuses the same `task-slug` as the owning plan directory name.
Example: `plans/windows-ui-taskbar-shell/plan.md` + `feat/windows-ui-taskbar-shell` -> `worktrees/windows-ui-taskbar-shell`

`plan.md` is a user-facing review artifact.
The phase detail files are the technical execution artifacts.

### Plan Count Policy

Default topology for one request:

- create one executable plan file at `plans/{task-slug}/plan.md`
- express sequencing through ordered `Phase` blocks in that file and matching `phases/*.md` detail files

Multiple standalone executable plans are allowed only when the request contains multiple independently mergeable change boundaries.

When several valid split topologies exist, prefer the one that yields truly independent executable plans that can run in parallel without requiring a mandatory later harmonization or integration plan just to make the earlier slices mergeable.

Use multiple standalone plans when one request would otherwise mix two or more of the following:

- a user-visible behavior or state change plus a broad rename, contract, or export cleanup
- a contract or ownership move plus a shared-part extraction or deduplication pass
- different primary acceptance surfaces or materially different validation commands
- rollback boundaries that should stay independent
- core implementation work plus follow-up Storybook/docs/catalog cleanup that can land later without blocking correctness

For frontend/package UI work, also split into multiple standalone plans when:

- one slice establishes reusable component, asset, type, or export boundaries that later slices consume
- the foundation slice is independently renderable, type-checkable, or otherwise reviewable before dependent surfaces land
- at least one other surface remains meaningfully independent of that shared work and can be reviewed, validated, and merged without waiting on a later mandatory deduplication or harmonization pass

For frontend/package UI work, keep sibling visual shells in the same plan when all of the following remain true:

- they live in the same package or ownership boundary
- they use the same `owner_agent`
- they share the same validation commands
- they depend on the same newly introduced helper contracts or component foundation
- they differ mainly by layout, mode, or item shape rather than by rollout boundary

For frontend/package UI work, do not force a helper/foundation split when shared internals, common work, or overlapping integration tasks pervade nearly every target surface and the proposed split would mostly serialize later work instead of unlocking meaningful independent execution.

When the work is broadly shared across the same surfaces and ownership boundary, prefer one executable plan with more granular sequential phases over multiple plans whose independence is mostly artificial.

Do not emit multiple plans only because:

- many files are touched
- one phase would have many `작업` bullets
- the request feels large but intermediate states would still be invalid or unverifiable on their own
- sibling presentational surfaces look different even though they still share the same package boundary, owner agent, validation commands, and helper contracts

When multiple plans are chosen:

- write one executable plan per mergeable boundary
- place each plan in its own folder, for example `plans/{task-group}-{nn}-{slice-slug}/plan.md`
- keep each plan sequential and aligned to `plan-template-sequential.md` plus `phase-template-detail.md`
- give each plan its own `Branch` header, reviewer-facing phase summaries, and linked phase detail files
- if ordering matters, use zero-padded numeric prefixes in the folder names and record prerequisites in the relevant phase detail file's `선행조건`
- use the execution handoff to list the ordered plan paths and their validation boundaries
- when one local plan depends on another local plan, the downstream detail-file `선행조건` must name the prerequisite contract explicitly enough to review without guessing
- that prerequisite contract must map to exactly one upstream phase detail whose `output` and `검증` restate the same contract without reinterpretation
- the upstream phase detail `boundary` must include the files or command surfaces needed to establish that prerequisite contract
- if a downstream prerequisite can be satisfied only by broad foundation language, handoff prose, or unstated repo assumptions, treat the topology as not execution-ready
- do not create overview, index, or root graph files

Keep a single executable plan when the work only becomes valid, reviewable, and rollback-safe after all steps land together.

### Plan Readability Rules

- `plan.md` is user-facing. Assume the reviewer may not know implementation terminology.
- Keep internal test taxonomy, orchestration metadata, file-level boundary detail, and tool-routing detail out of `plan.md` unless the user explicitly asks for them.
- Every phase heading in `plan.md` must use `### Phase n. {짧고 쉬운 역할 이름}` and make the primary change slice visible at a glance.
- The role name should prefer the changed area, moved responsibility, removed dependency, or resulting artifact, not abstract labels like `정리`, `마감`, or `고정` by themselves.
- In `plan.md`, prefer `이전 상태 -> 이후 상태` language over technical schema labels when the same meaning can be conveyed plainly.
- Avoid unexplained jargon in `plan.md`. Terms such as `visual grammar`, `consumer`, `projection`, `wiring`, `surface`, or `canonical` should be replaced with plain Korean or explained immediately.
- Keep `목적` complementary to the heading: explain what changes and why, rather than restating a dense technical contract.
- When a later phase only finalizes exports, migration, or consumer validation, record the delta from earlier phases instead of restating the full contract verbatim.
- Keep `시작 조건` in `plan.md` short and human-readable. Put precise prerequisite contracts in the phase detail file.
- Do not add dedicated top-level summary or test sections such as `## 테스트 계획` to executable implementation plans.
- Use the phase detail files for the full technical `input/output`, `boundary`, `작업`, and `검증` contract.

### Test Materialization Handoff

When code changes are in scope:

- `architect` does not create tests or add a dedicated test-planning section to `plan.md` or to the phase detail files
- `plan-materialize` later writes or updates source-tree tests
- implementation plans automatically run `plan-materialize` before implementation begins
- documentation-only, analysis-only, or structural-only plans may skip `plan-materialize`
- the helper report lives next to the owning executable plan:
    - `plans/{task-slug}/materialize.md`
    - or `plans/{task-group}-{nn}-{slice-slug}/materialize.md`
- the helper report is not the durable source of truth
- unit and E2E ownership must live in the source tree
- E2E ownership should be tracked with metadata comments in spec files by default
- add a split-surface registry only when one surface must span multiple spec files
- `architect` should not add speculative test classification, likely source-tree placement, or candidate spec splits into `plan.md`
- the phase detail files must still expose enough scenario-level contract information for `plan-materialize` to identify:
    - the outcome-selection boundary
    - any boundary-contract boundary
    - any final-interpretation boundary when a feature-specific final output is introduced
    - any winner/loser rule, terminal-state rule, deferred path, or side-effect coupling that must be pinned in tests

### Phase Metadata Rules

- Every phase summary block in `plan.md` must expose a short role label in the heading itself, using `### Phase n. {짧고 쉬운 역할 이름}`
- Every phase summary block in `plan.md` must include `목적`
- Every phase summary block in `plan.md` must include `변경 내용`
- Every phase summary block in `plan.md` must include `이전 상태`
- Every phase summary block in `plan.md` must include `이후 상태`
- Every phase summary block in `plan.md` must include `관련 영역`
- Every phase summary block in `plan.md` must include `상세`
- Every linked phase detail file must include `owner_agent`
- Every linked phase detail file must include `목적`
- Every linked phase detail file must include `boundary`
- Every linked phase detail file must include `input`
- Every linked phase detail file must include `output`
- Every linked phase detail file must include `작업`
- Every linked phase detail file must include `검증`
- `검증` must be written as checklist bullets (`- [ ] ...`)
- the `상세` link must point to exactly one phase detail file under the same plan directory
- `작업` bullet count is not fixed; use as many bullets or paragraphs as needed in the detail file to make the phase executable
- `목적` in `plan.md` should stay to one or two sentences; the summary blocks are for comprehension, not for contract dumping
- `plan.md` phase headings and `목적` should let a non-developer infer the step's role before reading the detail file
- the detail file `input` should make the scenario trigger, preconditions, and important inbound state explicit enough for test derivation
- the detail file `output` should make `must happen` outcomes explicit and include `must not happen` outcomes when absence is part of the product policy
- the detail file `output` may use short sub-bullets such as `공개 계약`, `내부 기본값`, and `허용하지 않는 대안` when that keeps the technical contract readable
- if delivery, mapping, or final interpretation matters, record the relevant recipient, delivery target, or interpretation boundary inside the detail file instead of leaving it implicit
- when multiple paths can complete the same scenario, record the winner rule and the loser no-op rule inside the detail file `output`, `failure/validation`, or `작업`
- when state and side effects are coupled, make the allowed coupling explicit in the detail file instead of leaving test materialization to infer it
- `owner_agent` must exist in `references/agents-lite.md`
- use exactly one execution agent per detail file
- do not rely on heading text like `(Owner: ...)`
- if side effects or failure behavior matter to planning clarity, include them inline in the detail file
- if tests are part of scope, keep summary-level references minimal and defer concrete test design to `plan-materialize`
- if `선행조건` in a detail file references another local executable plan, name the provider plan path and the concrete contract instead of using vague phrases like `foundation complete`
- if a detail file establishes a reusable contract for another local plan, repeat that same contract in `output` and at least one actionable `검증` checklist item
- do not make later execution infer local prerequisite satisfaction from nearby prose or unrelated validation steps

---

## Execution Routing Policy

Assign work by concern:

- `frontend-developer`: frontend UI, responsive polish, state transitions, event handling, API integration, and validation logic
- `backend-developer`: API, DB, auth, server logic
- `general-developer`: infrastructure, DevOps, CI/CD, deploy/runtime config, and repository-level tooling that belongs to neither frontend nor backend
- `playwright-guard`: post-implementation full-flow/regression Playwright guard tests

Do not split a phase only because UI and logic are both present. Split only when file overlap, dependency order, or validation boundaries require it.

Resolve routing and mode-sensitive conventions from the active execution contract before locking implementation phases:

- For `frontend-developer` or `backend-developer`, there is no dedicated frontend/backend CLI contract in this repository
- Inspect only the minimum repo-local command, config, or existing source-tree convention that governs the chosen frontend/backend work
- Treat those repo-local contracts as the source of truth for path policy, naming, validation, scaffold shape, and rollout constraints
- If exact mode/version matters to the plan, inspect the repo-local source that defines it and record it inline in the relevant phase/task
- For `general-developer`, inspect the minimum repo-local tool or validation command that governs the work and use that as the execution contract
- Do not hardcode detailed tool/task situations into the planning prompt; defer command selection details to execution time

See `agents-lite.md` for the canonical execution agent catalog and related skill examples.

---

## Planning Agent Invocation Policy

Use named custom planning agents for cold review and test materialization handoff:

- `plan-reviewer` wraps the `plan-review` skill
- `plan-materializer` wraps the `plan-materialize` skill

Invocation rules:

- run `plan-reviewer` before `plan-materializer`
- run them sequentially, never in parallel
- invoke each as a fresh agent instead of using the main session as the execution context
- do not pass the full prior conversation as the default source of truth
- pass only the minimum stable handoff context:
    - executable `plan.md` path
    - linked phase detail paths
    - for `plan-materializer`, the relevant `review.md` path when it exists
- if `plan-reviewer` reports `blocked`, send the plan back to `architect`
- if `plan-materializer` reports `block`, send the plan back to `architect`

These named planning agents are handoff utilities. They are not valid phase `owner_agent` values.

---

## Test Materialization Policy

### `plan-materialize`

Run after planning when the plan includes implementation scope.

Default invocation path:

- invoke the named custom agent `plan-materializer`
- keep `plan-materialize` as the workflow source of truth inside that agent

`plan-materialize` decides `unit`, bounded-surface `e2e`, `skip`, or `defer` from the plan plus local repo conventions.

Rules:

- outcome-selection boundaries are unit-test mandatory across frontend and backend
- boundary-contract boundaries are unit-test mandatory across frontend and backend
- final-interpretation boundaries are unit-test mandatory when the scenario introduces a feature-specific rendered, mapped, serialized, or otherwise interpreted final output
- logic boundaries are unit-test mandatory across frontend and backend
- frontend user-visible boundaries default to bounded-surface E2E
- presentation-only changes may skip E2E only with an explicit reason
- cross-route journeys are deferred to `playwright-guard`
- if local test setup for a needed test type is missing, `plan-materialize` must stop instead of inventing one
- if canonical outputs, negative outputs, recipients, delivery targets, or required final-interpretation boundaries are missing from the plan, `plan-materialize` must stop with a blocker instead of guessing
- if competing completion paths, deferred execution, terminal-state rules, or side-effect coupling are implied but not defined in the plan, `plan-materialize` must stop with a blocker instead of guessing

### `playwright-guard`

Add a later `playwright-guard` phase when the plan changes:

- a cross-route user journey
- auth/session transitions
- redirect chains
- persisted browser state
- a release-critical flow that needs regression hardening

When this phase exists:

- set `owner_agent: playwright-guard`
- schedule it after implementation reaches green on core validation
- define trigger and scope explicitly:
    - changed journey or affected routes
    - expected final user-visible outcome
    - known fragile behavior, failed verification signal, or regression concern
    - target app URL or start route
- expected output is real Playwright guard specs in the project test tree, not in `plans/`
- `playwright-guard` must not edit bounded-surface E2E files owned by `plan-materialize`

### `plan-review`

Use after `architect` writes a finished executable `plan.md` when the user wants an independent cold review before execution.

Default invocation path:

- invoke the named custom agent `plan-reviewer`
- keep `plan-review` as the workflow source of truth inside that agent

Rules:

- `plan-review` is read-only; it does not rewrite plans
- `plan-review` checks the finished plan against this policy, the sequential template, and any repo-local execution contract needed to verify explicit claims
- blocker findings return the plan to `architect` for revision before execution proceeds
- non-blocker findings are advisory review input
- `architect` self-review is not a substitute when the user explicitly requests an external critical pass

---

## Quality Gate Checklist

Before finalizing, and again during self-review:

1. Every executable plan file includes a valid `Branch` header, its branch summary exactly matches the owning plan directory name, and the worktree directory reuses that same slug
2. Every phase summary in `plan.md` links to exactly one phase detail file under `phases/`
3. Every phase detail file has a concrete `owner_agent` listed in `references/agents-lite.md`
4. Every phase summary includes `목적`, `변경 내용`, `이전 상태`, `이후 상태`, `관련 영역`, and `상세`
5. Every phase detail file includes `목적`, `boundary`, `input`, `output`, `작업`, and `검증`
6. `검증` is an actionable checklist, not loose prose
7. `plan.md` is readable to a non-developer and does not hide the main change behind unexplained jargon
8. No unresolved blocking policy/contract/schema/UX ambiguity remains
9. Concern routing matches agent boundaries: frontend -> `frontend-developer`, backend -> `backend-developer`, infra/devops/root tooling -> `general-developer`
10. Review wiki routing is complete: `~/.codex/reviewWiki/wiki/index.md` was read, and any applicable routed wiki documents were consulted before boundary, contract, or verification decisions were finalized
11. The phase detail files expose enough scenario-level I/O and expected outcome information for `plan-materialize` to derive tests or escalate a blocker
12. If code changes are planned, the plan body stays free of standalone test-orchestration sections and the execution handoff treats `plan-materializer` as an automatic prerequisite unless the plan is docs-only, analysis-only, or structural-only
13. `architect` does not embed generated test artifacts or final source-tree placement in `plans/`
14. For UI/user-journey or regression-hardening scope, a later `playwright-guard` phase exists with explicit trigger, scope, and verification checklist
15. Plan count is justified: one executable plan for one mergeable boundary, or multiple standalone executable plans only when the policy criteria are met
16. If multiple plans are emitted, their order and any prerequisite relationship are explicit in the handoff and relevant detail-file `선행조건`
17. Every executable plan summary stays aligned to `plan-template-sequential.md` without extra speculative summary sections
18. Every phase heading includes a short role label that makes the primary change slice visible without reading the entire block
19. For frontend/package UI work, shared-foundation extraction is separated from dependent surfaces when that foundation is independently reviewable and rollback-safe
20. For frontend/package UI work, sibling visual shells are not over-split when they share the same package boundary, owner agent, validation commands, and foundational helper contracts
21. When multiple split topologies are plausible, the chosen topology maximizes real independent execution instead of creating plans that still require a mandatory harmonization pass before they become mergeable
22. For frontend/package UI work, helper/foundation splits are not forced when shared internals or broadly overlapping common work pervade nearly every surface and would mostly introduce serial dependency and orchestration overhead
23. When plan boundaries are not truly independent, the decomposition is pushed down into clearer sequential phases inside one plan instead of being forced into multiple weakly independent plans
24. Every behavior-changing phase detail makes the canonical `must happen` output explicit, records important `must not happen` outputs when relevant, and does not leave delivery or interpretation boundaries implicit
25. When one scenario could plausibly map to multiple identifiers, data shapes, or interpretation paths, the detail file resolves the winner or stays blocked
26. When one scenario has competing completion paths or deferred execution, the detail file makes the winner rule, loser no-op rule, and terminal-state policy explicit enough for test derivation
27. When side effects are valid only on specific state transitions, the detail file records that coupling explicitly instead of leaving it implicit
28. When multiple local plans exist, every downstream detail-file `선행조건` maps to one specific upstream provider phase instead of a vague earlier slice
29. For each local prerequisite relationship, the downstream detail-file `선행조건`, upstream `output`, and upstream `검증` use matching contract language and do not require stop-time reinterpretation
30. For each local prerequisite relationship, the upstream provider phase `boundary` and verification path are credible for actually establishing that contract

Do not request execution before this checklist passes.

---

## Execution Handoff Requirements

Provide a concise handoff summary with:

1. Single-plan output:
    - the executable plan file path
    - the phase detail directory path
    - task branch name and matching worktree directory name (same `task-slug` as the plan folder)
    - first executable phase and its `owner_agent`
2. Multiple-plan output:
    - ordered executable plan paths
    - for each plan: phase detail directory path, task branch, matching worktree directory name (same `task-slug` as the plan folder), first executable phase `owner_agent`, and primary validation boundary
3. Execution invocation commands:
    - launch the named custom agent `planner` against each executable plan file
    - if the executable plan includes implementation scope, run the named custom agent `plan-materializer` against that executable plan before implementation
4. Merge rule:
    - `planner` owns the task worktree and phase-worker dispatch while following the `planner-lite` workflow
    - phase workers run inside the assigned task worktree without creating nested worktrees
    - successful phases are committed inside the task branch; final merge goes into that executable plan file's `Branch` with `--no-ff`
5. State whether the executable plan includes implementation scope or is docs-only, analysis-only, or structural-only, and whether a later `playwright-guard` phase is scheduled
6. For implementation plans, note the future helper report path adjacent to each executable plan:
    - `plans/{task-slug}/materialize.md`
    - or `plans/{task-group}-{nn}-{slice-slug}/materialize.md`
7. Bounded-surface E2E ownership lives in source-tree metadata comments, not in `plans/`
8. If the user requests an independent cold review, invoke the named custom agent `plan-reviewer` against each executable `plan.md` before implementation begins; the workflow source of truth remains `plan-review`, and `blocker` findings send the plan back to `architect`
