# useFetchOrder API Hook - Implementation Summary

## What was done

Created a `useFetchOrder` custom React hook that fetches order data from a REST API endpoint using a query pattern. The hook follows the project's existing conventions (`@/` path alias, `"use client"` directive, TypeScript strict mode) and is placed in a well-structured hooks directory.

### Key features of the hook

- **Auto-fetch on mount** when `orderId` is provided and `enabled` is true
- **Reactive re-fetch** when `orderId` changes
- **AbortController support** to cancel stale/in-flight requests on cleanup or re-fetch
- **Standard query state** exposing `data`, `isLoading`, `error`
- **Manual refetch** via the returned `refetch` function
- **`enabled` option** to conditionally disable automatic fetching

## Files created

| File | Purpose |
|------|---------|
| `features/next-app/hooks/apis/queries/useFetchOrder.ts` | Main hook implementation |
| `features/next-app/hooks/apis/queries/index.ts` | Barrel export for queries |
| `features/next-app/hooks/apis/index.ts` | Barrel export for apis |
| `features/next-app/hooks/index.ts` | Top-level barrel export for hooks |

## Files modified

| File | Change |
|------|--------|
| `features/next-app/lib/types.ts` | Added `Order`, `OrderItem`, and `OrderStatus` type definitions |

## Generate scripts run

No `generate.mjs` scripts were run. The coding-rules scripts directory (`.claude/try-claude/references/coding-rules/scripts/`) does not exist in this workspace (init-try has not been run), so boilerplate was implemented manually per the skill guide fallback instructions.

## Coding-rules references consulted

- `.claude/try-claude/references/coding-rules/completion.md` -- file not found (init-try not run)
- `.claude/try-claude/references/coding-rules/` -- directory not found
- `.claude/try-claude/references/design/` -- directory not found
- `.claude/try-claude/codemaps/frontend.md` -- file not found
- `.claude/try-claude/references/domain.md` -- file not found

Since no coding-rules references were available, implementation followed the skill guide's folder structure convention (`{hooksRoot}/apis/queries/`) and matched the existing project patterns observed in `contexts/TodoContext.tsx` and `lib/types.ts`.

## Verification

- TypeScript type check (`tsc --noEmit`): No errors in created/modified files. Pre-existing errors in Playwright test files are unrelated.

## Usage example

```tsx
import { useFetchOrder } from "@/hooks/apis/queries/useFetchOrder";

function OrderDetail({ orderId }: { orderId: string }) {
  const { data, isLoading, error, refetch } = useFetchOrder({ orderId });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div>
      <h2>Order #{data.orderNumber}</h2>
      <p>Status: {data.status}</p>
      <p>Total: {data.totalAmount}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```
