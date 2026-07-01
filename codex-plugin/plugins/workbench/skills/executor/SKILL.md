---
name: executor
description: Implement exactly one selected work unit from a brainstorm or test brief while guarding scope and following dev wiki conventions. Use when the user says "executor", "excutor", "실행해", "구현해", "1번 작업 진행", "이 작업 진행", or asks Codex to implement a brainstormed Work Unit with tests, validation, dev wiki guidance, and scope-expansion checks. This skill may edit code, tests, generated files, and configuration only when they are directly required by the selected unit.
---

# Executor

Use this skill after `issue-brief`, `brainstorm`, and optionally `test-brief` when the user wants one selected work unit implemented.

The goal is not to run a large autonomous plan. The goal is to finish one reviewable unit while making scope boundaries visible, especially when generators, formatters, or shared types change files outside the selected unit.

## Core Rules

- Implement only the selected Work Unit.
- Do NOT implement neighboring Work Units unless the user explicitly expands scope.
- Do NOT silently fix unrelated type errors, lint errors, generated files, routes, domains, or tests.
- Do NOT proceed through a scope expansion as if it is normal implementation work.
- Do NOT rewrite test-brief assertions, fixtures, or expected contracts to make the implementation easier.
- Do NOT bypass relevant dev wiki conventions with manual workarounds when the convention directly applies.
- Do NOT preserve non-conforming names or public exports merely because they already existed.
- Do NOT revert user changes. Only consider reverting changes made during this executor run, and only after checking the baseline.
- Keep the user in control when the work boundary widens.
- Prefer narrow, reviewable edits over broad refactors.
- Commit, push, or open a PR only when the user explicitly asks.

## Inputs

Identify:

- The selected Work Unit, Goal, Out of Scope, Work Steps, Risks, and Checks from `brainstorm`.
- Any `test-brief` files, Test Intent, expected pass/fail state, and implementation handoff.
- Relevant issue brief evidence: API endpoints, Figma nodes, Jira comments, and confirmed requirements.
- Relevant dev wiki conventions for the project, domain, test layer, API boundary, styling, and workflow.
- User constraints such as "1번만", "테스트는 건드리지 마", "type-gen은 하지 마", or "커밋까지".

If the selected unit is unclear, ask for the Work Unit or brainstorm output before editing.

## Baseline

Before editing:

- Run `git status --short` in the target repo.
- Note existing modified/untracked files and treat them as user-owned unless clearly created in this run.
- Read the files needed to understand the selected unit and existing patterns.
- Define an expected change surface in your own reasoning: likely app files, tests, generated files, and config directly tied to the selected unit.

If existing user changes overlap the target files, read them carefully and work with them. If they make the selected unit unsafe to implement, stop and explain the conflict.

## Dev Wiki Conventions

Use the project dev wiki as implementation guidance, not as a separate cleanup mission.

Before implementation:

- Resolve the project dev wiki through `${CODEX_HOME:-~/.codex}/workbench/dev-wiki` when available.
- Read only the convention notes relevant to the selected unit: architecture boundaries, API client rules, generated type rules, testing patterns, UI/component conventions, naming, routing, or workflow commands.
- If the dev wiki is not configured or has no relevant notes, continue from repository evidence and mention that briefly.

During implementation:

- Apply relevant dev wiki conventions to files changed for the selected Work Unit.
- If a touched file already violates a relevant convention and fixing it is necessary to complete the selected unit cleanly, include that local refactor in the same work.
- Keep convention fixes local to the selected unit's files or direct impact area.
- Do NOT start a repo-wide convention cleanup.
- Do NOT fix convention violations in unrelated files just because they are noticed.
- Do NOT replace a dev wiki mandated workflow with a manual patch just to keep the diff smaller. For example, if the wiki says OpenAPI types come from `type-gen`, do not hand-edit generated type contracts as the normal path.
- If following a convention changes shared architecture, generated contracts, or unrelated modules, treat it as scope expansion and stop before continuing.
- If the selected unit cannot follow a relevant convention without widening scope, report the conflict and ask whether to split, include, or change the approach.

## Naming And Public API Conventions

Treat names in touched implementation boundaries as part of the implementation, not as untouchable legacy surface.

- When the selected Work Unit modifies a file that exports functions, actions, hooks, components, types, or schemas, check those exported names against relevant dev wiki and local naming conventions.
- If an exported name in a touched file violates convention and its direct import/update surface is inside the selected unit's impact area, rename it and update those direct imports in the same run.
- Do NOT keep a non-conforming export name only because existing UI code imports it.
- Do NOT use "public API preservation" as the default answer for app-internal exports such as server actions, hooks, or domain helpers. Prefer convention-compliant names when the affected imports are local and reviewable.
- Preserve an existing non-conforming name only when renaming would cross a package boundary, require migration work outside the selected unit, break an external contract, or contradict an explicit user constraint.
- If renaming to match convention affects many unrelated modules, treat that as scope expansion and stop with the options: rename within this unit, split naming cleanup into a separate unit, or keep legacy name for now.
- If a compatibility wrapper is needed temporarily, explain why and mark it as a scope decision rather than silently leaving the convention mismatch.
- At handoff, explicitly report convention-driven renames or local refactors: old name, new name, files updated, and why the convention required it.

## Scope Discipline

Treat implementation as a scope contract.

Allowed changes usually include:

- Files directly named by the selected Work Unit.
- Nearby components, hooks, actions, schemas, or tests required by those files.
- Test files created or updated by `test-brief`.
- Generated files for the selected API/schema only.
- Configuration entries needed to expose the selected API/schema.
- Local refactors in touched files when required to satisfy relevant dev wiki conventions for the selected unit.
- Direct import/call-site updates required by convention-compliant renames inside the selected unit's impact area.

Scope expansion signals include:

- Generated files for unrelated APIs or domains.
- Fixes in unrelated routes, roles, admin/member flows, layouts, or shared features.
- Dependency, lockfile, formatter, or config churn not required by the selected unit.
- Type-check or lint fixes outside the selected unit.
- Large rewrites caused by an automation command.
- Convention cleanup outside the selected unit's files or direct impact area.
- Naming migrations that spread into unrelated domains or package-level public APIs.

When scope expansion appears:

1. Stop before making follow-up fixes in the expanded area.
2. Report the changed files and why they are outside or adjacent to the selected unit.
3. Recommend one of:
   - include the expansion because it is inseparable from the selected unit,
   - split it into a separate unit/commit,
   - avoid the broad command or revert only this run's unrelated generated changes.
4. Continue only after the user chooses, unless there is a clearly safe way to keep the work scoped.

## Generated Files And Bulk Commands

Use extra care with commands such as `type-gen`, codegen, formatters, migrations, codemods, and dependency updates.

Before a bulk command:

- State what files you expect it to change.
- Prefer a narrow generator target if the project supports it.
- Ensure the working tree baseline is understood.

After a bulk command:

- Run `git diff --name-status` or an equivalent focused diff.
- Compare the result to the expected change surface.
- If unrelated generated files changed, do NOT start fixing their consumers automatically.
- For example, in an `admin-menu` unit, `admin-menu.d.ts` and `oas.json` may be in scope, but `admin.d.ts`, `role.d.ts`, and role/member action fixes are scope expansion unless the brainstorm explicitly included them.
- If dev wiki requires a generator such as `type-gen`, prefer running it and then stopping on unrelated generated diffs over manually editing generated contracts. Manual edits are allowed only when the repo convention permits them or the user explicitly chooses that tradeoff.

## Workflow

1. Restate the selected unit, goal, and out of scope before editing when the task is non-trivial.
2. Establish the baseline and expected change surface.
3. Read only the relevant dev wiki conventions and repository examples for the selected unit, including naming/export conventions for files you will touch.
4. If `test-brief` exists, run or inspect the focused tests first and preserve the declared Test Intent.
5. Implement the smallest next phase from `brainstorm` Work Steps while applying relevant conventions locally.
6. After each broad command or meaningful edit batch, inspect the diff for scope expansion.
7. Run focused verification first, then broader checks only when they are relevant and practical.
8. Report changed files, validation results, dev wiki convention notes, and any scope decisions.

## Test Handling

- Respect `test-brief` Test Intent.
- Treat test-brief tests as the implementation contract for this executor run.
- For Compatibility / characterization tests, keep them passing before and after the implementation when practical.
- For Red / target contract tests, confirm the failure is expected before implementation and make it pass through scoped production changes.
- For Regression tests, ensure the test proves the bug fix rather than implementation details.
- Do NOT change test assertions, fixtures, expected shapes, or Test Intent to fit the implementation.
- Allowed test edits are limited to mechanical fixes required by the implementation context: import paths, renamed public APIs from the same selected unit, test harness setup, or type-only adjustments that do not weaken the original assertion.
- If a test appears wrong, stale, over-specific, or contradictory to dev wiki or confirmed requirements, stop and explain the conflict. Ask whether to update the test contract instead of editing it automatically.
- If implementation reveals that the test and selected unit disagree, prefer changing production code to satisfy the test when scoped and correct. Otherwise stop with a **Test Contract Conflict** note.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep code identifiers, paths, commands, issue keys, field names, and URLs exact.

```markdown
**Executor**

- Target Unit: <selected unit>
- Scope: <intended change surface>
- Baseline: <existing dirty files or clean>
- Dev Wiki: <relevant conventions applied or "not configured / no relevant note">

**Implemented**
- <changed behavior/file group>
- <changed behavior/file group>

**Scope Notes**
- <none, or scope expansion found and decision taken>

**Convention Changes**
- <none, or old name -> new name / local refactor and affected files>

**Validation**
- <command>: <pass/fail/blocked>

**Handoff**
- <remaining risk, manual check, or next small unit>
```

If you must stop for scope expansion, use:

```markdown
**Scope Expansion Detected**

- Target Unit: <selected unit>
- Expected Scope: <files/domains expected>
- Unexpected Changes: <files/domains changed>
- Why It Matters: <review/collaboration risk>
- Recommendation: <include / split / avoid or revert this run's unrelated changes>
```

If you must stop because tests should not be changed automatically, use:

```markdown
**Test Contract Conflict**

- Target Unit: <selected unit>
- Test Contract: <test file/assertion/fixture involved>
- Conflict: <why implementation cannot satisfy it as written>
- Recommendation: <keep test and change implementation / revise test contract / split work>
```

## Quality Bar

A good executor run should let a reviewer see exactly why every changed file belongs to the selected Work Unit.
