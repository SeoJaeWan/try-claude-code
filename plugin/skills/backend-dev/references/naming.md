# Backend Naming Rules

---

## Database Naming

Follows PostgreSQL conventions.

### Tables

snake_case plural:

```sql
CREATE TABLE users (...);
CREATE TABLE user_problems (...);
```

### Columns

snake_case. Timestamps use the `_at` suffix:

```sql
id UUID, user_id UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, avatar_url TEXT
```

### Indexes

`idx_{table}_{columns}` pattern:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_memos_user_problem ON memos(user_id, problem_id);
```

### Foreign Keys

`{referenced_table}_id` pattern:

```sql
user_id UUID REFERENCES users(id)
problem_id INTEGER NOT NULL
```

### DB to API Conversion

DB는 snake_case, API 응답은 camelCase. Entity/interface의 DB 필드는 snake_case로 정의하고, API 응답 시 별도 계층에서 camelCase로 변환한다.

---

## API Endpoint Constants

```typescript
const API_ENDPOINTS = {
  GET_USERS: "/api/users",
  GET_USER: "/api/users/:id",
  CREATE_USER: "/api/users",
  UPDATE_USER: "/api/users/:id",
  DELETE_USER: "/api/users/:id",
};
```

Keys follow the `VERB_RESOURCE` pattern; values are RESTful paths.

---

## General Naming

- 메서드명: camelCase (`buildProfileSummary`, `findOrderById`)
- 클래스명: PascalCase (`OrdersService`, `AuthController`)
- 상수: UPPER_SNAKE_CASE (`JWT_SECRET`, `MAX_RETRY_COUNT`)
- 파일명: kebab-case 또는 프레임워크 관례 (`orders.service.ts`, `auth.controller.ts`)
