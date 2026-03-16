# Transcript: Order Detail Query Hook (old-frontend-dev skill)

## Task
주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 해야 함.

## Steps

### 1. Read SKILL.md
- Read `plugin/skills/old-frontend-dev/SKILL.md`
- Identified key instructions: read coding-rules.md, attempt boilerplate generation via generate.mjs, follow hook naming and folder structure conventions

### 2. Read all input files
- `features/frontend-dev-fixture/package.json` - Next.js 16, React 19 project. No `@tanstack/react-query` in deps but the existing hook uses it, so it is an assumed dependency.
- `features/frontend-dev-fixture/hooks/apis/queries/useFetchOrder/index.ts` - Existing order query hook using `useQuery` from TanStack Query. Uses `"use client"` directive, defines interfaces inline, returns `{ data, isLoading, isError, error, refetch }`.
- `features/frontend-dev-fixture/lib/types.ts` - Shared types (User, Todo). No order-related types.
- `features/frontend-dev-fixture/app/page.tsx` - Home page with auth redirect. Not directly related to this task.

### 3. Read coding-rules.md
- Read `plugin/skills/old-frontend-dev/references/coding-rules.md`
- Key rules applied:
  - **API Hook Naming**: `use` + verb + resource. For single read: `useGet{Resource}` -> `useGetOrderDetail`
  - **Hooks Root Resolution**: `hooks/` exists (option 3)
  - **Folder Structure**: `hooks/apis/queries/useGetOrderDetail/index.ts` (directory pattern)
  - **API Endpoint Constants**: `VERB_RESOURCE` pattern for keys
  - **Array/List naming**: plural nouns, no `~List` suffix

### 4. Attempt boilerplate generation
- Ran `node plugin/references/coding-rules/scripts/generate.mjs api-hook useGetOrderDetail --method query`
- Failed with `ERR_MODULE_NOT_FOUND` (test_suite.mjs missing - init-try not run)
- Per SKILL.md: "If scripts are not found (init-try not run), skip boilerplate generation and implement manually"

### 5. Implement hook manually
- Created `hooks/apis/queries/useGetOrderDetail/index.ts`
- Followed the existing `useFetchOrder` pattern:
  - `"use client"` directive
  - `useQuery` from `@tanstack/react-query`
  - Inline interfaces for `OrderDetail`, `OrderItem`, and params
  - `API_ENDPOINTS` constant following `VERB_RESOURCE` pattern
  - Returns `{ data, isLoading, isError, error, refetch }` for caller to handle loading/error states
- Key differences from existing `useFetchOrder`:
  - Named `useGetOrderDetail` per coding rules (`useGet{Resource}` for single read)
  - `orderId` is required (not optional) since order detail always needs an ID
  - Added `enabled && !!orderId` guard to prevent queries without valid orderId
  - Added `API_ENDPOINTS` constant per coding rules
  - More detailed `OrderDetail` type with `items` and `shippingAddress`

### 6. No tests/e2e specified
- Task did not include a plan with tests/ or e2e/ directories
- Skipped test steps per SKILL.md instructions

## Output Files
- `hooks/apis/queries/useGetOrderDetail/index.ts` - The new order detail query hook
