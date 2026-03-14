# Frontend Hooks Folder Structure Rules

---

## Hooks Root Resolution

Choose the first existing path and use it as `{hooksRoot}`:

1. `src/hooks/`
2. `app/hooks/`
3. `hooks/`

All hook path rules in this document are expressed relative to `{hooksRoot}`.

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

## API Hook Breakdown (queries vs mutations)

```
{hooksRoot}/apis/
├── queries/       # Data fetching (GET): useGetUser, useGetProblems
└── mutations/     # Data modification (POST/PUT/DELETE): useLogin, useCreateMemo
```

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
