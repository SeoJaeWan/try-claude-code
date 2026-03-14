# Frontend Naming Rules

---

## Event Handler Functions

Unify with the `handle` prefix. Callbacks passed as props use the `on` prefix.

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
