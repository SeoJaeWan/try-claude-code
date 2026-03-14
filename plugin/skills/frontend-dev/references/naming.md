# Frontend Logic Naming Rules

---

## API Hook Naming

`use` + verb + resource pattern:

| CRUD | Pattern | Example |
|------|---------|---------|
| Read (single) | `useGet{Resource}` | `useGetUser` |
| Read (list) | `useGet{Resources}` | `useGetProblems` |
| Create | `useCreate{Resource}` | `useCreateMemo` |
| Update | `useUpdate{Resource}` | `useUpdateMemo` |
| Delete | `useDelete{Resource}` | `useDeleteGoal` |
| Auth | `use{Action}` | `useLogin`, `useLogout` |

Missing verbs or reversed order such as `useUser`, `useProblemsList`, `useMemoCreate` are prohibited.

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
