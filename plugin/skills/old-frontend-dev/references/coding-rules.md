# Frontend Logic Coding Rules

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

---

## Hooks Root Resolution

Choose the first existing path and use it as `{hooksRoot}`:

1. `src/hooks/`
2. `app/hooks/`
3. `hooks/`

---

## Hooks Folder Structure

```
{hooksRoot}/
├── apis/
│   ├── queries/         # useQuery (GET)
│   │   └── useGetUser/index.ts
│   └── mutations/       # useMutation (POST/PUT/DELETE)
│       └── useLogin/index.ts
└── utils/               # Utility hooks (used in 2+ components)
    └── useDebounce/index.ts
```

### Hook Placement Decision Flow

```
1. API call hook?           → {hooksRoot}/apis/ (queries/ or mutations/)
2. Used in 2+ places?       → {hooksRoot}/utils/
3. Page-specific?            → app/{feature}/hooks/
4. Component-specific?       → components/{path}/hooks/
```

- When a dedicated hook is also needed elsewhere, move it to `{hooksRoot}/utils/`
- API hooks are always fixed at `{hooksRoot}/apis/`

---

## Hook File Convention

Each hook uses the directory pattern: `{hookName}/index.ts`

```
{hooksRoot}/apis/queries/
├── useFetchOrder/
│   └── index.ts        ← export default
└── useGetUser/
    └── index.ts
```
