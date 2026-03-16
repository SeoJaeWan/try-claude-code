# Transcript: Order Detail Query Hook

## Task
주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 해야 함.

## Steps

### Step 1: Read SKILL.md
- Read `plugin/skills/frontend-dev/SKILL.md` to understand the workflow.
- Key instruction: All hook files must be created via `tcf` CLI first, then implement business logic inside generated files.

### Step 2: Read all input files
- **package.json**: Next.js 16.1.6, React 19.2.3 project. No `@tanstack/react-query` in explicit deps but used in existing hooks.
- **hooks/apis/queries/useFetchOrder/index.ts**: Existing query hook using TanStack Query `useQuery`. Conventions observed:
  - `"use client"` directive at top
  - Arrow function with `const` declaration
  - `export default` at bottom
  - Interfaces defined locally in the same file
  - Returns `{ data, isLoading, isError, error, refetch }` from `useQuery`
  - Query key as string array: `["order", orderId]`
  - Params interface with optional `enabled` flag
- **hooks/apis/queries/useGetNotifications/index.ts**: Another query hook but uses manual `useState`/`useEffect` pattern (not TanStack Query). Same conventions for file structure.
- **lib/types.ts**: Shared types (User, Todo). No order-related types defined here.
- **app/page.tsx**: Home page component -- not directly related to the hook but shows project conventions (client component, Korean UI text).

### Step 3: Attempt tcf CLI scaffold generation
- Ran: `npx tcf apiHook --json '{"name":"useFetchOrderDetail","path":"hooks/apis/queries","kind":"query"}' --apply`
- CLI returned `ok: true` with file status "written", but the file was not actually created on disk (virtual/dry-run output).
- Proceeded to implement manually following established conventions.

### Step 4: Analyze conventions from existing code
From `useFetchOrder`, the project conventions for API query hooks are:
1. `"use client"` directive
2. Import `useQuery` from `@tanstack/react-query`
3. Define response type interface locally
4. Define params interface with optional `enabled` flag
5. Arrow function with `const` declaration
6. Destructure params with default `enabled = true`
7. Use `useQuery<ResponseType>` with queryKey and queryFn
8. Return object with `{ data, isLoading, isError, error, refetch }`
9. `export default` at bottom
10. Folder structure: `hooks/apis/queries/{hookName}/index.ts` with camelCase folder name

### Step 5: Implement useFetchOrderDetail hook
Created `hooks/apis/queries/useFetchOrderDetail/index.ts` with:
- Same pattern as existing `useFetchOrder` hook
- `OrderDetail` interface with additional detail fields (items, shippingAddress)
- `OrderItem` sub-interface for line items
- `orderId` as required param (since this is specifically for detail, not list)
- Query key: `["order", "detail", orderId]` -- more specific than the list hook
- `enabled` guard: `enabled && !!orderId` to prevent fetching with empty ID
- Returns `{ data, isLoading, isError, error, refetch }` for caller to handle loading/error states

### Step 6: Save outputs
- Saved hook file to outputs directory
- Created this transcript

## Output Files
- `hooks/apis/queries/useFetchOrderDetail/index.ts` - The order detail query hook
