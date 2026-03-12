# E2E Constraint Coverage Rules

Mandatory coverage requirements for `plan-e2e-test`.

---

## Core Rules

1. **Every in-scope browser-integration constraint ID** in `plan.md` must map to **at least one Playwright test case**.
2. Each in-scope browser-integration constraint must include **at least**:
   - Interaction-path scenario >= 1 (user completes the intended feature interaction successfully inside the bounded surface)
3. Constraints involving **user input** must also include:
   - Validation/error scenario >= 1 (user sees error feedback for invalid input)
4. Constraints involving **feature-local navigation** must include:
   - Navigation assertion (tab, modal, drawer, or sub-route transition that stays inside the same feature shell)
5. Every mapped test name must **include its constraint ID token** (`[C-...]`).
6. Constraints intentionally deferred to `playwright-guard` must be listed in `manifest.md` and excluded from the `plan-e2e-test` coverage denominator.
7. If coverage is incomplete, **do not mark test generation complete**.
8. If non-sequential track plans exist, coverage must be computed per track and no in-scope track surface may be omitted.

---

## Scope Boundary: E2E vs Unit

Not all constraints need E2E coverage. Apply this filter:

| Constraint type                                     | `plan-e2e-test` coverage?   | Reason                                                  |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| User-visible feature behavior on one screen/surface | Yes                         | Planning-time browser integration contract              |
| Form validation (client-side)                       | Yes                         | User sees error messages                                |
| Loading/success/error state within a feature        | Yes                         | User sees browser-visible integration state             |
| Multi-route journey / redirect chain                | No (use `playwright-guard`) | Full-flow coverage belongs to post-implementation guard |
| Auth/session persistence across pages               | No (use `playwright-guard`) | Requires full-flow browser journey coverage             |
| Internal business logic                             | No (use `plan-unit-test`)   | Not directly user-observable                            |
| Data transformation                                 | No (use `plan-unit-test`)   | Internal processing                                     |
| Server-side validation only                         | No (use `plan-unit-test`)   | Not visible without UI layer                            |

When a constraint spans both internal logic and user-visible behavior, both `plan-unit-test` and `plan-e2e-test` should cover it at their respective boundaries.

---

## Coverage Verification

Before completing the `plan-e2e-test` workflow:

1. List all constraint IDs from `plan.md`
2. Classify each as `browser-integration`, `full-flow-guard`, or `internal-only`
3. For each `browser-integration` ID, verify at least one interaction-path Playwright test exists
4. For input-related constraints, verify validation/error scenarios exist
5. Verify every `full-flow-guard` item is listed in `manifest.md`
6. Calculate coverage: `browser-integration covered / browser-integration total * 100`
7. **100% required** for browser-integration constraints - no exceptions
8. Verify each implementation track has its own `e2e/manifest.md` (or explicit `N/A`) and root index links it

---

## Manifest Format

The `e2e/manifest.md` must include a coverage summary:

```markdown
## Coverage

- Total constraints in plan: {N}
- Browser-integration constraints: {N}
- Constraints with interaction-path coverage: {N}
- Constraints with validation/error coverage: {N}
- Deferred full-flow guard constraints: {N}
- Internal-only constraints (deferred to plan-unit-test): {N}
- Browser-integration coverage: 100%
```

For non-sequential mode, keep this format per track at `plan-{track}/e2e/manifest.md` and maintain a root index manifest at `plans/{task-name}/e2e/manifest.md`.

If coverage is incomplete, list missing items:

```markdown
## Missing Coverage

- [ ] [C-XXX-001] - no interaction-path Playwright test found
- [ ] [C-XXX-002] - no validation/error E2E test found
```

---

## data-testid Traceability

- Every `data-testid` used in test files must be registered in `manifest.md`
- The registry serves as a contract: implementation must apply these attributes
- If a `data-testid` changes during implementation, it indicates a contract violation
- Use `grep -r "getByTestId" e2e/` to verify all locators are documented
- When using one-domain-one-spec structure, verify the registry still covers all `test.describe` blocks in that spec
