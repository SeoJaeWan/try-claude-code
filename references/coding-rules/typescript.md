# TypeScript Rules

> This document covers only "judgment-required rules" that ESLint/Prettier cannot enforce automatically.
> Mechanical rules are applied by `init-coding-rules` through conversational diff + approval based on this coding-rules folder.

---

## TSConfig Merge Policy

Use `init-coding-rules` to generate tsconfig settings.

- Missing strict options are auto-added.
- If root `tsconfig.json` is missing, a framework-aware starter `tsconfig.json` is created first, then strict merge is applied.
- Existing conflicting options are never auto-overwritten.
- On conflict, choose `keep` or `apply` after reviewing:
  - option meaning
  - current value
  - recommended value
  - keep/apply impact
  - short example

Representative options reviewed/applied in this workflow:

- `strict`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `useUnknownInCatchVariables`
- `noPropertyAccessFromIndexSignature`
- `forceConsistentCasingInFileNames`

---

## Minimize `as` (Type Assertions)

Prefer type inference, Type Guards, and generics first. When using `as`, a **comment explaining the reason is required**.

```typescript
// Avoid
const data = response as UserData;

// Good: 타입 가드
if (isUserData(response)) {
  console.log(response.id);
}

// Good: 타입 내로잉
const element = document.getElementById(id);
if (!element) throw new Error(`Element ${id} not found`);
return element; // HTMLElement로 추론됨

// 불가피한 as 사용 시
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D; // getContext 반환 타입이 null 포함
```

---

## Type Guards

### User-Defined Type Guards

A pattern for safely narrowing `unknown` data (API responses, JSON parsing, etc.).

```typescript
const isUser = (data: unknown): data is User => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
};

// 배열 타입 가드
const isUserArray = (data: unknown): data is User[] => {
  return Array.isArray(data) && data.every(isUser);
};
```

### Built-in Type Guards

```typescript
typeof value === 'string'   // 원시 타입
error instanceof Error       // 클래스 인스턴스
'bark' in animal             // 판별 속성 (discriminated union)
```

---

## Generics

### Basic Usage

```typescript
const getFirstItem = <T>(items: T[]): T | undefined => items[0];
```

### Constraints (`extends`)

```typescript
// keyof 제약
const getProperty = <T, K extends keyof T>(obj: T, key: K): T[K] => obj[key];

// 인터페이스 제약
interface HasId { id: string; }
const findById = <T extends HasId>(items: T[], id: string): T | undefined => {
  return items.find(item => item.id === id);
};
```

---

## Utility Types

Commonly used built-in utilities:

| Utility | Purpose | Example |
|---------|---------|---------|
| `Partial<T>` | Make all properties optional | `updateUser(user, updates: Partial<User>)` |
| `Pick<T, K>` | Select specific properties | `Pick<User, 'id' \| 'name'>` |
| `Omit<T, K>` | Exclude specific properties | `Omit<User, 'email'>` |
| `Record<K, V>` | Key-value mapping | `Record<UserRole, string[]>` |
| `Required<T>` | Make all properties required | `Required<Config>` |

Custom utility patterns:

```typescript
type ApiResponse<T> = { data: T; status: number; message: string };
type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
```

---

## Leveraging Type Inference

- Internal functions: rely on inferred return types (explicit annotation not required)
- Public APIs: explicit return types recommended (makes the contract clear)
- `as const`: use for constant objects/arrays where literal types are needed

```typescript
const STATUS = ['pending', 'success', 'error'] as const;
type Status = typeof STATUS[number]; // 'pending' | 'success' | 'error'
```






