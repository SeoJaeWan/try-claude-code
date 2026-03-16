---
name: backend-dev
description: Backend API development, database integration, and authentication. Auto-detects framework and language from project files. Use for API endpoints, DB operations, server logic, and backend testing.
model: opus
context: fork
agent: backend-developer
---

<Skill_Guide>
<Purpose>
Backend API development, database integration, and authentication. Auto-detects framework and language from project files. Use for API endpoints, DB operations, server logic, and backend testing.
</Purpose>

<Instructions>
# backend-dev

Expert backend development workflow.

---

## Required CLI Usage

Use the `tcb` CLI when developing backend modules. All project module, entity, and DTO rules are defined in `tcb help --text` — read it before starting any work. Use `tcb <command> --apply` when scaffolding is needed.

---

## HTTP Error Response Handling

Every API endpoint must include proper error responses.

| Status | When to use | Example |
|---|---|---|
| `400 Bad Request` | Invalid input, validation failure | DTO validation fails |
| `401 Unauthorized` | Missing or invalid authentication | No/expired JWT token |
| `403 Forbidden` | Insufficient permissions | User accessing admin route |
| `404 Not Found` | Resource does not exist | `GET /products/:id` with non-existent ID |
| `409 Conflict` | Duplicate resource or state conflict | Creating user with existing email |

---

## Implementation Steps

1. Read plan from `plans/{task-name}/plan.md`
2. Read `codemaps/backend.md`, `codemaps/database.md` (if present)
3. **Run `tcb help --text`** to learn the module rules, then use `tcb` throughout development
4. Implement logic inside the generated files
5. If plan includes `tests/`: copy test files to source tree, run Red verification
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. Run tests — confirm ALL pass (Green)
8. If plan includes `e2e/`: if E2E fails, fix implementation, NOT tests
9. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
