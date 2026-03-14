# Frontend Folder Structure Rules

---

## Component Architecture

### Core Principle: Component = UI + Composition of Custom Hooks

- Components do not implement new logic directly
- All logic is extracted into custom hooks
- Components import hooks and combine them in handlers only
- **If existing components contain inline logic (fetch, useState, etc.), extract that logic into custom hooks before adding new features** — stacking features on top of inline logic bloats the component and makes testing difficult

```tsx
// Good: Component that composes hooks
const LoginPage = () => {
  const { form, handleChange } = useLoginForm();
  const { login, isLoading } = useLogin();
  const handleSubmit = () => login(form);
  return <LoginFormUI {...form} onSubmit={handleSubmit} />;
};

// Bad: Component with direct logic implementation (useState, fetch, etc.)
```

---

## UI Components vs Page Components

| | UI Component | Page Component |
| ---- | --------------------------- | ------------------------ |
| Location | `app/{feature}/components/` | `app/{feature}/page.tsx` |
| Role | Layout only | Composes hooks |
| Logic | None (receives props only) | Combines hooks in handlers |
| Owner | Publisher | Frontend Developer |

---

## Components Folder Structure

```
components/
├── common/              # Shared (used in 2+ pages)
│   ├── header/index.tsx
│   └── button/index.tsx
├── {domain}/            # Domain-specific
│   └── problemCard/index.tsx
└── providers/index.tsx  # Context Providers
```

### Component Placement Criteria

| Condition | Location |
| ------------------------ | -------------------------- |
| Used in 2 or more pages | `components/common/` |
| Used in a specific domain only | `components/{domain}/` |
| Exclusive to a page | `app/{domain}/components/` |

---

## Sub-component Extraction Rules

Sub-components nested inside a parent component folder
must be **moved to the shared location immediately the moment they are used anywhere else**.

| Target | Initial Location | Location After Reuse |
| ---- | --------- | ------------------- |
| Sub-component exclusive to parent | `components/{domain}/{parent}/{child}/index.tsx` | `components/common/{child}/index.tsx` |
| Hook exclusive to parent component | `components/{domain}/{parent}/hooks/{hook}/index.ts` | `{hooksRoot}/utils/{hook}/index.ts` |

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
