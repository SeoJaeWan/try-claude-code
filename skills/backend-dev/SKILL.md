---
name: backend-dev
description: NestJS API development, database integration, and authentication. Use for API endpoints, DB operations, RLS policies, and server logic.
model: opus
context: fork
agent: backend-developer
---

<Skill_Guide>
<Purpose>
NestJS API development, database integration, and authentication. Use for API endpoints, DB operations, RLS policies, and server logic.
</Purpose>

<Instructions>
# backend-dev

Expert backend development workflow for NestJS APIs and database systems.

---

## Documentation References

**Read first:**

- `.claude/try-claude/references/coding-rules/naming.md` - DB naming (snake_case)
- `.claude/try-claude/references/coding-rules/folder-structure.md` - Folder structure
- `.claude/try-claude/references/coding-rules/code-style.md` - Code style
- `.claude/try-claude/references/coding-rules/typescript.md` - TypeScript rules
- `.claude/try-claude/references/coding-rules/package-manager.md` - pnpm only
- `.claude/try-claude/codemaps/backend.md` - Existing API endpoints (if present)
- `.claude/try-claude/codemaps/database.md` - DB schema, tables, RLS (if present)
- `.claude/try-claude/references/domain.md` - Business logic and requirements

**Read plan:**

- `.claude/try-claude/plans/{task-name}/plan.md` - Implementation plan

**For latest docs, use WebSearch/WebFetch (official docs first).**

---

## MCP Integration

- **GitHub**: PR/issue management, branch operations

---

## Key Responsibilities

- NestJS 10 API development (Controllers, Services, Modules)
- Supabase/PostgreSQL database integration
- Upstash Redis caching
- JWT authentication and OAuth (Google)
- Row Level Security (RLS) implementation

---

## TDD Workflow

1. **Copy test files** from `.claude/try-claude/plans/{task-name}/tests/` to source tree
   - Read `tests/manifest.md` for file list and destination paths
   - Strip `tests/` prefix to get destination path
2. **Red verification**: `pnpm test` — tests must FAIL
3. **Implement** API/services to pass tests
4. **Green verification**: `pnpm test` — ALL pass
5. No E2E tests for backend (unit tests sufficient)

---

## Implementation Steps

1. Read plan from `.claude/try-claude/plans/{task-name}/plan.md`
2. Copy test files from `.claude/try-claude/plans/{task-name}/tests/` to source tree (read `manifest.md` for paths)
3. Red verification: `pnpm test` — confirm tests FAIL (no implementation yet)
4. Read domain.md (business logic)
5. Read CODEMAPS/backend.md, database.md (if present)
6. Read coding-rules/ (conventions)
7. Use WebSearch/WebFetch if needed (NestJS, Supabase, TypeORM)
8. Confirm the current branch matches plan header (`**Branch:**`)
9. Implement:
    - Controllers (routing, validation)
    - Services (business logic)
    - Modules (dependency injection)
    - Database migrations (if schema changes)
    - RLS policies (if needed)
10. Run tests: `pnpm test` — confirm ALL pass (Green)
11. Run typecheck:
    - `pnpm run typecheck` (if no script exists, use `pnpm exec tsc --noEmit`)
    - No type errors allowed before proceeding to the next step
12. Verify and auto-fix lint:

```bash
pnpm lint --fix
```

- Manually fix any errors that cannot be auto-fixed
- Repeat until lint is clean

13. Commit changes
14. Return results based on plan.md

---

## Database Guidelines

**Naming (snake_case):**

- Tables: `users`, `user_problems`
- Columns: `user_id`, `created_at`
- Indexes: `idx_{table}_{columns}`

**Frontend conversion:**

- Use humps library: `camelizeKeys(data)`
- DB: snake_case ↔ Frontend: camelCase

**Migrations:**

- Always create migration files
- Test locally before applying
- Document schema changes
  </Instructions>
  </Skill_Guide>
