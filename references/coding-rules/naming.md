# Naming Rules

> This document covers only "judgment-required rules" that ESLint/Prettier cannot enforce automatically.
> Mechanical rules are applied by `init-coding-rules` through conversational diff + approval based on this coding-rules folder.

---

## Next.js App Router Exceptions

App Router follows file-based routing conventions, which ESLint `check-file` cannot inspect.

```
app/(main)/problems/[id]/page.tsx    ✓ dynamic route
app/(auth)/layout.tsx                ✓ route group
app/api/users/[...slug]/route.ts     ✓ catch-all

app/(main)/problems/[id]/index.tsx   ✗ index.tsx is prohibited
```

- Use Next.js reserved file names such as `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`
- Dynamic segments: `[id]`, `[...slug]`, `[[...optional]]`
- Groups: `(main)`, `(auth)` -- organizational folders that are not reflected in the URL

---

## Event Handler Functions

Unify with the `handle` prefix. Callbacks passed as props use the `on` prefix.
This rule is scoped to React-family projects and must be evaluated during lint merge based on environment detection.

```typescript
// Handlers inside the component
const handleClick = () => {};
const handleSubmit = (data: FormData) => {};
const handleChange = (value: string) => {};

// Props callbacks (on the calling side)
<Button onClick={handleClick} />
```

Inconsistent naming such as `onClick`, `submit`, `changeHandler` is prohibited.

---

## Array / List Variables

Use plural nouns. The `~List` and `~Array` suffixes are prohibited.

```typescript
const users = [];        // ✓
const problems = [];     // ✓

const userList = [];     // ✗
const itemArray = [];    // ✗
```

---

## API Naming

### Custom Hooks (React Query)

`use` + verb + resource pattern:
This rule is scoped to React-family projects and must be evaluated during lint merge based on environment detection.

| CRUD | Pattern | Example |
|------|---------|---------|
| Read (single) | `useGet{Resource}` | `useGetUser` |
| Read (list) | `useGet{Resources}` | `useGetProblems` |
| Create | `useCreate{Resource}` | `useCreateMemo` |
| Update | `useUpdate{Resource}` | `useUpdateMemo` |
| Delete | `useDelete{Resource}` | `useDeleteGoal` |
| Auth | `use{Action}` | `useLogin`, `useLogout` |

Missing verbs or reversed order such as `useUser`, `useProblemsList`, `useMemoCreate` are prohibited.

### API Endpoint Constants

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

## Database Naming

Outside the scope of ESLint. Follows PostgreSQL conventions.

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

### DB to Frontend Conversion

The DB uses snake_case; the frontend uses camelCase. Automatic conversion via the `humps` library:

```typescript
import { camelizeKeys } from 'humps';
const userProblems = camelizeKeys(data);
// { userId, problemId, createdAt }
```





