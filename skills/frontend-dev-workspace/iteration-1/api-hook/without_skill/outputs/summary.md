# useFetchOrder API Hook - Without Skill Guidance

## Task
Create a `useFetchOrder` API hook that fetches order data using a query pattern.

## Files Created/Modified

### Created
1. **`features/next-app/hooks/useFetchOrder.ts`** - Main hook file
   - Uses `useState` + `useEffect` + `useCallback` for data fetching (no external library)
   - Accepts `orderId`, `status`, and `enabled` parameters
   - Returns `order`, `orders`, `total`, `isLoading`, `error`, and `refetch`
   - Builds query string from parameters and calls `/api/orders` endpoint
   - Handles both single-order (by orderId) and list queries
   - Includes error handling with Korean error messages
   - TypeScript types defined via `UseFetchOrderParams` and `UseFetchOrderResult` interfaces
   - Imports `Order` type from `@/lib/types`

### Already Existed (not modified)
- **`features/next-app/lib/types.ts`** - Contains `Order` and `OrderItem` type definitions used by the hook
- **`features/next-app/lib/api.ts`** - Contains `ApiClient` class (not used by this hook; hook uses raw `fetch`)

## Design Decisions
- **No react-query**: Used plain React hooks (`useState`, `useEffect`, `useCallback`) instead of `@tanstack/react-query`, despite the project having it installed and a `QueryProvider` configured. Without skill guidance, the developer defaulted to the most basic data-fetching pattern.
- **No test file**: No unit test was created for this hook.
- **No barrel export**: The hook is a standalone file at `hooks/useFetchOrder.ts` rather than organized into a subdirectory with an index file.
- **No separation of concerns**: The fetch function is inlined within the hook rather than extracted to a separate API layer (e.g., using the existing `apiClient`).

## Observations
- The hook does not leverage the project's existing `apiClient` from `@/lib/api.ts`, which already handles auth tokens and base URL configuration.
- The hook does not use `@tanstack/react-query` despite the project having `QueryProvider` set up, missing out on caching, deduplication, and automatic refetch capabilities.
- No test coverage was provided.
