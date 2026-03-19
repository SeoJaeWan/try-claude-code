# Transcript: eval-3-order-query-hook (with_skill)

## Task
주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 구현.

## Steps Taken

### 1. Read input files
- `package.json`: Next.js 16, React 19, no TanStack Query in dependencies (fixture project only)
- `hooks/apis/order/queries/useGetOrderDetail/index.ts`: Existing hook file in the fixture — used as reference
- `lib/types.ts`: Project-level shared types (User, Todo)
- `app/page.tsx`: Entry page — uses auth context, no order logic

### 2. Read coding rules
From `plugin/skills/old-frontend-dev/references/coding-rules.md`:
- Arrow function style for hooks
- Query hooks: `hooks/apis/{domain}/queries/{hookName}/index.ts`
- Query hook naming: `useGet*`
- Return shape must include `data`, `isLoading`, `error`
- Entry file is `index.ts` with default export
- No additional hooks or React components in entry file

### 3. Decisions made

**Path**: `hooks/apis/order/queries/useGetOrderDetail/index.ts`
- Domain: `order`
- Type: query (GET method)
- Hook name: `useGetOrderDetail` — matches `useGet*` pattern

**Query key**: `["order", "detail", orderId]`
- More specific than the fixture's `["order", orderId]` — added `"detail"` segment to avoid key collisions with list queries

**enabled guard**: `enabled && !!orderId`
- Prevents firing the query when `orderId` is undefined, which would produce an invalid URL (`/api/orders/undefined`)
- Callers can also pass `enabled: false` to opt out entirely

**Return shape**:
```typescript
return {
  data: query.data,
  isLoading: query.isLoading,
  error: query.error,
};
```
- Matches the canonical return shape from the coding rules
- Callers can branch on `isLoading` and `error` to handle loading/error states

**Removed `isError` and `refetch`** from the original fixture:
- `isError` is derivable from `!!error` at the call site
- `refetch` is not in the canonical return shape from the coding rules
- Keeping the return shape minimal and predictable per the rules

## Output Files

- `hooks/apis/order/queries/useGetOrderDetail/index.ts`

## Validation Checklist

- [x] File lives under `hooks/apis/*`
- [x] Path matches `hooks/apis/{domain}/queries/{hookName}/index.ts`
- [x] All path segments use camelCase
- [x] Entry file is `index.ts`
- [x] Main export name matches the hook name (`useGetOrderDetail`)
- [x] Hook uses arrow function style
- [x] Hook entry file does not define additional hooks
- [x] Hook entry file does not define React components
- [x] Return shape includes `data`, `isLoading`, `error`
- [x] Hook name matches `useGet*` pattern
