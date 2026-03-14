# Code Style Rules

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

  if (!user) return <div>사용자를 찾을 수 없습니다</div>;
  if (user.isBlocked) return <div>차단된 사용자입니다</div>;

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
{isLoading ? "로딩 중..." : title}
```

---

## No Nested Ternary Operators

Nesting ternaries severely degrades readability. Use Early Return or separate variables instead.

```typescript
// Avoid
{isLoading ? <Spinner /> : hasError ? <Error /> : data ? <Content /> : <Empty />}

// Good
if (isLoading) return <Spinner />;
if (hasError) return <Error />;
if (!data) return <Empty />;
return <Content data={data} />;
```
