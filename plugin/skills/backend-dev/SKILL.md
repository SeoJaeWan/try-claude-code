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

Expert backend development workflow. Framework and language are auto-detected from project files.

---

## Step 0. Detect Project Stack

Scan project root for framework signals before any implementation:

| Signal file | Framework | Language | Package manager | Test command |
|---|---|---|---|---|
| `package.json` + `@nestjs/core` | NestJS | TypeScript | pnpm/npm/yarn | `pnpm test` |
| `package.json` + `express` | Express | JS/TS | pnpm/npm/yarn | `pnpm test` |
| `package.json` + `fastify` | Fastify | JS/TS | pnpm/npm/yarn | `pnpm test` |
| `build.gradle` or `build.gradle.kts` | Spring Boot | Java/Kotlin | gradle | `./gradlew test` |
| `pom.xml` | Spring Boot | Java | maven | `mvn test` |
| `requirements.txt` or `pyproject.toml` | Django/FastAPI/Flask | Python | pip/poetry | `pytest` |
| `go.mod` | Go (Gin/Echo/Fiber) | Go | go mod | `go test ./...` |
| `Gemfile` + `rails` | Rails | Ruby | bundler | `bundle exec rspec` |

If ambiguous, read the main entry file or config to confirm.

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

### Checklist for every endpoint

- [ ] Single-resource GET/PUT/DELETE: return 404 if resource not found
- [ ] POST/PUT with body: validate input, return 400 on failure
- [ ] Unique constraints: return 409 on duplicate
- [ ] Auth-protected routes: return 401/403 appropriately

---

## Implementation Steps

1. **Detect stack** (Step 0 above)
2. Read plan from `plans/{task-name}/plan.md`
3. Read `codemaps/backend.md`, `codemaps/database.md` (if present)
4. If plan includes `tests/`: copy test files to source tree (read `manifest.md` for paths), run Red verification
5. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
6. **Use `tcb` CLI to create module scaffolds** — do NOT create module files manually:
   ```bash
   # Inspect current backend rules
   tcb --help
   tcb --help --text

   # Feature module
   tcb module <ModuleName> --path product --base-package com.example.app

   # DTOs and entity
   tcb requestDto <RequestName> --path product --base-package com.example.app
   tcb responseDto <ResponseName> --path product --base-package com.example.app
   tcb entity <EntityName> --path product --base-package com.example.app
   ```
7. Implement logic inside the generated files according to detected framework's conventions
8. Run tests — confirm ALL pass (Green)
9. If plan includes `e2e/`: if E2E fails, fix implementation, NOT tests
10. Commit changes
11. Return results based on plan.md

## CLI Notes

- `tcb --help` defaults to JSON for agent consumption.
- `tcb` personal v1 is Spring Boot oriented.
- Package path segments must be lower-case.
- If Spring root package cannot be auto-detected, pass `--base-package`.
  </Instructions>
  </Skill_Guide>
