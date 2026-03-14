# UI Naming Rules

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
