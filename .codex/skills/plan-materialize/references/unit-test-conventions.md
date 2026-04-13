# Unit Test Conventions Reference

Use this when `plan-materialize` handles logic boundaries.

## Core rules

- Logic changes are unit-test mandatory for both frontend and backend
- Reuse the repository's existing runner, assertion style, mocking style, and file layout
- Update an existing boundary test before creating a new file
- Stop if unit-test setup is missing or placement is unclear
- Derive every new assertion from an explicit selected plan clause or a risk pattern already implied by that clause
- Do not add plan-external regression coverage

## Boundary selection

Prefer the narrowest meaningful public boundary:

- utility / validator / mapper
- hook / composable
- service / use case / domain policy
- controller / endpoint adapter when request mapping matters

Avoid broad component rendering tests when lower-boundary logic coverage is possible.
If one stable owner test can close multiple selected clauses, prefer that file over parallel coverage in sibling layers.
Do not create a new boundary test solely because the code exists; create it only when the selected plan clauses need that owner.

## Authoring rules

- Keep tests deterministic and isolated
- Use Korean `describe` / `it` intent text when the repo does not prohibit it
- Use `// Arrange`, `// Act`, `// Assert` comments when the local test style permits
- Include explicit happy-path, non-happy-path, edge, or exception coverage only when the selected plan clause or its risk pattern requires it
- Mock external boundaries only

## Risk-pattern coverage

When the scenario includes behavior-changing risk patterns, pin the invariant directly instead of relying on broad happy-path coverage.

- **Competing completion paths**: test both the winning path and the losing path that must become no-op
- **Deferred execution path**: test the deferred path at the public boundary that decides whether work still runs
- **Terminal state rule**: assert the final state explicitly when success/failure/error outcomes differ
- **Loser path must be no-op**: assert disallowed state changes and disallowed side effects do not happen
- **Side effect coupled to state**: assert the side effect happens only on the state transition allowed to emit it

These rules apply to frontend and backend equally:

- frontend examples: stale response must not overwrite the latest state, duplicate submit loser path, delayed redirect loser path
- backend examples: timeout loser path after manual completion, retry loser path, callback that must not emit after terminal error

Do not translate these patterns into ad-hoc keyword matching. Use the scenario contract from the plan.

## Final interpretation boundaries

If a feature introduces a new final interpretation boundary, do not stop at a selection or contract test.

- Examples: template rendering, UI message interpretation, mapped toast state, serialized outbound message, final view-model projection
- Pin the final interpreted output at the boundary that produces it
- Reuse existing transport or framework tests when the feature does not change that shared layer

## Update strategy

- If the same boundary already has a test file, update it
- If multiple files cover the same boundary, prefer the closest canonical file and avoid duplicate coverage
- Prefer the file that already owns the scenario's winner/loser rule, terminal-state rule, or final interpretation boundary when those are the main risk
- Only create a new file when no stable boundary-level test exists
- Allow `skip` only when the existing source-tree file already closes the exact selected clause without additional assertions
- Do not edit nearby passing tests for naming cleanup or suite hygiene when they are outside the selected plan clauses

## Placement

- Follow the repository's current placement convention
- Keep the test inside the source tree, not under `plans/`
- If the repository layout is ambiguous, stop and escalate
