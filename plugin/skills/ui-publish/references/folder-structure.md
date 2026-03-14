# UI Component Folder Structure Rules

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

---

## Component File Convention

Components use the directory pattern: `{ComponentName}/index.tsx`

```
components/
├── ProductCard/
│   └── index.tsx        ← export default
├── EmptyState/
│   └── index.tsx
└── StatsCard/
    └── index.tsx
```

---

## UI Component Principle

UI components handle **layout only**. They contain no logic (useState, useEffect, fetch) and receive data exclusively through props.

| Allowed | Prohibited |
|---|---|
| Props destructuring | `useState` |
| Tailwind CSS classes | `useEffect` |
| Conditional rendering (props-based) | `fetch` / API calls |
| Event handler props (`onClick`) | Direct state management |
