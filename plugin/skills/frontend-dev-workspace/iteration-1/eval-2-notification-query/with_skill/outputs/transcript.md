# Transcript: Notification Query Refactoring

## Task

알림 조회 로직을 프로젝트 컨벤션에 맞게 정리. NotificationList는 query 결과를 소비하는 쪽에 집중하고, 조회 로직은 훅 경계로 정리.

## Steps

### 1. Read SKILL.md

Read the frontend-dev skill file. Key principles:
- CLI-first workflow via `tcf` for hook scaffolding
- Core principle: components = UI + custom hooks (logic separated into hooks)
- If `tcf` is not available, implement manually

### 2. Check tcf CLI availability

Ran `tcf --help` -- CLI not found (init-try not run). Proceeded with manual implementation per skill instructions.

### 3. Read all input files

- **package.json**: Next.js 16.1.6, React 19.2.3. No TanStack Query in dependencies.
- **useGetNotifications/index.ts**: Manual fetch with useState/useEffect. Returns `{ notifications, isLoading, error }`. Has `"use client"` directive. Mixes fetch logic with state management.
- **NotificationList.tsx**: Contains both query consumption AND filter logic (useState for filter, inline filtering). Violates the principle of component = pure UI consumer.
- **app/dashboard/page.tsx**: Renders NotificationList. No changes needed for this refactor (NotificationList API stays the same).

### 4. Identify problems

1. **useGetNotifications** returns `notifications` instead of `data` (inconsistent with query hook conventions). No abort handling. No refetch capability. Type `Notification` not exported.
2. **NotificationList** has filter state (`useState<FilterType>`) and filtering logic (`notifications.filter(...)`) inline -- this should be a separate hook.
3. No hook boundary between "data fetching" and "data transformation/filtering".

### 5. Plan refactoring

- **useGetNotifications** (API query hook): Clean up to return `{ data, isLoading, error, refetch }`. Add AbortController for cleanup. Export `Notification` type and `notificationKeys` for cache key convention.
- **useNotificationFilter** (new utility hook): Extract filter state and derived filtered list. Accept `notifications` as input, return `{ filter, filtered, handleFilterAll, handleFilterUnread }`.
- **NotificationList**: Becomes a pure consumer -- calls both hooks and renders. Zero business logic in the component.
- **dashboard/page.tsx**: No API changes needed (NotificationList is self-contained). Copied as-is for completeness.

### 6. Implement

Created four output files:

#### hooks/apis/queries/useGetNotifications/index.ts
- Renamed return field from `notifications` to `data` (query hook convention)
- Added `refetch` function via useCallback
- Added AbortController for proper cleanup on unmount/re-fetch
- Exported `Notification` type and `notificationKeys` for reuse
- Kept manual fetch (no TanStack Query in project dependencies)

#### hooks/utils/useNotificationFilter/index.ts (NEW)
- Extracted from NotificationList
- Accepts `{ notifications }` parameter
- Manages filter state internally
- Returns `{ filter, filtered, handleFilterAll, handleFilterUnread }`
- Uses `useMemo` for derived filtered list

#### components/NotificationList.tsx
- Removed all useState and filtering logic
- Now calls `useGetNotifications()` and `useNotificationFilter({ notifications })`
- Pure rendering component -- all logic delegated to hooks
- All data-testid attributes preserved (no UI regression)

#### app/dashboard/page.tsx
- No changes needed (NotificationList interface unchanged)
- Copied for completeness

### 7. Verification

- tcf CLI not available, so boilerplate was created manually
- No test suite or plan directory found for this task
- All data-testid attributes preserved for test compatibility
- Component public interface unchanged (no props, self-contained)

## Output files

| File | Status | Description |
|------|--------|-------------|
| `hooks/apis/queries/useGetNotifications/index.ts` | Modified | Clean query hook with abort, refetch, exported types |
| `hooks/utils/useNotificationFilter/index.ts` | New | Filter logic extracted from component |
| `components/NotificationList.tsx` | Modified | Pure consumer, logic delegated to hooks |
| `app/dashboard/page.tsx` | Unchanged | Copied for completeness |
