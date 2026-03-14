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

### Entity/Interface Fields — snake_case

TypeScript interface/entity fields representing DB columns must use snake_case. Convert to camelCase in a separate API response layer.

```typescript
// ❌ Wrong — using TypeScript camelCase for DB fields
interface Order {
  customerName: string;
  totalAmount: number;
  createdAt: Date;
}

// ✅ Correct — DB columns use snake_case
interface Order {
  customer_name: string;
  total_amount: number;
  created_at: Date;
}
```

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

- Methods: camelCase (`buildProfileSummary`, `findOrderById`)
- Classes: PascalCase (`OrdersService`, `AuthController`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`, `MAX_RETRY_COUNT`)
- Files: kebab-case or framework convention (`orders.service.ts`, `auth.controller.ts`)
