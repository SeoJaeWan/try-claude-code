# E2E Constraint Coverage Rules

Mandatory coverage requirements for `plan-e2e-test`.

---

## Core Rules

1. **Every UI-facing constraint ID** in `plan.md` must map to **at least one E2E test case**.
2. Each UI-facing constraint must include **at least**:
   - Happy-path scenario >= 1 (user completes the intended flow successfully)
3. Constraints involving **user input** must also include:
   - Validation/error scenario >= 1 (user sees error feedback for invalid input)
4. Constraints involving **navigation** must include:
   - Navigation assertion (URL, redirect, page transition verification)
5. Every mapped test name must **include its constraint ID token** (`[C-...]`).
6. If coverage is incomplete, **do not mark test generation complete**.

---

## Scope Boundary: E2E vs Unit

Not all constraints need E2E coverage. Apply this filter:

| Constraint type | E2E coverage? | Reason |
|-----------------|---------------|--------|
| User-visible UI behavior | Yes | User can observe/interact |
| Form validation (client-side) | Yes | User sees error messages |
| Navigation/routing | Yes | User experiences page transitions |
| API error display | Yes | User sees error feedback |
| Internal business logic | No (use `plan-unit-test`) | Not directly user-observable |
| Data transformation | No (use `plan-unit-test`) | Internal processing |
| Server-side validation only | No (use `plan-unit-test`) | Not visible without UI layer |

When a constraint spans both internal logic and user-visible behavior, both `plan-unit-test` and `plan-e2e-test` should cover it at their respective boundaries.

---

## Coverage Verification

Before completing the `plan-e2e-test` workflow:

1. List all constraint IDs from `plan.md`
2. Classify each as UI-facing or internal-only
3. For each UI-facing ID, verify at least one happy-path E2E test exists
4. For input-related constraints, verify validation/error scenarios exist
5. Calculate coverage: `UI-facing covered / UI-facing total * 100`
6. **100% required** for UI-facing constraints - no exceptions

---

## Manifest Format

The `e2e/manifest.md` must include a coverage summary:

```markdown
## Coverage

- Total constraints in plan: {N}
- UI-facing constraints: {N}
- Constraints with happy-path coverage: {N}
- Constraints with validation/error coverage: {N}
- Internal-only constraints (deferred to plan-unit-test): {N}
- E2E coverage: 100%
```

If coverage is incomplete, list missing items:

```markdown
## Missing Coverage

- [ ] [C-XXX-001] - no happy-path E2E test found
- [ ] [C-XXX-002] - no validation/error E2E test found
```

---

## data-testid Traceability

- Every `data-testid` used in test files must be registered in `manifest.md`
- The registry serves as a contract: implementation must apply these attributes
- If a `data-testid` changes during implementation, it indicates a contract violation
- Use `grep -r "getByTestId" e2e/` to verify all locators are documented
