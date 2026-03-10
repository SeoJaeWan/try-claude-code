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

If ambiguous, read the main entry file or config to confirm. Use the detected stack for all subsequent commands.

---

## Documentation References

**Read first:**

- `.claude/try-claude/references/coding-rules/` - Project coding rules (if present)
- `.claude/try-claude/codemaps/backend.md` - Existing API endpoints (if present)
- `.claude/try-claude/codemaps/database.md` - DB schema, tables (if present)
- `.claude/try-claude/references/domain.md` - Business logic and requirements

**Read plan:**

- `.claude/try-claude/plans/{task-name}/plan.md` - Implementation plan

**For latest docs, use WebSearch/WebFetch (official docs first).**

---

## Boilerplate Generation

For NestJS projects, generate module structure using coding-rules scripts:

```bash
# NestJS module structure
node .claude/try-claude/references/coding-rules/scripts/generate.mjs structure <moduleName> [--create]
```

> If scripts are not found (init-try not run), skip boilerplate generation and implement manually.

---

## Key Responsibilities

- API endpoint implementation (routing, validation, error handling)
- Database integration (ORM/query builder, migrations, schema)
- Authentication and authorization
- Caching strategy (where applicable)
- Backend testing (unit, integration)

---

## TDD Workflow

1. **Copy unit test files** from `.claude/try-claude/plans/{task-name}/tests/` to source tree
   - Read `tests/manifest.md` for file list and destination paths
   - Strip `tests/` prefix to get destination path
2. **Copy E2E test files** (if present) from `.claude/try-claude/plans/{task-name}/e2e/` to the project's e2e test directory
   - E2E tests are plan artifacts (contract-first) — do NOT modify them
3. **Red verification**: run test command — tests must FAIL
4. **Implement** API/services to pass tests
5. **Green verification**: run test command — ALL pass
6. **E2E verification** (if E2E tests exist): run Playwright — E2E must pass. If E2E fails, fix implementation, NOT tests.

---

## Implementation Steps

1. **Detect stack** (Step 0 above)
2. Read plan from `.claude/try-claude/plans/{task-name}/plan.md`
3. Copy unit test files from `.claude/try-claude/plans/{task-name}/tests/` to source tree (read `manifest.md` for paths)
4. Copy E2E test files (if present) from `.claude/try-claude/plans/{task-name}/e2e/` to the project's e2e test directory
5. Red verification: run test command — confirm tests FAIL
6. Read domain.md (business logic)
7. Read CODEMAPS/backend.md, database.md (if present)
8. Read coding-rules/ (conventions, if present)
9. Use WebSearch/WebFetch if needed (framework docs, ORM docs)
10. Confirm the current branch matches plan header (`**Branch:**`)
11. Implement according to detected framework's conventions
12. Run tests — confirm ALL pass (Green)
13. Run E2E tests (if present): confirm E2E pass. If E2E fails, fix implementation, NOT tests.
14. Run type/compile check:
    - TypeScript: `pnpm run typecheck` or `pnpm exec tsc --noEmit`
    - Java/Kotlin: build includes compilation
    - Python: `mypy` (if configured)
    - Go: `go build ./...`
15. Verify and auto-fix lint (use project's configured linter)
16. Commit changes
17. Return results based on plan.md

---

## Database Guidelines

- Follow project's naming conventions (refer to coding-rules if present)
- Always create migration files for schema changes
- Test migrations locally before applying
- Document schema changes
  </Instructions>
  </Skill_Guide>
