# useFetchOrder API Hook - Summary

## Task

Create a `useFetchOrder` API hook that fetches order data using TanStack Query (query method).

## Skill Followed

`skills/frontend-dev/SKILL.md` - frontend-dev workflow with TDD approach.

## Files Created

| File | Description |
|------|-------------|
| `features/next-app/hooks/apis/queries/useFetchOrder.ts` | API hook implementation using `useQuery` from TanStack React Query |
| `features/next-app/hooks/apis/queries/useFetchOrder.test.ts` | Unit tests (vitest + @testing-library/react) - 4 test cases |
| `features/next-app/hooks/apis/queries/index.ts` | Barrel export for queries directory |
| `features/next-app/hooks/apis/index.ts` | Barrel export for apis directory |
| `features/next-app/hooks/index.ts` | Barrel export for hooks root |
| `features/next-app/vitest.config.ts` | Vitest configuration with jsdom, React plugin, and path aliases |

## Files Modified

| File | Change |
|------|--------|
| `features/next-app/package.json` | Added `@tanstack/react-query` dependency; added `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react` devDependencies; added `test`, `test:watch`, `typecheck` scripts |
| `features/next-app/hooks/useFetchOrder.ts` | Replaced old vanilla-React implementation with a deprecated re-export pointing to `./apis/queries` |

## Existing Files (Unchanged)

| File | Note |
|------|------|
| `features/next-app/lib/types.ts` | Already contained `Order` and `OrderItem` interfaces |

## Hook API

```typescript
interface UseFetchOrderOptions {
  orderId: string;
  enabled?: boolean; // default: true
}

function useFetchOrder(options: UseFetchOrderOptions): UseQueryResult<Order, Error>;
```

- **Query key:** `["order", orderId]`
- **Endpoint:** `GET /api/orders/{orderId}`
- **Auto-disabled** when `orderId` is empty or `enabled` is false
- **Error message:** `"주문 조회에 실패했습니다 ({status})"`

## Test Cases

1. orderId로 주문 데이터를 성공적으로 조회한다 (success case)
2. API 오류 시 에러 상태를 반환한다 (error case - 404)
3. enabled=false이면 쿼리를 실행하지 않는다 (disabled case)
4. orderId가 빈 문자열이면 쿼리를 실행하지 않는다 (empty orderId guard)

## Folder Structure

```
features/next-app/hooks/
├── index.ts                          # root barrel export
├── useFetchOrder.ts                  # deprecated re-export
├── apis/
│   ├── index.ts                      # apis barrel export
│   └── queries/
│       ├── index.ts                  # queries barrel export
│       ├── useFetchOrder.ts          # implementation
│       └── useFetchOrder.test.ts     # unit tests
└── auth/
    ├── index.ts
    └── useLoginForm.ts
```

## Next Steps

1. Run `pnpm install` to install new dependencies
2. Run `pnpm test` to execute tests
3. Run `pnpm typecheck` to verify type safety
