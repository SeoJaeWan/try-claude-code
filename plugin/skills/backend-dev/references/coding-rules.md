# Backend Coding Rules

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

---

## Module-Based Architecture

Backend projects are organized by domain (feature) modules. Each module directory contains the domain's controller, service, repository, DTO, and entity files.

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── dto/
│   │   ├── create-order.dto.ts
│   │   └── update-order.dto.ts
│   └── entities/
│       └── order.entity.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

---

## Module Placement Criteria

| Condition | Location |
|---|---|
| Independent domain feature | `src/{domain}/` (module directory) |
| Shared utilities/helpers | `src/common/` |
| Configuration/environment | `src/config/` |
| DB migrations | `src/migrations/` or framework convention |

---

## File Naming Convention

Follow framework conventions:

| File Type | Pattern | Example |
|---|---|---|
| Controller | `{domain}.controller.ts` | `orders.controller.ts` |
| Service | `{domain}.service.ts` | `orders.service.ts` |
| Module | `{domain}.module.ts` | `orders.module.ts` |
| Entity | `{name}.entity.ts` | `order.entity.ts` |
| DTO | `{action}-{domain}.dto.ts` | `create-order.dto.ts` |
| Guard | `{name}.guard.ts` | `jwt-auth.guard.ts` |
| Strategy | `{name}.strategy.ts` | `jwt.strategy.ts` |
| Interface | `{name}.interface.ts` | `order.interface.ts` |
| Test | `{domain}.{type}.spec.ts` | `orders.service.spec.ts` |

---

## Test File Placement

Test files are co-located with the target file in the same directory:

```
src/orders/
├── orders.service.ts
├── orders.service.spec.ts      ← same directory
├── orders.controller.ts
└── orders.controller.spec.ts   ← same directory
```
