---
name: executor
description: Implement or diagnose exactly one selected work unit from a brainstorm or test brief while guarding scope and following dev wiki conventions. Use when the user says "executor", "excutor", "실행해", "구현해", "1번 작업 진행", "이 작업 진행", or asks Codex to implement a brainstormed Work Unit with tests, validation, diagnostic measurement for unknown-cause bugs, dev wiki guidance, visual grounding for UI comparison when source evidence exists, and scope-expansion checks. This skill may edit code, tests, generated files, and configuration only when they are directly required by the selected unit.
---

# Executor

Use this skill after `issue-brief`, `brainstorm`, and optionally `test-brief` when the user wants one selected work unit implemented.

The goal is not to run a large autonomous plan. The goal is to finish one reviewable unit while making scope boundaries visible, especially when generators, formatters, or shared types change files outside the selected unit.

For normal low-uncertainty work, keep execution direct and scoped. For unknown-cause bugs, finishing the unit may first mean proving the cause through reproduction and measurement before applying a production fix. Do not skip the diagnostic loop just because a plausible fix is obvious, but also do not force deep diagnostics onto work whose cause and completion condition are already clear.

## Core Rules

- Implement only the selected Work Unit.
- Do NOT implement neighboring Work Units unless the user explicitly expands scope.
- Do NOT reinterpret, renumber, or replace the brainstorm target with a different Issue Brief Work Unit.
- Do NOT silently fix unrelated type errors, lint errors, generated files, routes, domains, or tests.
- Do NOT proceed through a scope expansion as if it is normal implementation work.
- Do NOT rewrite test-brief assertions, fixtures, or expected contracts to make the implementation easier.
- Do NOT implement a suspected fix for an unknown-cause bug before reproducing or measuring the symptom, unless the root cause is already confirmed by evidence.
- Do NOT replace a cheap user/reporter clarification with expensive instrumentation when the user is available and the answer would distinguish the same hypotheses.
- Do NOT keep running diagnostics after the cause is confirmed. Return to normal scoped implementation.
- Do NOT treat automation failure, screenshot mismatch, coordinate failure, or flaky behavior as product failure until the measurement tool itself has been checked.
- Do NOT bypass relevant dev wiki conventions with manual workarounds when the convention directly applies.
- Do NOT preserve non-conforming names or public exports merely because they already existed.
- Do NOT revert user changes. Only consider reverting changes made during this executor run, and only after checking the baseline.
- Keep the user in control when the work boundary widens.
- Prefer narrow, reviewable edits over broad refactors.
- Commit, push, or open a PR only when the user explicitly asks.

## Inputs

Identify:

- The selected Work Unit, Goal, Out of Scope, Work Steps, Risks, and Checks from `brainstorm`.
- The `brainstorm` **Issue Brief Alignment**: Source Unit, Original Change, Original Check, Adjacent Units Excluded, Alignment, and Workflow Drift.
- Any `brainstorm` Diagnostic Plan: Symptom, Known Facts, Unconfirmed Assumptions, Hypotheses, Measurement Risk, Runtime Matrix, and Completion Condition.
- Any `test-brief` files, Test Intent, expected pass/fail state, and implementation handoff.
- Any `test-brief` Measurement / Promotion Criteria: diagnostic artifacts, what they prove, measurement-tool checks, cleanup criteria, and promotion criteria.
- Relevant issue brief evidence: API endpoints, Figma nodes, Jira comments, and confirmed requirements.
- Relevant prompt-provided evidence: confirmed facts, unconfirmed assumptions, reported symptoms, expected/actual behavior, reproduction clues, runtime context, and user hypotheses.
- Visual comparison evidence for UI/image-facing work: Figma nodes, source website URLs, reference screenshots, target local route, viewport, and expected state.
- Relevant dev wiki conventions for the project, domain, test layer, API boundary, styling, and workflow.
- User constraints such as "1번만", "테스트는 건드리지 마", "type-gen은 하지 마", or "커밋까지".

If the selected unit is unclear, ask for the Work Unit or brainstorm output before editing.

## Brainstorm Contract

Use the latest relevant `brainstorm` output as the implementation contract for this run.

Before editing:

- Extract the exact Target Unit, Goal, Out of Scope, Issue Brief Alignment, Work Steps, Risks, and Checks from `brainstorm`.
- Treat `Issue Brief Alignment.Source Unit`, `Original Change`, and `Original Check` as the selected Work Unit's identity. Do not replace them with a neighboring Issue Brief unit based on repository findings.
- Treat `Adjacent Units Excluded` and brainstorm **Out of Scope** as hard boundaries unless the user explicitly expands scope.
- Map the expected change surface to brainstorm Work Steps and Checks. If a change cannot be tied to the brainstorm contract, treat it as scope expansion.
- If repository state contradicts the brainstorm contract, stop before editing and report a **Brainstorm Contract Conflict**. Examples: the brainstorm targeted unit 4 but code evidence points to unit 6, a prerequisite unit is missing, or the selected unit appears already complete.
- If the user explicitly overrides the brainstorm target, restate the override as a scope decision before editing.

Do not use `issue-brief` directly to choose a different unit once a brainstorm handoff exists. Use issue-brief only to clarify the brainstorm contract or detect a mismatch.

## Baseline

Before editing:

- Run `git status --short` in the target repo.
- Note existing modified/untracked files and treat them as user-owned unless clearly created in this run.
- Read the files needed to understand the selected unit and existing patterns.
- Define an expected change surface in your own reasoning: likely app files, tests, generated files, and config directly tied to the selected unit.

If existing user changes overlap the target files, read them carefully and work with them. If they make the selected unit unsafe to implement, stop and explain the conflict.

## Unknown-Cause Bug Mode

Use this mode when the selected unit is a bug report and the root cause is not confirmed.

Do not use this mode for every bug fix. If the failing line, broken contract, or needed behavior is already established, implement the scoped fix and verify it at the appropriate layer.

The loop is:

```text
reproduce
-> measure
-> falsify hypotheses
-> confirm cause
-> apply smallest cause-level fix
-> quantitatively re-verify
-> remove temporary probes
```

Rules:

- Reproduce before fixing. If a full repro is not possible, create the cheapest useful observation that distinguishes likely causes.
- Keep confirmed facts, unconfirmed assumptions, and hypotheses separate in your reasoning and handoff.
- Maintain multiple plausible hypotheses until measurements eliminate them.
- Attach a falsification or confirmation check to each hypothesis before editing production code.
- Start with cheap checks: `rg`/static read, asking the reporter for environment details when available, DOM stack, event trace, focused script, repeated run, runtime matrix, and only then temporary source probes when external observation is insufficient.
- Validate the measurement tool itself when the result depends on coordinates, overlays, screenshots, timers, mocked APIs, browser automation, cached builds, or flaky ordering.
- For flaky symptoms, measure frequency before and after the fix with repeated runs. Treat very small samples as directional evidence; use more repetitions or runtime modes before calling the fix stable when the cost of being wrong is high.
- Compare relevant runtime modes when they can change behavior: dev/prod, StrictMode, HMR/fresh start, viewport, browser, auth/data state, feature flag, or mobile/webview.
- Use temporary scripts or probes when needed, but remove temporary source probes and task-only diagnostics before handoff unless the user explicitly wants them kept.
- Promote only valuable, stable regression checks to committed tests or verification scripts. Do not commit one-off diagnostics that only served cause discovery.
- If no hypothesis can be distinguished with the available environment, stop with the evidence gathered and the smallest missing input instead of guessing.
- Return to normal implementation mode as soon as the cause is confirmed enough to justify a scoped fix.

Cause-level fixes:

- Prefer removing or correcting the cause over masking the symptom.
- Be especially cautious with deleting cleanup, lifecycle, cancellation, or guard code. State why the deleted behavior is safe or covered elsewhere.
- If a byproduct bug is found inside the same responsibility boundary and the fix is narrow, it may be included. Treat unrelated cleanup as scope expansion.

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

## Temporary Compatibility Code

Use this section when the selected unit needs short-lived code to keep the project compiling or running while the broader workflow is removing or replacing a legacy surface.

Examples include a helper around a soon-to-be-removed type, an adapter for an old API response shape, a compatibility wrapper for a renamed export, or a guard that exists only until the next Work Unit removes the old path.

Rules:

- Prefer avoiding temporary compatibility code when a small scoped fix can remove the legacy dependency now.
- Add temporary compatibility code only when it is required for the selected unit to pass without implementing neighboring Work Units.
- Keep the compatibility layer narrow, local, and easy to delete. Do not turn it into a new abstraction or public API unless the selected unit explicitly requires that.
- Mark each intentional temporary compatibility block with a searchable comment:
  `REMOVE: <why this exists now>; remove when <condition/work unit>`
- Put the marker next to the wrapper, helper, adapter, fallback branch, or legacy type use that should be removed. Do not hide it only in the final message.
- Include the removal trigger in the marker: the follow-up Work Unit, migration step, API contract switch, generated type removal, feature flag cleanup, or issue key when available.
- Do NOT mark ordinary technical debt, unrelated cleanup, or speculative future refactors as `REMOVE:`. Use this marker only when the current workflow already expects the code to disappear.
- If the project already has a local convention such as `TODO_REMOVE`, `@deprecated`, or issue-linked TODOs, follow that convention while preserving the `REMOVE:` text when possible.
- At handoff, list every `REMOVE:` marker added or preserved, including file path, symbol/branch, reason, and removal trigger.

## Naming And Public API Conventions

Treat names in touched implementation boundaries as part of the implementation, not as untouchable legacy surface.

- When the selected Work Unit modifies a file that exports functions, actions, hooks, components, types, or schemas, check those exported names against relevant dev wiki and local naming conventions.
- If an exported name in a touched file violates convention and its direct import/update surface is inside the selected unit's impact area, rename it and update those direct imports in the same run.
- Do NOT keep a non-conforming export name only because existing UI code imports it.
- Do NOT use "public API preservation" as the default answer for app-internal exports such as server actions, hooks, or domain helpers. Prefer convention-compliant names when the affected imports are local and reviewable.
- Preserve an existing non-conforming name only when renaming would cross a package boundary, require migration work outside the selected unit, break an external contract, or contradict an explicit user constraint.
- If renaming to match convention affects many unrelated modules, treat that as scope expansion and stop with the options: rename within this unit, split naming cleanup into a separate unit, or keep legacy name for now.
- If a compatibility wrapper is needed temporarily, mark it with `REMOVE:` and explain why as a scope decision rather than silently leaving the convention mismatch.
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

- Changes that implement an adjacent Issue Brief Work Unit rather than the brainstorm Target Unit.
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

## Visual Grounding For UI Work

Use `visual-grounding` when all of these are true:

- The selected Work Unit changes visible UI, layout, styling, responsive behavior, image presentation, or component state.
- A comparison source exists: Figma frame/node, source website, production page, or reference screenshot.
- The target route/component state can be opened or reasonably captured in the local implementation.

Do not use `visual-grounding` for pure API wiring, text-only copy changes, internal logic, or UI work without a source-to-target mapping.

When using `visual-grounding`:

1. Before implementation, use it to extract actionable source evidence when the design/source UI is needed to choose the implementation approach.
2. After the first implementation pass, use it again when practical to compare the source UI with the local result.
3. Fix only High-confidence findings automatically. Inspect code before fixing Medium-confidence findings. Report Low-confidence findings without changing code.
4. Treat broad design-system/token rewrites, fixture changes, or unrelated route fixes discovered by visual grounding as scope expansion.
5. Include the visual-grounding artifact path or a short summary in the final handoff.

Visual-grounding findings do not override dev wiki conventions or the selected Work Unit boundary. They are evidence for scoped UI fixes, not permission to redesign neighboring surfaces.

## Workflow

1. Restate the selected unit, source Issue Brief unit, goal, and out of scope from `brainstorm` before editing when the task is non-trivial.
2. Establish the baseline and expected change surface.
3. Verify the brainstorm contract against the visible Issue Brief fields and current repository state. Stop with **Brainstorm Contract Conflict** if the target unit is missing, ambiguous, contradicted, or actually points to a neighboring unit.
4. Read only the relevant dev wiki conventions and repository examples for the selected unit, including naming/export conventions for files you will touch.
5. If the unit is an unknown-cause bug, execute the diagnostic loop before production edits unless the root cause is already confirmed.
6. If the unit is UI/image-facing and has comparison evidence, use `visual-grounding` to collect source/target evidence before or during implementation.
7. If `test-brief` exists, run or inspect the focused tests first and preserve the declared Test Intent. If it is a Measurement brief, create only the diagnostic artifacts needed to prove or falsify the stated hypotheses.
8. Implement the smallest next phase from `brainstorm` Work Steps while applying relevant conventions locally.
9. After each broad command or meaningful edit batch, inspect the diff for scope expansion.
10. For UI/image-facing work with comparison evidence, run a practical post-implementation `visual-grounding` check and apply only scoped High-confidence fixes.
11. If temporary compatibility code was added, confirm each block has a `REMOVE:` marker with a reason and removal trigger.
12. Run focused verification first, then broader checks only when they are relevant and practical. For unknown-cause bugs, include the same quantitative check that reproduced or measured the issue before the fix.
13. Remove temporary probes, task-only diagnostic files, and debug logging unless they were intentionally promoted to permanent regression coverage.
14. Report changed files, diagnostic findings, validation results, visual-grounding findings or artifact path, dev wiki convention notes, promoted checks, cleanup, `REMOVE:` markers, and any scope decisions.

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
- For Measurement brief artifacts, do not treat every temporary script as a permanent test contract. Use them to establish facts, then delete, report, or promote according to the brief.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep code identifiers, paths, commands, issue keys, field names, and URLs exact.

```markdown
**Executor**

- Target Unit: <selected unit>
- Brainstorm Contract: <source Issue Brief unit, original change/check, alignment status>
- Scope: <intended change surface>
- Baseline: <existing dirty files or clean>
- Dev Wiki: <relevant conventions applied or "not configured / no relevant note">
- Diagnostics: <not applicable / symptom reproduced / hypotheses falsified / cause confirmed / blocked>
- Visual Grounding: <not applicable / artifact path / findings applied / blocked reason>

**Implemented**
- <changed behavior/file group>
- <changed behavior/file group>

**Scope Notes**
- <none, or scope expansion found and decision taken>

**Convention Changes**
- <none, or old name -> new name / local refactor and affected files>

**Temporary Compatibility**
- <none, or `REMOVE:` marker path/symbol, reason, and removal trigger>

**Validation**
- <command>: <pass/fail/blocked>
- <diagnostic/reproduction check>: <before/after result, repeated-run count, runtime modes when relevant>

**Diagnostic Cleanup**
- <temporary probes/scripts removed, promoted checks, or "not applicable">

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

If you must stop because the brainstorm handoff does not match the Issue Brief or repository state, use:

```markdown
**Brainstorm Contract Conflict**

- Brainstorm Target: <target unit from brainstorm>
- Issue Brief Source Unit: <number/title/change/check from Issue Brief, if visible>
- Conflict: <mismatch, skipped prerequisite, adjacent unit confusion, already-complete state, or missing original unit>
- Recommendation: <use this brainstorm as-is / redo brainstorm for the correct unit / switch target with explicit user approval / split prerequisite work>
```

## Quality Bar

A good executor run should let a reviewer see exactly why every changed file belongs to the selected Work Unit.
