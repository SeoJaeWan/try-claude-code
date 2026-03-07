# Backend Dev Skill Simulation: 사용자 인증 API 엔드포인트 (NestJS)

## Task

사용자 인증 API 엔드포인트를 NestJS로 구현해줘 (Implement user authentication API endpoints in NestJS)

---

## Step 0. Stack Detection

### Detection Process

The skill instructs scanning the project root for framework signal files. The following checks were performed:

| Signal file | Found? |
|---|---|
| `package.json` + `@nestjs/core` | No `package.json` found in project root |
| `build.gradle` / `pom.xml` | Not found |
| `requirements.txt` / `pyproject.toml` | Not found |
| `go.mod` | Not found |
| `Gemfile` | Not found |

### Detection Result

No existing backend framework was detected. Since the user explicitly requested **NestJS**, the stack would be set as:

| Property | Value |
|---|---|
| **Framework** | NestJS |
| **Language** | TypeScript |
| **Package manager** | pnpm (per project coding-rules: `package-manager.md`) |
| **Test command** | `pnpm test` |
| **Type check** | `pnpm run typecheck` or `pnpm exec tsc --noEmit` |

---

## Documentation References Checked

| Reference | Status | Notes |
|---|---|---|
| `.claude/try-claude/references/coding-rules/` | Found (9 files) | Naming, testing, folder-structure rules reviewed |
| `.claude/try-claude/codemaps/backend.md` | Not found | No existing API endpoints documented |
| `.claude/try-claude/codemaps/database.md` | Not found | No existing DB schema documented |
| `.claude/try-claude/references/domain.md` | Not found (`sample-domain.md` exists) | Business logic reference absent |
| `.claude/try-claude/plans/{task-name}/plan.md` | Not found | No pre-existing plan for this task |
| `.claude/try-claude/plans/{task-name}/tests/` | Not found | No pre-written test files to copy |

### Key Coding Rules Applied

- **Database naming**: snake_case plural tables, `_at` timestamps, `idx_{table}_{columns}` indexes, `{referenced_table}_id` foreign keys (from `naming.md`)
- **Testing**: Contract-first, AAA pattern, Korean spec names in `it()`, unit tests in `__tests__/index.test.ts` (from `testing.md`)
- **Backend API only TDD flow**: `plan (+ plan-tests: Unit) -> backend-developer (copies tests -> Red -> implements -> Green)` (from `testing.md`)

---

## Boilerplate Generation

The skill specifies running:
```bash
node .claude/try-claude/references/coding-rules/scripts/generate.mjs structure auth [--create]
```

Since scripts directory was not found (init-try not run), boilerplate generation would be **skipped** and implementation done manually per skill instructions.

---

## TDD Workflow Simulation

### Phase 1: Test Files (Red Phase)

Since no plan or pre-written tests exist under `.claude/try-claude/plans/`, tests would be authored manually following the project's testing rules.

#### Test files that would be created:

**1. `src/auth/services/__tests__/auth.service.test.ts`**
```
describe('AuthService', () => {
  it('유효한 자격증명으로 로그인 시 JWT 토큰을 반환한다')
  it('잘못된 비밀번호로 로그인 시 UnauthorizedException을 던진다')
  it('존재하지 않는 이메일로 로그인 시 UnauthorizedException을 던진다')
  it('회원가입 시 비밀번호를 해싱하여 저장한다')
  it('이미 존재하는 이메일로 회원가입 시 ConflictException을 던진다')
  it('유효한 리프레시 토큰으로 새 액세스 토큰을 발급한다')
  it('만료된 리프레시 토큰으로 갱신 시 UnauthorizedException을 던진다')
})
```

**2. `src/auth/controllers/__tests__/auth.controller.test.ts`**
```
describe('AuthController', () => {
  it('POST /auth/login 요청 시 토큰 쌍을 반환한다')
  it('POST /auth/register 요청 시 새 사용자를 생성한다')
  it('POST /auth/refresh 요청 시 새 액세스 토큰을 반환한다')
  it('POST /auth/logout 요청 시 리프레시 토큰을 무효화한다')
  it('유효하지 않은 입력에 대해 400 에러를 반환한다')
})
```

**3. `src/auth/guards/__tests__/jwt-auth.guard.test.ts`**
```
describe('JwtAuthGuard', () => {
  it('유효한 JWT 토큰이 있으면 요청을 통과시킨다')
  it('JWT 토큰이 없으면 UnauthorizedException을 던진다')
  it('만료된 JWT 토큰이면 UnauthorizedException을 던진다')
})
```

#### Red Verification
```bash
pnpm test
# Expected: ALL tests FAIL (no implementation yet)
```

---

### Phase 2: Implementation Files

#### Files that would be created:

| File Path | Purpose |
|---|---|
| `src/auth/auth.module.ts` | NestJS module wiring controllers, services, guards |
| `src/auth/controllers/auth.controller.ts` | REST endpoints: login, register, refresh, logout |
| `src/auth/services/auth.service.ts` | Business logic: credential validation, token management |
| `src/auth/dto/login.dto.ts` | Login request validation (email, password) |
| `src/auth/dto/register.dto.ts` | Register request validation (email, password, name) |
| `src/auth/dto/refresh-token.dto.ts` | Refresh token request validation |
| `src/auth/guards/jwt-auth.guard.ts` | JWT authentication guard |
| `src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `src/auth/strategies/local.strategy.ts` | Passport local strategy |
| `src/auth/entities/user.entity.ts` | TypeORM User entity |
| `src/auth/entities/refresh-token.entity.ts` | TypeORM RefreshToken entity |
| `src/migrations/YYYYMMDDHHMMSS-create-users-table.ts` | Database migration: users table |
| `src/migrations/YYYYMMDDHHMMSS-create-refresh-tokens-table.ts` | Database migration: refresh_tokens table |

#### Database Schema (following project naming rules)

```sql
-- Table: users (snake_case plural)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- Table: refresh_tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

#### API Endpoints

| Method | Path | Description | Auth Required |
|---|---|---|---|
| POST | `/auth/register` | Create new user account | No |
| POST | `/auth/login` | Authenticate and receive tokens | No |
| POST | `/auth/refresh` | Get new access token via refresh token | No |
| POST | `/auth/logout` | Revoke refresh token | Yes (JWT) |
| GET | `/auth/me` | Get current user profile | Yes (JWT) |

#### Dependencies that would be installed

```bash
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt passport-local bcrypt class-validator class-transformer typeorm @nestjs/typeorm pg
pnpm add -D @types/passport-jwt @types/passport-local @types/bcrypt
```

---

### Phase 3: Green Verification

```bash
# Run tests - all should pass
pnpm test

# Type checking
pnpm exec tsc --noEmit

# Lint auto-fix
pnpm lint --fix
```

---

### Phase 4: Commit

Following the project's git conventions, the commit would be:
```
feat(auth): implement user authentication API endpoints

- Add login, register, refresh, logout endpoints
- Add JWT and local Passport strategies
- Add user and refresh_token entities with migrations
- Add JwtAuthGuard for protected routes
```

---

## Summary

The `backend-dev` skill provides a structured, framework-aware workflow for backend development:

1. **Stack auto-detection** via signal files (package.json, build.gradle, etc.) -- correctly identifies NestJS when `@nestjs/core` is present
2. **Reference-driven development** -- checks codemaps, domain docs, coding-rules before implementation
3. **TDD enforcement** -- Red/Green cycle with test file copying from plan artifacts
4. **Boilerplate generation** -- NestJS module scaffolding via project scripts (when available)
5. **Verification chain** -- Tests pass, then typecheck, then lint, then commit

In this simulation, since no project files (package.json, plans, codemaps) existed, the skill gracefully falls back to manual implementation while still applying detected coding conventions (database naming, test spec format, folder structure patterns).
