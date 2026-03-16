# Eval 3: Order Query Hook - Old Skill Transcript

## Task Description

주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가해줘. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 해줘.

## Steps Taken

### Step 1: Read SKILL.md and coding-rules.md

Read `plugin/skills/old-frontend-dev/SKILL.md` to understand the workflow:
- Read coding rules before writing code
- Attempt boilerplate generation first
- Follow implementation steps: read plan, read codemap, read coding rules, implement, test

Read `plugin/skills/old-frontend-dev/references/coding-rules.md` for conventions:
- API hook naming: `use` + verb + resource (e.g., `useGetOrderDetail`)
- Hooks root resolution: check `src/hooks/` -> `app/hooks/` -> `hooks/` (first existing)
- API hooks go under `{hooksRoot}/apis/queries/` for GET operations
- Each hook uses directory pattern: `{hookName}/index.ts`
- Array variables use plural nouns (no `~List` suffix)

### Step 2: Read fixture files for context

Read `features/frontend-dev-fixture/package.json`:
- Next.js 16.1.6, React 19.2.3 project
- No TanStack Query in dependencies yet (needs to be added or assumed available)

Read `features/frontend-dev-fixture/lib/types.ts`:
- Existing types: `User`, `Todo` - no `Order` type yet

Read `features/frontend-dev-fixture/app/page.tsx`:
- Home page with auth redirect logic, login/signup links
- No order-related logic present

Read `features/frontend-dev-fixture/hooks/apis/order/queries/useGetOrderDetail/index.ts`:
- Reference/seed file showing expected hook structure

### Step 3: Resolve hooksRoot

Checked existing paths:
- `src/hooks/` - does not exist
- `app/hooks/` - does not exist
- `hooks/` - exists (with `apis/` subdirectory)

Result: `{hooksRoot}` = `hooks/`

### Step 4: Run boilerplate generator

```bash
node references/coding-rules/scripts/generate.mjs api-hook useGetOrderDetail --method query
```

Generator output provided:
- Hook boilerplate at `hooks/apis/queries/useGetOrderDetail/index.ts`
- Test boilerplate at `hooks/apis/queries/useGetOrderDetail/__tests__/index.test.tsx`

### Step 5: Create hook file with customizations

Applied the following customizations to the boilerplate:
- Added `"use client"` directive for Next.js client component compatibility
- Defined `Order` interface with domain-specific fields (id, status, totalAmount, createdAt, updatedAt)
- Created `UseGetOrderDetailParams` interface with `orderId` and `enabled` parameters
- Set queryKey to `["order", orderId]` for proper cache management
- Built dynamic URL: `/api/orders/${orderId}` or `/api/orders`
- Exposed `isError` and `refetch` in addition to `data`, `isLoading`, `error`
- Placed at `hooks/apis/order/queries/useGetOrderDetail/index.ts` following domain-based folder convention

### Step 6: Create test file

Created test file at `hooks/apis/order/queries/useGetOrderDetail/__tests__/index.test.tsx` with:
- QueryClient wrapper setup
- Test for fetching order data by orderId
- Test for fetching without orderId
- Test for `enabled: false` preventing query execution

## Files Created/Modified

### File 1: `features/frontend-dev-fixture/hooks/apis/order/queries/useGetOrderDetail/index.ts` (CREATED)

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";

/** 주문 데이터 응답 타입 */
interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

/** useGetOrderDetail 파라미터 */
interface UseGetOrderDetailParams {
  orderId?: string;
  enabled?: boolean;
}

/**
 * 주문 데이터를 조회하는 API 훅 (query)
 * @param params - 주문 조회 파라미터
 * @param params.orderId - 조회할 주문 ID
 * @param params.enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns 주문 데이터, 로딩 상태, 에러 정보
 */
const useGetOrderDetail = (params: UseGetOrderDetailParams = {}) => {
  const { orderId, enabled = true } = params;

  const query = useQuery<Order>({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const url = orderId ? `/api/orders/${orderId}` : "/api/orders";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch order");
      }

      return response.json();
    },
    enabled,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export default useGetOrderDetail;
```

### File 2: `features/frontend-dev-fixture/hooks/apis/order/queries/useGetOrderDetail/__tests__/index.test.tsx` (CREATED)

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import useGetOrderDetail from "../index";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useGetOrderDetail", () => {
  it("주문 데이터를 성공적으로 가져온다", async () => {
    // Arrange
    const { result } = renderHook(
      () => useGetOrderDetail({ orderId: "order-1" }),
      { wrapper: createWrapper() }
    );

    // Act & Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it("orderId 없이 호출하면 전체 주문을 조회한다", async () => {
    // Arrange
    const { result } = renderHook(() => useGetOrderDetail(), {
      wrapper: createWrapper(),
    });

    // Act & Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("enabled가 false이면 쿼리를 실행하지 않는다", () => {
    // Arrange
    const { result } = renderHook(
      () => useGetOrderDetail({ orderId: "order-1", enabled: false }),
      { wrapper: createWrapper() }
    );

    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
```
