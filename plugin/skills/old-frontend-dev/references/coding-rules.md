# Frontend Logic Coding Rules

This document is self-contained.
Follow the rules in this file directly when generating or editing frontend hooks.

---

## Shared Rules

- Functions use arrow function style by default
- Internal handlers use the `handle*` prefix
- Props callbacks use the `on*` prefix
- Array names must be plural nouns
- `List` and `Array` suffixes are forbidden
- Path segments must use camelCase

```typescript
const handleSubmit = () => {};
const onSubmit = () => {};
const products = [];

const submit = () => {};      // Avoid
const productList = [];       // Avoid
```

---

## Core Frontend Boundary

- Frontend owns hooks, state wiring, API integration, and business logic extraction
- Publisher owns visual components and layout shells
- If a page or component contains inline fetch, business-data `useState`, or orchestration logic, extract that logic into hooks
- Pages and components should mainly compose hooks and render UI

---

## Custom Hook Contract

Use this contract for non-API hooks.

### Path

- Allowed: `hooks/utils/{domain}`
- Allowed: `hooks/utils/common`
- Forbidden: `hooks/login`
- Forbidden: `app/login/hooks`
- Forbidden: `components/toggle/hooks`

`domain` is the root page segment from `app/{domain}/page.tsx`.
Use `common` only when the hook is shared across two or more page domains.

Examples:

- `app/login/page.tsx` -> `hooks/utils/login/useLoginForm/index.ts`
- shared utility -> `hooks/utils/common/useDebounce/index.ts`

### Name

- Required prefix: `use`
- Required pattern: `^use[A-Z][A-Za-z0-9]*$`

Examples:

- Good: `useLoginForm`, `useProfileDraft`, `useDebounce`
- Avoid: `loginForm`, `use_login_form`

### Output

- Entry file pattern: `{path}/{hookName}/index.ts`
- Entry file exports the hook as default export
- Entry file should define the main hook only

Example:

```text
hooks/utils/login/useLoginForm/index.ts
hooks/utils/common/useScroll/index.ts
```

---

## API Hook Contract

Use this contract for TanStack Query based server-request hooks.

### Path

- Query hooks: `hooks/apis/{domain}/queries`
- Mutation hooks: `hooks/apis/{domain}/mutations`

Examples:

- `hooks/apis/product/queries/useGetProduct/index.ts`
- `hooks/apis/auth/mutations/usePostLogin/index.ts`

### Kind And Method

- `query` hooks must use `GET`
- `mutation` hooks may use `POST`, `PUT`, `PATCH`, `DELETE`

### Name

- Query pattern: `useGet*`
- POST mutation pattern: `usePost*`
- PUT mutation pattern: `usePut*`
- PATCH mutation pattern: `usePatch*`
- DELETE mutation pattern: `useDelete*`

Forbidden prefixes:

- `useFetch*`
- `useSave*`
- `useSubmit*`

Examples:

- Good: `useGetOrderDetail`, `usePostLogin`, `useDeleteCartItem`
- Avoid: `useFetchOrder`, `useSaveProfile`, `useSubmitLogin`

### Output

- Entry file pattern: `{path}/{hookName}/index.ts`
- Use arrow function style and default export
- The consumer should be able to branch on loading/error state

Typical return shape:

```typescript
return {
  data: query.data,
  isLoading: query.isLoading,
  error: query.error,
};
```

---

## Endpoint, Query Key, Mapper Mindset

Build API hooks with these responsibilities separated:

1. query key
2. endpoint
3. api hook
4. mapper
5. hook return
6. validation checklist

When writing the final hook manually, keep that same separation in mind:

- query keys should be stable and explicit
- endpoints should be named by resource and path
- response mapping should be isolated instead of mixed into JSX
- hook return shape should be deliberate and predictable

---

## Validation Checklist

Before considering a hook done, verify all of these:

- File lives under `hooks/utils/*` or `hooks/apis/*`
- Custom hook path matches `hooks/utils/{domain}/{hookName}/index.ts` or `hooks/utils/common/{hookName}/index.ts`
- API hook path matches `hooks/apis/{domain}/queries/{hookName}/index.ts` or `hooks/apis/{domain}/mutations/{hookName}/index.ts`
- All path segments use camelCase
- Entry file is `index.ts`
- Main export name matches the hook name
- Hook uses arrow function style
- Hook entry file does not define additional hooks
- Hook entry file does not define React components
