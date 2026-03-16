# useFetchOrder API Hook

## What was done

Created a custom React hook `useFetchOrder` that fetches order data in a query-style pattern. The hook follows conventions observed in the existing Next.js 16 / React 19 project (TypeScript, `"use client"` directive, Korean error messages consistent with the app's locale).

## Design decisions

- **No external library**: The project does not use React Query or SWR, so the hook is built with native React hooks (`useState`, `useEffect`, `useCallback`).
- **Query pattern**: Provides `data`, `isLoading`, `isError`, `error`, and `refetch` — matching the standard query-hook interface developers expect.
- **`enabled` parameter**: Allows conditional fetching (e.g., wait until an `orderId` is available before firing the request).
- **Type definitions**: Includes `Order` and `OrderItem` interfaces with a realistic status union type.
- **API endpoint**: Targets `/api/orders/${orderId}`, consistent with the existing `/api/notifications` route pattern.

## Files created

| File | Description |
|------|-------------|
| `evals/frontend-dev-workspace/iteration-3/api-hook-order/without_skill/outputs/useFetchOrder.ts` | The `useFetchOrder` hook with Order/OrderItem types |
| `evals/frontend-dev-workspace/iteration-3/api-hook-order/without_skill/outputs/summary.md` | This summary |

## Final file paths

- `C:\Users\sjw73\Desktop\dev\try-claude-code\evals\frontend-dev-workspace\iteration-3\api-hook-order\without_skill\outputs\useFetchOrder.ts`
- `C:\Users\sjw73\Desktop\dev\try-claude-code\evals\frontend-dev-workspace\iteration-3\api-hook-order\without_skill\outputs\summary.md`
