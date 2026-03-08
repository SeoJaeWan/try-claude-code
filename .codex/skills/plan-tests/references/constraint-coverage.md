# Constraint Coverage Rules

Mandatory coverage requirements for plan-tests skill.

---

## Core Rules

1. **Every constraint ID** in plan.md must map to **at least one test case**.
2. Each constraint must have **both**:
   - Positive case >= 1 (expected success behavior)
   - Negative case >= 1 (expected failure/edge behavior)
3. Every mapped test name must **include its constraint ID token** (`[C-...]`).
4. If coverage is incomplete, **do not mark test generation complete** even if existing tests pass.

---

## Coverage Verification

Before completing the plan-tests workflow:

1. List all constraint IDs from plan.md
2. For each ID, verify at least one `it('[C-xxx] ...')` test exists
3. For each ID, verify both positive and negative variants exist
4. Calculate coverage: `covered / total * 100`
5. **100% required** — no exceptions

---

## Manifest Format

The `manifest.md` must include a coverage summary:

```markdown
## Coverage

- Total constraints: {N}
- Covered constraints: {N}
- Coverage: 100%
```

If coverage < 100%, list missing constraints:

```markdown
## Missing Coverage

- [ ] [C-XXX-001] — no test case found
- [ ] [C-XXX-002] — missing negative case
```

---

## Traceability

- Constraint ID in test name enables grep-based traceability
- `grep -r "C-AUTH-001" __tests__/` should return at least 2 results (positive + negative)
- This supports plan review and post-implementation auditing
