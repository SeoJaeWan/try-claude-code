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

All file creation goes through `tcb` CLI. Never create module/entity/DTO files manually — the CLI enforces naming, package structure, and DB conventions that are impossible to get right by hand.

---

## CLI-First Workflow

Every module, entity, and DTO must be created via `tcb`. Run `tcb --help` first to see available commands.

```bash
# See all commands and rules
tcb --help

# Create a feature module (controller + service + repository + exception handler)
tcb module --json '{"name":"Product","path":"product","basePackage":"com.example.app"}' --apply

# Create DTOs
tcb requestDto --json '{"name":"CreateProductRequest","path":"product","basePackage":"com.example.app","fields":[{"name":"name","type":"String","validations":["NotBlank"]}]}' --apply
tcb responseDto --json '{"name":"ProductResponse","path":"product","basePackage":"com.example.app"}' --apply

# Create entity (snake_case DB fields enforced)
tcb entity --json '{"name":"Product","path":"product","basePackage":"com.example.app"}' --apply

# Batch multiple operations
tcb batch --json '{"ops":[...]}' --apply
```

After `tcb` creates the scaffold, implement the business logic inside the generated files.

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
3. **Run `tcb` CLI to create all module scaffolds with `--apply`** — this is the first action before writing any code
4. If plan includes `tests/`: copy test files to source tree, run Red verification
5. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
6. Implement logic inside the generated files
7. Run tests — confirm ALL pass (Green)
8. If plan includes `e2e/`: if E2E fails, fix implementation, NOT tests
9. Commit changes
10. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
