# Eval 3: Order Query Hook - with_skill transcript

## Task Description

주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가해줘. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 해줘.

## Steps

### Step 1: Read SKILL.md

Read `plugin/skills/frontend-dev/SKILL.md` to understand the CLI-first workflow.

Key takeaways:
- Use tcf CLI for boilerplate generation before implementing hooks
- API hooks follow `hooks/apis/{domain}/{queries|mutations}` folder structure
- Query hooks must use `useGet*` naming pattern
- TanStack Query is the state management library for API hooks

### Step 2: Read fixture files

Read the following fixture files:
- `features/frontend-dev-fixture/package.json` - Next.js 16.1.6, React 19.2.3 project
- `features/frontend-dev-fixture/hooks/apis/order/queries/useGetOrderDetail/index.ts` - existing order query hook (reference convention)
- `features/frontend-dev-fixture/lib/types.ts` - shared type definitions (User, Todo)
- `features/frontend-dev-fixture/app/page.tsx` - home page component

Also read existing hooks for convention reference:
- `features/frontend-dev-fixture/hooks/apis/notification/queries/useGetNotifications/index.ts` - notification query hook using useState/useEffect pattern

### Step 3: Run tcf --help

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs --help
```

Output confirmed available commands including `apiHook` with required fields: `name`, `path`, `kind`, and optional `method`. The `apiHook` command enforces:
- Path must follow `hooks/apis/{domain}/{queries|mutations}` pattern
- Query hooks must use `useGet*` prefix
- Forbidden prefixes: `useFetch`, `useSave`, `useSubmit`

### Step 4: Scaffold and implement the order query hook using tcf

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs apiHook --json '{"name":"useGetOrderDetail","path":"hooks/apis/order/queries","kind":"query","method":"GET"}'
```

Dry-run output:
```json
{
  "ok": true,
  "command": "apiHook",
  "normalizedSpec": {
    "name": "useGetOrderDetail",
    "path": "hooks/apis/order/queries",
    "kind": "query",
    "method": "GET"
  },
  "files": [
    {
      "path": "hooks/apis/order/queries/useGetOrderDetail/index.ts",
      "bytes": 284,
      "status": "planned"
    }
  ]
}
```

Applied with `--apply` flag:
```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs apiHook --json '{"name":"useGetOrderDetail","path":"hooks/apis/order/queries","kind":"query","method":"GET"}' --apply
```

Output:
```json
{
  "ok": true,
  "command": "apiHook",
  "files": [
    {
      "path": "hooks/apis/order/queries/useGetOrderDetail/index.ts",
      "bytes": 284,
      "status": "written"
    }
  ]
}
```

### Step 5: Add Order type to lib/types.ts

Added the `Order` interface to the shared types file.

### Step 6: Update page.tsx to consume the hook

Updated `app/page.tsx` to import and use `useGetOrderDetail`, exposing loading/error/data states in the UI with retry capability.

## Files Created/Modified

### `hooks/apis/order/queries/useGetOrderDetail/index.ts` (created via tcf + business logic)

```ts
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

### `lib/types.ts` (modified - added Order interface)

```ts
export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  skills?: string[];
  birthDate?: string;
  avatarFileName?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}
```

### `app/page.tsx` (modified - consuming useGetOrderDetail hook)

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import useGetOrderDetail from "@/hooks/apis/order/queries/useGetOrderDetail";

export default function Home() {
  const { isAuthenticated, mounted } = useAuth();
  const router = useRouter();
  const { data: order, isLoading, isError, error, refetch } = useGetOrderDetail({
    enabled: mounted && isAuthenticated,
  });

  useEffect(() => {
    if (mounted && isAuthenticated) router.push("/dashboard");
  }, [mounted, isAuthenticated, router]);

  if (!mounted) return null;
  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">TestApp</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        할 일 관리 애플리케이션에 오신 것을 환영합니다
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-zinc-500" data-testid="order-loading">
          주문 정보를 불러오는 중...
        </p>
      )}

      {isError && (
        <div className="mt-4 text-sm text-red-500" data-testid="order-error">
          <p>주문 정보를 불러오지 못했습니다: {error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-blue-600 underline hover:text-blue-700"
            data-testid="order-retry"
          >
            다시 시도
          </button>
        </div>
      )}

      {order && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700" data-testid="order-detail">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            주문 #{order.id} - {order.status}
          </p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {order.totalAmount.toLocaleString()}원
          </p>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="home-login"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
          data-testid="home-signup"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}
```

## Review Points Verification

1. **Query hook path and naming**: `hooks/apis/order/queries/useGetOrderDetail` follows the `hooks/apis/{domain}/queries/useGet*` convention.
2. **Hook return values are consistent**: Returns `{ data, isLoading, isError, error, refetch }` matching TanStack Query convention.
3. **View and data fetching separation**: The hook encapsulates all data fetching logic (queryKey, queryFn, enabled). The page component only consumes the returned state and renders UI accordingly.
4. **Loading/error handling at call site**: The page handles `isLoading`, `isError`, and `error` states with appropriate UI feedback and a retry button via `refetch`.
