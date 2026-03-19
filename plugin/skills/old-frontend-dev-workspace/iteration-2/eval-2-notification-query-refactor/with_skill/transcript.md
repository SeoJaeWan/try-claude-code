# Transcript: eval-2-notification-query-refactor (with_skill)

## Task

Refactor the notification query logic to match project conventions. `NotificationList` should focus on consuming query results and rendering UI; query and filter logic should be encapsulated behind hook boundaries.

---

## Files Read

- `features/frontend-dev-fixture/package.json` — confirmed stack: Next.js 16, React 19, no TanStack Query
- `features/frontend-dev-fixture/hooks/apis/notification/queries/useGetNotifications/index.ts` — existing API query hook
- `features/frontend-dev-fixture/components/NotificationList.tsx` — component with inline filter state and filtering logic
- `features/frontend-dev-fixture/app/dashboard/page.tsx` — page that renders `<NotificationList />`
- `plugin/skills/old-frontend-dev/references/coding-rules.md` — project conventions

---

## Analysis

### What was wrong

`NotificationList.tsx` contained two responsibilities mixed together:

1. **Query consumption** — calling `useGetNotifications` and branching on `isLoading` / `error`
2. **Filter logic** — managing `filter` state (`useState<FilterType>`) and computing `filteredNotifications` inline inside the component body

The coding rules require:

> If a page or component contains inline fetch, business-data `useState`, or orchestration logic, extract that logic into hooks. Pages and components should mainly compose hooks and render UI.

The `filter` state and the derived `filteredNotifications` computation are business-data logic, not pure render logic. They belong in a custom utility hook.

### What was already correct

`useGetNotifications` already satisfied all conventions:
- Path: `hooks/apis/notification/queries/useGetNotifications/index.ts`
- Arrow function style, default export
- Returns `{ notifications, isLoading, error }` — the expected consumer-facing shape
- Named with `useGet*` prefix as required for query hooks

No changes were needed to this file.

---

## Changes Made

### New file: `hooks/utils/notification/useNotificationFilter/index.ts`

Extracted from `NotificationList.tsx`:

- `filter` state (`useState<FilterType>`)
- `handleFilterAll` and `handleFilterUnread` handlers (keeping the `handle*` prefix convention)
- `filtered` derivation (renamed from `filteredNotifications` — the `List` suffix is forbidden by convention; array names must be plural nouns)

The hook accepts `notifications: Notification[]` as input and returns `{ filter, filtered, handleFilterAll, handleFilterUnread }`.

Path follows the custom hook contract: `hooks/utils/{domain}/{hookName}/index.ts` where domain is `notification`.

### Refactored: `components/NotificationList.tsx`

- Removed inline `filter` state and `filteredNotifications` computation
- Added `useNotificationFilter` import
- Component now only composes two hooks and renders UI based on their outputs
- `filteredNotifications` renamed to `filtered` to match what the hook returns (no `List` suffix)

### Unchanged: `hooks/apis/notification/queries/useGetNotifications/index.ts`

Already compliant. Included in outputs directory unchanged.

---

## Validation Against Coding Rules

| Rule | Status |
|------|--------|
| Arrow function style for all hooks | Pass — both hooks use `const hookName = (...) =>` |
| Internal handlers use `handle*` prefix | Pass — `handleFilterAll`, `handleFilterUnread` |
| Custom hook path: `hooks/utils/{domain}/{hookName}/index.ts` | Pass — `hooks/utils/notification/useNotificationFilter/index.ts` |
| API hook path: `hooks/apis/{domain}/queries/{hookName}/index.ts` | Pass — `hooks/apis/notification/queries/useGetNotifications/index.ts` |
| Query hook name: `useGet*` | Pass — `useGetNotifications` |
| Custom hook name: `use*` prefix | Pass — `useNotificationFilter` |
| Entry file is `index.ts` with default export | Pass — both hooks |
| Hook entry file does not define additional hooks | Pass |
| Hook entry file does not define React components | Pass |
| Array names are plural nouns, no `List`/`Array` suffix | Pass — `notifications`, `filtered` |
| Path segments use camelCase | Pass |
| Pages/components compose hooks and render UI only | Pass — `NotificationList` now only calls hooks and renders |

---

## Output Files

```
outputs/
  hooks/
    apis/
      notification/
        queries/
          useGetNotifications/
            index.ts          # unchanged, included for completeness
    utils/
      notification/
        useNotificationFilter/
          index.ts            # new: extracted filter state and logic
  components/
    NotificationList.tsx      # refactored: composes hooks, renders UI only
```
