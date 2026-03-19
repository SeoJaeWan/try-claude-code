# UI Component Coding Rules

This document is self-contained.
Follow the rules in this file directly when generating or editing UI components.

---

## Shared Rules

- Functions use arrow function style by default
- Internal handlers use the `handle*` prefix
- Props callbacks use the `on*` prefix
- Array names must be plural nouns
- `List` and `Array` suffixes are forbidden
- Path segments must use camelCase

```typescript
const handleToggleMenu = () => {};
const onClose = () => {};
const products = [];

const toggleMenu = () => {};   // Avoid
const productList = [];        // Avoid
```

---

## Core Publisher Boundary

Publisher implements visual structure only.

Allowed UI-only state:

- sidebar open/close
- accordion expand/collapse
- tab selection
- modal visibility
- tooltip or dropdown toggle

Forbidden business logic:

- API calls
- form data state
- auth state
- server loading/error state
- data filtering and sorting logic
- `useEffect(`
- `fetch(`
- `axios.`
- `useQuery(`
- `useMutation(`

Leave data-dependent handlers as props for frontend logic wiring.

---

## Component Path Contract

The final `components` segment is the root for placement rules.
Prefixes before it are allowed.

Allowed patterns:

- `*/components/common/{component}`
- `*/components/{domain}/{component}`
- `*/components/{domain}/{parentComponent}/{childComponent}`

Examples:

- `components/common/reviewCard`
- `src/components/common/button`
- `features/account/components/profile/profileHeader`

### Placement Decision

- Reused in 2 or more root page domains -> `components/common/{component}`
- Used in exactly one root page domain -> `components/{domain}/{component}`
- Parent-only child UI part -> `components/{domain}/{parentComponent}/{childComponent}`

`domain` is the root page segment from `app/{domain}/page.tsx`.
Use `common` only for truly shared components.

### Legacy Migration Rule

- If a legacy component path differs from the current convention, migrate the path first
- Do not keep top-level PascalCase paths like `components/ProductCard`
- Do not keep `components/common/*` for a component that belongs to one domain only

---

## Component Entry Contract

- App pages keep the filename `page.tsx`
- Non-page React TSX component entries use `index.tsx`
- Component name uses PascalCase
- Props interface suffix is `Props`
- Main component uses arrow function style
- Main component is the default export

Examples:

```text
components/common/reviewCard/index.tsx
features/cart/components/cart/cartSummary/index.tsx
app/dashboard/page.tsx
```

---

## UI Interaction State Naming

When you add UI-only interaction state, use this naming:

- boolean state: `is{Name}Open`
- setter: `setIs{Name}Open`
- toggle handler: `handleToggle{Name}`
- open handler: `handleOpen{Name}`
- close handler: `handleClose{Name}`

Examples:

- `isMenuOpen`
- `setIsMenuOpen`
- `handleToggleMenu`
- `handleOpenMenu`
- `handleCloseMenu`

---

## Same-File Structure Rules

The component entry file should stay focused on the main component.

- Same-file JSX helpers are forbidden
- Same-file subcomponents are forbidden
- If a child component exists, move it into its own component folder
- Parent-only child components must not be imported outside the parent component tree
- If a child becomes reusable, promote it to a shared location

Avoid:

```tsx
const CardHeader = () => <div />;

const ReviewCard = () => {
  return <CardHeader />;
};
```

Prefer:

```text
components/common/reviewCard/index.tsx
components/common/reviewCard/cardHeader/index.tsx
```

---

## Validation Checklist

Before considering a component done, verify all of these:

- Path lives under a `components` segment when it is a reusable component
- Shared components use `*/components/common/{component}/index.tsx`
- Domain components use `*/components/{domain}/{component}/index.tsx`
- Nested child components use `*/components/{domain}/{parentComponent}/{childComponent}/index.tsx`
- Folder names use camelCase
- Non-page React TSX entry files use `index.tsx`
- Component name matches the default export
- Props interface uses the `Props` suffix
- Component uses arrow function style
- Same-file JSX helpers are absent
- Same-file subcomponents are absent
- Forbidden business-logic patterns are absent
