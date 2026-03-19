# Eval 2: Notification Query Refactor (with skill)

## Task

알림 조회 로직을 프로젝트 컨벤션에 맞게 정리. NotificationList는 query 결과를 소비하는 쪽에 집중하고, 조회 로직은 훅 경계로 정리.

## Steps Taken

### 1. Read skill and coding rules

- Read `SKILL.md` for workflow instructions and core principles
- Read `coding-rules.md` for hook naming, folder structure, API hook contract, and validation checklist
- Read existing `useGetOrderDetail` hook as a project reference for TanStack Query pattern

### 2. Analyzed existing code

**Before (useGetNotifications/index.ts):**
- Used raw `useState` + `useEffect` + `fetch` for data fetching
- Manual loading/error state management
- No query key separation, no endpoint separation
- No mapper separation -- response unwrapping mixed into the effect callback

**Before (NotificationList.tsx):**
- Consumed `{ notifications, isLoading, error }` from hook
- Error was a plain string type
- Filter logic (all/unread) was in the component -- this is UI interaction state, appropriate to keep

### 3. Refactored useGetNotifications hook

Applied the coding rules' "Endpoint, Query Key, Mapper Mindset":

- **Query key**: Extracted `notificationKeys.all` as a stable, explicit key object
- **Endpoint**: Extracted `fetchNotifications` as a standalone async arrow function handling fetch + error + response mapping
- **Hook**: Migrated from manual `useState`/`useEffect` to `useQuery` from TanStack Query
- **Return shape**: Changed to `{ data, isLoading, isError, error }` matching the conventional return pattern
- Added `enabled` parameter for query activation control (matching useGetOrderDetail pattern)
- `data` defaults to `[]` via nullish coalescing to keep consumer code simple

### 4. Updated NotificationList component

- Destructured `data` as `notifications` for readability: `const { data: notifications, isLoading, isError, error } = useGetNotifications()`
- Changed error guard from `if (error)` to `if (isError)` with `error?.message` fallback
- All UI, filter logic, and rendering unchanged -- component stays focused on consuming query results

### 5. Validation checklist

- [x] File lives under `hooks/apis/*`
- [x] API hook path matches `hooks/apis/{domain}/queries/{hookName}/index.ts`
- [x] All path segments use camelCase
- [x] Entry file is `index.ts`
- [x] Main export name matches the hook name (`useGetNotifications`)
- [x] Hook uses arrow function style
- [x] Hook entry file does not define additional hooks
- [x] Hook entry file does not define React components
- [x] Query hook uses `useGet*` prefix
- [x] No forbidden prefixes (`useFetch*`, `useSave*`, `useSubmit*`)
- [x] Consumer can branch on loading/error state

## Files Modified

| File | Change |
|------|--------|
| `hooks/apis/notification/queries/useGetNotifications/index.ts` | Migrated from manual fetch to TanStack Query with separated query key, endpoint, and return shape |
| `components/NotificationList.tsx` | Updated to consume refactored hook's return shape (`data`/`isError` instead of `notifications`/`error` string) |
