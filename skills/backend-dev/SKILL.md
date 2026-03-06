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

## MCP Integration

- **GitHub**: PR/issue management, branch operations

---

## Key Responsibilities

- API endpoint implementation (routing, validation, error handling)
- Database integration (ORM/query builder, migrations, schema)
- Authentication and authorization
- Caching strategy (where applicable)
- Backend testing (unit, integration)

---

## TDD Workflow

1. **Copy test files** from `.claude/try-claude/plans/{task-name}/tests/` to source tree
   - Read `tests/manifest.md` for file list and destination paths
   - Strip `tests/` prefix to get destination path
2. **Red verification**: run test command — tests must FAIL
3. **Implement** API/services to pass tests
4. **Green verification**: run test command — ALL pass

---

## Implementation Steps

1. **Detect stack** (Step 0 above)
2. Read plan from `.claude/try-claude/plans/{task-name}/plan.md`
3. Copy test files from `.claude/try-claude/plans/{task-name}/tests/` to source tree (read `manifest.md` for paths)
4. Red verification: run test command — confirm tests FAIL
5. Read domain.md (business logic)
6. Read CODEMAPS/backend.md, database.md (if present)
7. Read coding-rules/ (conventions, if present)
8. Use WebSearch/WebFetch if needed (framework docs, ORM docs)
9. Confirm the current branch matches plan header (`**Branch:**`)
10. Implement according to detected framework's conventions
11. Run tests — confirm ALL pass (Green)
12. Run type/compile check:
    - TypeScript: `pnpm run typecheck` or `pnpm exec tsc --noEmit`
    - Java/Kotlin: build includes compilation
    - Python: `mypy` (if configured)
    - Go: `go build ./...`
13. Verify and auto-fix lint (use project's configured linter)
14. Commit changes
15. Return results based on plan.md

---

## Database Guidelines

- Follow project's naming conventions (refer to coding-rules if present)
- Always create migration files for schema changes
- Test migrations locally before applying
- Document schema changes
  </Instructions>
  </Skill_Guide>
