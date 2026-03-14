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

## Coding Rules

코드를 작성할 때 반드시 이 스킬에 번들된 references를 읽고 따른다:

- `${CLAUDE_SKILL_ROOT}/references/naming.md` — DB 네이밍(snake_case), API 네이밍, 메서드/클래스 네이밍
- `${CLAUDE_SKILL_ROOT}/references/folder-structure.md` — 모듈 구조, 파일 배치 규칙, 테스트 파일 배치

---

## Boilerplate Generation

For NestJS projects, generate module structure using coding-rules scripts.

generate.mjs는 플러그인에 번들된 스크립트다. `${CLAUDE_PLUGIN_ROOT}` 변수로 접근한다.

```bash
# NestJS module structure
node ${CLAUDE_PLUGIN_ROOT}/references/coding-rules/scripts/generate.mjs structure <moduleName> [--create]
```

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
4. Read coding rules (`${CLAUDE_SKILL_ROOT}/references/`)
5. If plan includes `tests/`: copy test files to source tree (read `manifest.md` for paths), run Red verification
6. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
7. Implement according to detected framework's conventions
8. Run tests — confirm ALL pass (Green)
9. Run E2E tests (if present): if E2E fails, fix implementation, NOT tests
10. Run type/compile check:
    - TypeScript: `pnpm run typecheck` or `pnpm exec tsc --noEmit`
    - Java/Kotlin: build includes compilation
    - Python: `mypy` (if configured)
    - Go: `go build ./...`
11. Verify and auto-fix lint (use project's configured linter)
12. Commit changes
13. Return results based on plan.md
  </Instructions>
  </Skill_Guide>
