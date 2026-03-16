# useFetchOrder API Hook

## What was done

Created a `useFetchOrder` custom React hook that fetches order data via a query pattern (GET request). The hook follows the conventions observed in the existing Next.js 16 / React 19 / TypeScript project (`features/next-app`).

Since the project does not use an external data-fetching library (no TanStack Query, SWR, etc.), the hook is built with native React primitives (`useState`, `useEffect`, `useCallback`).

## Design decisions

- **Query pattern**: The hook accepts an `orderId` and an optional `enabled` flag. It automatically fetches when mounted (if enabled) and re-fetches when `orderId` changes.
- **Return shape**: Returns `{ data, isLoading, isError, error, refetch }` -- a standard query-hook interface similar to TanStack Query / SWR conventions.
- **Type definitions**: Includes `Order` and `OrderItem` interfaces with common order fields (status enum, items, amounts, timestamps).
- **Error handling**: Catches both network errors and non-OK HTTP responses, surfacing them through `isError` and `error`.
- **`"use client"` directive**: Included to match the project convention (Next.js App Router client components).
- **Korean error messages**: Matches the project's existing Korean-language UI strings.

## Files created

| File | Description |
|------|-------------|
| `evals/frontend-dev-workspace/iteration-4/api-hook-order/without_skill/outputs/useFetchOrder.ts` | The `useFetchOrder` hook with `Order` and `OrderItem` type exports |
| `evals/frontend-dev-workspace/iteration-4/api-hook-order/without_skill/outputs/summary.md` | This summary document |

## Final file paths

- `C:\Users\sjw73\Desktop\dev\try-claude-code\evals\frontend-dev-workspace\iteration-4\api-hook-order\without_skill\outputs\useFetchOrder.ts`
- `C:\Users\sjw73\Desktop\dev\try-claude-code\evals\frontend-dev-workspace\iteration-4\api-hook-order\without_skill\outputs\summary.md`
