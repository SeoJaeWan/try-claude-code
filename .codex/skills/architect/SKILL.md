---
name: architect
description: Codex entry skill for rigorous implementation planning. Produces plan artifacts in ./plans and coordinates Claude execution handoff.
---

<Skill_Guide>
<Purpose>
Create decision-complete implementation plans with explicit gates, conditional parallel strategy, and execution handoff.
</Purpose>

<Instructions>
# architect

Use this as the preferred planning entrypoint for complex or high-impact requests, or after `brainstorm` confirms key decisions.
Direct agent execution is allowed for focused low-risk tasks when the user explicitly chooses it.

## Inputs to inspect

1. User request and latest conversation context.
2. `./.codex/skills/architect/references/agents-lite.md` (execution agent catalog).
3. `./.ai/references/coding-rules/git.md` for branch naming rules.

## Workflow

### Step 0. Read routing references (required)

Before writing any plan artifact:

- Read `./.codex/skills/architect/references/agents-lite.md` (execution agent catalog)

### Step 1. Analyze request

- Clarify goals, boundaries, constraints, and acceptance criteria.
- If ambiguity remains that can change architecture, send back to `brainstorm` first.

### Step 2. Gather high-level context (optional)

Use high-level inspection only:

- Existing related features
- Tech stack and major boundaries
- Expected integration points

Do not deep-dive into implementation details.

### Step 3. Design plan structure

Create plan artifacts in `./plans/{task-name}/`.

`plan.md` must always include:

1. Problem statement and scope
2. Out-of-scope
3. Assumptions and risks
4. Phase breakdown with machine-readable `owner_agent` field per phase
5. File change list (create/modify/delete)
6. Validation commands and exit criteria
7. Rollback or fallback strategy
8. Final acceptance checklist
9. Parallel Feasibility Matrix
10. Execution Mode Decision (`sequential` | `partial-parallel` | `parallel`)
11. Critical Path
12. Track Dependency Graph (text)

Every executable plan file (`plan.md` and `plan-{track}.md`) must include this header at the top:

```markdown
**Branch:** {type}/{summary}
```

For parallel files (`plan-{track}.md`), use:

```markdown
**Branch:** {type}/{summary}-{track}
```

Branch names must follow `./.ai/references/coding-rules/git.md`.

Execution phase format rule (required):

Routing guidance (required):

- Assign visual design, layout, spacing, typography, color-token application, and responsive UI polish to `publisher`.
- Assign business logic, state transitions, event handling, data flow, API integration, and validation logic to `frontend-developer` (or `backend-developer` when server-side).
- If a phase mixes both concerns, split it into separate phases/tasks with explicit `owner_agent` per concern.
- Every execution block (`Phase n`, `Tn`) must include `- owner_agent: \`{agent-name}\``.
- `owner_agent` must match an existing agent file: `./.claude/agents/{agent-name}.md`.
- Do not rely only on heading text such as `(Owner: ...)`.

Use template references when drafting:

- Sequential template: `./.codex/skills/architect/references/plan-template-sequential.md`
- DAG template: `./.codex/skills/architect/references/plan-template-dag.md`

### Step 3.5. Generate test plan (conditional)

If the plan includes testable code units (hooks, services, utilities) **and** constraint IDs (`[C-...]`), run the `plan-tests` workflow:

1. Read `./.codex/skills/plan-tests/SKILL.md`
2. Execute the plan-tests workflow to generate test files under `./plans/{task-name}/tests/`
3. Verify `tests/manifest.md` shows 100% constraint coverage

**Skip** if the plan contains only documentation, configuration, or structural changes with no testable code units.

Test files are plan artifacts, not implementation code. Developers copy them to the source tree during the TDD Red phase.

### Step 3.6. Plan E2E flow (conditional)

If the task changes user-facing UI, navigation, or end-user flows, include explicit E2E phases in the plan:

1. `playwright-test-planner` creates or updates scenario specs (`specs/`)
2. `playwright-test-generator` creates or updates Playwright test files (`e2e/`)
3. `playwright-test-healer` runs only when generated/existing E2E tests fail due to selector or UI drift

Skip for backend-only, documentation-only, or configuration-only scope.
E2E phases must also use explicit `owner_agent` fields like other executable blocks.

### Step 4. Conditional parallelization decision (required)

Do not default to parallel. Decide mode by work-unit and file-overlap analysis:

Inputs:

- Work units (what must be executed)
- Expected file change sets per work unit
- Artifact dependencies between work units

Decision rules:

1. `sequential`

- Choose when all major work units share critical files, or
- when most work units depend on the same predecessor output.

2. `partial-parallel`

- Choose when at least one predecessor unit must run first, and
- 2+ downstream units are independently executable after that predecessor.

3. `parallel`

- Choose only when major work units are independent with no critical file conflicts.

Enforcement:

- If mode is `sequential`, generate only `plan.md`.
- If mode is `partial-parallel` or `parallel`, generate `plan.md` + `plan-{track}.md` files.
- Never generate parallel tracks when sequential conditions hold.

For conflict risk assessment and the parallel safety checklist, see `./.codex/skills/architect/references/parallel-safety.md`.

When track files are generated, each `plan-{track}.md` must include:

```markdown
**Branch:** {type}/{summary}-{track}
```

And these required metadata sections:

- `Track`
- `DependsOn` (track ids or `none`)
- `StartCondition`
- `ReadyCheck` (command)
- `BlockingFiles` (list)
- `Outputs`
- `MergeCondition`
- Per-task `owner_agent` field in every `Tn` block

Parallel track rules:

- Track-level `BlockingFiles` intersections must be empty unless explicitly serialized in `DependsOn`.
- `DependsOn` graph must be acyclic.

### Step 5. Quality gates (required)

Run these checks before finalizing:

1. Every phase/task block has a concrete `owner_agent` field and the value maps to `./.claude/agents/{agent-name}.md`.
2. No `TBD` assignee or unresolved critical dependency.
3. Every executable plan file includes `Branch` header.
4. Execution Mode Decision matches generated artifacts:
    - `sequential` => no `plan-{track}.md`
    - `partial-parallel`/`parallel` => 2+ track plans with required metadata
5. Track dependency graph is acyclic.
6. Failure Escalation Policy is explicit (`bug-report` create -> `codex-debug` on unresolved/repeat -> `bug-report` update).
7. Visual/design-oriented work is assigned to `publisher`; logic-oriented work is assigned to developer agents.
8. For UI/user-flow scope, E2E phases are explicit (`playwright-test-planner` -> `playwright-test-generator`, healer is conditional).

### Step 6. Self-review gate (required)

After drafting plan artifacts, run a strict self-review and incorporate critical findings.
Self-review checklist:

1. Plan scope, goals, and acceptance criteria are internally consistent.
2. Every phase/task has `owner_agent`, and each value maps to `./.claude/agents/{agent-name}.md`.
3. Every executable plan file includes `Branch`.
4. Validation commands and exit criteria are explicit and executable.
5. Rollback/fallback strategy is concrete and testable.
6. If `Execution Mode = sequential`, confirm no track files are generated.
7. If `Execution Mode != sequential`, confirm every track has `DependsOn` and `ReadyCheck`.
8. Confirm no circular dependencies in the track graph.
9. Confirm Failure Escalation Policy is actionable and phase owners can execute it.
10. Confirm visual/design tasks are owned by `publisher` and not mixed with logic in the same execution block.
11. For UI/user-flow scope, confirm E2E phases and order are explicit, and healer is conditional only on failure.
   Do not request execution before this gate is complete.

### Step 7. Compatibility policy (required)

- Plan Artifact Interface v2 applies to newly created plans.
- Existing plans are not automatically migrated.
- If a legacy plan format is detected during update:
    - keep user-requested scope,
    - add a warning note in plan summary,
    - avoid broad migration unless explicitly requested.

### Step 8. Execution handoff

Architect does not execute implementation directly.
Provide a concise execution handoff summary:

1. Plan file path(s)
2. First executable phase and its `owner_agent` value
3. Execution invocation command(s):
   - sequential: run `planner-lite` session against `plan.md`
   - parallel: run one `planner-lite` session per `plan-{track}.md`
4. Confirm branch merge rule: `planner-lite` enforces `Agent(... isolation: "worktree")` per phase, merges after each worker completes, then performs final merge into each file's `Branch` with `--no-ff`
5. For UI/user-flow scope, include E2E invocation order in handoff (`playwright-test-planner` -> `playwright-test-generator`, healer only on failures)
6. Blocked decisions requiring user confirmation

## Output contract

- Sequential mode:
    - `./plans/{task-name}/plan.md`
- Partial/parallel mode:
    - `./plans/{task-name}/plan.md` (master index)
    - `./plans/{task-name}/plan-{track}.md` (2+)
- Test artifacts (when Step 3.5 applies):
    - `./plans/{task-name}/tests/manifest.md`
    - `./plans/{task-name}/tests/{mirrored-source-paths}`
- Output language: Korean

## Guardrails

- Planning only: do not write implementation code.
- Test files generated by `plan-tests` are plan artifacts, not implementation code.
- Do not omit E2E planning when UI/user-flow scope exists.
- Focus on "what to execute" and "in what order".
- Ensure all gates are explicit and testable.
- If the user explicitly requests direct agent execution for a low-risk focused task, do not force planning.
  </Instructions>
  </Skill_Guide>


