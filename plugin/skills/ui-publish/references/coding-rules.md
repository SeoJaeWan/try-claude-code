# UI Component Coding Rules

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

## Props Handling -- Destructure Inside the Function Body

Receive props as a whole parameter, then destructure them on the first line of the function body.

```typescript
// Good
const Button = (props: ButtonProps) => {
  const { title, onClick, disabled = false } = props;

  return (
    <button onClick={onClick} disabled={disabled}>
      {title}
    </button>
  );
};

// Avoid -- destructuring directly in the parameter
const Button = ({ title, onClick, disabled = false }: ButtonProps) => {
  // ...
};
```

Reason: You can log the entire `props` object during debugging, and default value assignments are explicit.

---

## Conditional Rendering -- Early Return

For complex conditions, use Early Return at the top of the component instead of nesting inside JSX.

```typescript
const UserProfile = (props: UserProfileProps) => {
  const { user } = props;

  if (!user) return <div>User not found</div>;
  if (user.isBlocked) return <div>Blocked user</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
```

Ternary operators are only permitted when the entire expression fits on a single line:

```typescript
{isLoading ? "Loading..." : title}
```

No nested ternary operators — use Early Return or separate variables instead.

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

UI components handle **layout and visual interactions only**.

**Allowed state** — purely visual interactions that don't involve data:
- Sidebar open/close toggle
- Accordion expand/collapse
- Tab/panel selection
- Modal visibility
- Tooltip/dropdown toggle

**Prohibited** — business logic that belongs in frontend-dev hooks:
- Form data (email, password values)
- API loading/error states (`isLoading`, `error`)
- Authentication state
- Data filtering/sorting logic
- `fetch` / `axios` calls
- `useEffect` for data fetching
