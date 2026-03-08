---
name: plan-tests
description: Codex skill for generating constraint-mapped unit test files as plan artifacts. Called by architect after plan.md creation.
---

<Skill_Guide>
<Purpose>
Generate constraint-mapped unit test files as plan artifacts during the planning phase. Tests are stored alongside the plan and later copied by developers for TDD execution.
</Purpose>

<Instructions>
# plan-tests

Generate unit test files mapped to plan.md constraint IDs. These tests become plan artifacts that developers copy into the source tree for Red-Green TDD.

---

## Inputs to inspect

1. `./plans/{task-name}/plan.md` - constraint IDs (`[C-...]`) and test targets
2. `./.codex/skills/plan-tests/references/testing-conventions.md` - test writing rules
3. `./.codex/skills/plan-tests/references/constraint-coverage.md` - coverage rules

---

## Workflow

### Step 1. Extract test targets from plan.md

- Parse all constraint IDs (`[C-...]`) from plan.md
- Identify testable code units: hooks, services, utilities, state management
- Skip document-only or config-only changes (no testable units)

### Step 2. Read reference documents

- Read `./references/testing-conventions.md` (test writing rules)
- Read `./references/constraint-coverage.md` (coverage rules)

### Step 3. Generate test files

For each testable unit, generate a test file following these rules:

- **Korean spec descriptions** in `describe`/`it` blocks
- **AAA pattern** with explicit `// Arrange`, `// Act`, `// Assert` comments
- **Constraint ID** in the test name: `it('[C-AUTH-001] ...', ...)`
- **Positive case** >= 1 per constraint
- **Negative case** >= 1 per constraint
- **Frontend**: Vitest + happy-dom (`renderHook + act` for hooks, `render` for components)
- **Backend**: Jest + NestJS Testing (direct call for services, Supertest for endpoints)
- **Mocking**: MSW for API, `vi.fn()` / `jest.fn()` for functions

### Step 4. Save test files as plan artifacts

Save generated tests to `./plans/{task-name}/tests/` with source path mirroring:

```
plans/{task-name}/tests/
|- manifest.md
|- src/hooks/useLogin/__tests__/index.test.ts
|- src/hooks/useLoginForm/__tests__/index.test.ts
`- src/services/authService/__tests__/index.test.ts
```

The path under `tests/` mirrors the destination path in the source tree. Developers strip the `tests/` prefix to determine where to copy each file.

### Step 5. Write manifest.md

Create `tests/manifest.md` with:

```markdown
# Test Manifest

## Files

| Test File | Destination | Constraints |
|-----------|-------------|-------------|
| `src/hooks/useLogin/__tests__/index.test.ts` | `src/hooks/useLogin/__tests__/index.test.ts` | [C-AUTH-001], [C-AUTH-002] |
| ... | ... | ... |

## Coverage

- Total constraints: N
- Covered constraints: N
- Coverage: 100%
```

### Step 6. Verify constraint coverage

- Every constraint ID in plan.md must map to >= 1 test case
- Every constraint must have both positive and negative cases
- If coverage < 100%, add missing tests before completing
- Do not mark complete until coverage is 100%

---

## Output contract

- `./plans/{task-name}/tests/manifest.md`
- `./plans/{task-name}/tests/{mirrored-source-path}`
- Output language: Korean (test specs)

## Guardrails

- **Test files only**: Do not write implementation/production code
- **No E2E tests**: E2E is handled by Playwright Test Agents
- **Plan artifacts only**: Tests are stored in `plans/`, not in the source tree
- **Constraint coverage 100%**: Mandatory before completion
</Instructions>
</Skill_Guide>
