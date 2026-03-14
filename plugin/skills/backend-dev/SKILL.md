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

- `references/coding-rules/` - Project coding rules (if present)
- `codemaps/backend.md` - Existing API endpoints (if present)
- `codemaps/database.md` - DB schema, tables (if present)
- `references/domain.md` - Business logic and requirements

**Read plan:**

- `plans/{task-name}/plan.md` - Implementation plan

**For latest docs, use WebSearch/WebFetch (official docs first).**

---

## Boilerplate Generation

For NestJS projects, generate module structure using coding-rules scripts.

generate.mjs는 이 스킬과 같은 플러그인 안에 있다. 이 SKILL.md 파일의 위치에서 `../../references/coding-rules/scripts/generate.mjs`로 접근할 수 있다.

```bash
# NestJS module structure
node ../../references/coding-rules/scripts/generate.mjs structure <moduleName> [--create]
```

> 위 경로는 이 SKILL.md 기준 상대경로다. 실행 시 이 SKILL.md의 실제 위치를 기준으로 절대경로를 구성하라.

---

## Coding Rules 준수

파일이나 폴더를 생성·배치할 때 반드시 아래 문서를 읽고 따른다:

- `references/coding-rules/folder-structure.md` — 모듈 구조, index.ts export 패턴
- `references/coding-rules/naming.md` — DB 네이밍(snake_case), API 네이밍 규칙

이 문서들은 이 SKILL.md 기준 `../../references/coding-rules/`에 있다.

---

## Key Responsibilities

- API endpoint implementation (routing, validation, error handling)
- Database integration (ORM/query builder, migrations, schema)
- Authentication and authorization
- Caching strategy (where applicable)
- Unit test 작성 — 플랜에 테스트가 없는 경우에도 생성한 service/controller에 대한 기본 unit test를 작성한다

---

## HTTP Error Response Handling

Every API endpoint must include proper error responses. Without explicit error handling, frameworks return generic 500 errors which leak implementation details and confuse API consumers.

### Standard HTTP error patterns

| Status | When to use | Example |
|---|---|---|
| `400 Bad Request` | Invalid input, missing required fields, validation failure | DTO validation fails |
| `401 Unauthorized` | Missing or invalid authentication | No/expired JWT token |
| `403 Forbidden` | Authenticated but insufficient permissions | User accessing admin route |
| `404 Not Found` | Resource does not exist | `GET /products/:id` with non-existent ID |
| `409 Conflict` | Duplicate resource or state conflict | Creating user with existing email |
| `422 Unprocessable Entity` | Semantically invalid input | Invalid date range |

### Global error handling

- Set up a global exception filter/middleware to catch unhandled exceptions and return consistent 500 responses
- Never expose internal stack traces or implementation details in 500 responses
- Log the full error server-side for debugging

### Checklist for every endpoint

- [ ] Single-resource GET/PUT/DELETE: return 404 if resource not found
- [ ] POST/PUT with body: validate input, return 400 on failure
- [ ] Unique constraints: return 409 on duplicate
- [ ] Auth-protected routes: return 401/403 appropriately
- [ ] Global exception handler registered (500 responses without stack trace leaks)

---

## TDD Workflow (only when plan includes tests)

> Skip this entire section if the plan directory has no `tests/` or `e2e/` folder.
> For tasks like migrations or schema-only work, jump straight to Implementation Steps.

1. **Copy unit test files** from `plans/{task-name}/tests/` to source tree
   - Read `tests/manifest.md` for file list and destination paths
   - Strip `tests/` prefix to get destination path
2. **Copy E2E test files** (if present) from `plans/{task-name}/e2e/` to the project's e2e test directory
   - E2E tests are plan artifacts (contract-first) — do NOT modify them
3. **Red verification**: run test command — tests must FAIL
4. **Implement** API/services to pass tests
5. **Green verification**: run test command — ALL pass
6. **E2E verification** (if E2E tests exist): run Playwright — E2E must pass. If E2E fails, fix implementation, NOT tests.

---

## Implementation Steps

1. **Detect stack** (Step 0 above)
2. Read plan from `plans/{task-name}/plan.md`
3. Copy unit test files from `plans/{task-name}/tests/` to source tree (read `manifest.md` for paths)
4. Copy E2E test files (if present) from `plans/{task-name}/e2e/` to the project's e2e test directory
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
