# Eval 3: Order Query Hook - With Skill Transcript

## Task
주문 상세를 조회하는 프론트 훅을 프로젝트 컨벤션에 맞게 추가해줘. query 훅 형태로 만들고, 호출부에서 loading/error를 다룰 수 있게 해줘.

## Steps Taken

### 1. Read skill and coding rules
- Read `SKILL.md` for workflow instructions and folder structure conventions.
- Read `references/coding-rules.md` for hook naming, path rules, and validation checklist.

### 2. Read existing codebase
- Read `package.json` to understand the stack (Next.js 16, React 19, no TanStack Query in deps but used in existing hooks).
- Read existing `hooks/apis/order/queries/useGetOrderDetail/index.ts` to understand the current state.
- Read `hooks/apis/notification/queries/useGetNotifications/index.ts` and `hooks/utils/login/useLoginForm/index.ts` for pattern reference.
- Read `lib/types.ts` and `app/page.tsx` for project context.

### 3. Identified issues in existing hook
The existing `useGetOrderDetail` had several deviations from coding rules:
- Included `"use client"` directive (unnecessary for hook files; not a component)
- Return shape included extra fields (`isError`, `refetch`) beyond the standard contract (`data`, `isLoading`, `error`)
- `orderId` was optional, making the query key unstable (could be `["order", undefined]`)
- Query function had ambiguous endpoint logic (different URL when orderId is missing)
- No separation of query key, endpoint, and fetch logic

### 4. Rewrote the hook
Improved `hooks/apis/order/queries/useGetOrderDetail/index.ts`:
- Removed `"use client"` directive
- Made `orderId` required in params (caller should know the ID)
- Separated query key factory: `orderDetailQueryKey(orderId)` returning `["order", "detail", orderId]`
- Separated endpoint function: `orderDetailEndpoint(orderId)`
- Isolated fetch function: `fetchOrderDetail(orderId)`
- Return shape follows the standard contract: `{ data, isLoading, error }`
- Arrow function style, default export
- Korean error message for consistency with other hooks in the project

### 5. Validation checklist
- [x] File lives under `hooks/apis/*`
- [x] Path matches `hooks/apis/{domain}/queries/{hookName}/index.ts` -> `hooks/apis/order/queries/useGetOrderDetail/index.ts`
- [x] All path segments use camelCase
- [x] Entry file is `index.ts`
- [x] Main export name matches the hook name (`useGetOrderDetail`)
- [x] Hook uses arrow function style
- [x] Hook entry file does not define additional hooks
- [x] Hook entry file does not define React components
- [x] Query hook name follows `useGet*` pattern
- [x] Returns `{ data, isLoading, error }` so caller can branch on loading/error state

## Files Modified
- `features/frontend-dev-fixture/hooks/apis/order/queries/useGetOrderDetail/index.ts` (rewritten)
