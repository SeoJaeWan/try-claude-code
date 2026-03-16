# Phase 1 Implementation Summary

## Task

Execute Phase 1 of `plans/sample-frontend-dashboard-notification-filter/plan.md`: add all/unread filter to `NotificationList`, implement empty state when no unread notifications exist, and ensure error state takes priority over filter UI.

## What Was Done

### 1. Modified: `features/next-app/components/NotificationList.tsx`

Added the following capabilities:

- **Filter state** (`all` | `unread`): a `useState` hook tracks the active filter, defaulting to `all`.
- **Segmented filter buttons**: two buttons (`notifications-filter-all`, `notifications-filter-unread`) render above the notification list. The active button is visually highlighted with `bg-blue-600 text-white`.
- **Client-side filtering**: when `unread` is selected, notifications are filtered to `read === false` before rendering.
- **Empty state**: when the filtered list has zero items, a `notifications-empty` element is shown with the message "알림이 없습니다".
- **Error-first rendering**: if the API call fails, the error UI (`notifications-error`) renders immediately without any filter buttons, satisfying the contract that error state takes priority over filter UI.
- **Preserved locators**: all existing `data-testid` attributes (`notifications-loading`, `notifications-error`, `notifications-list`, `notification-{id}`, `notification-time-{id}`) remain unchanged.

### 2. Unchanged: `features/next-app/app/dashboard/page.tsx`

No modifications were needed. The dashboard page already renders `<NotificationList />` and the filter logic is fully encapsulated within the component.

### 3. Created: `features/next-app/tests/dashboard-notification-filter.spec.ts`

Placed the frozen Playwright E2E spec from the plan artifacts into the project test directory. This spec covers:

- `[C-NOTI-001]` Default entry shows all notifications with both filter buttons visible
- `[C-NOTI-002][C-NOTI-003]` Unread filter hides read notifications; empty state appears when no unread items exist
- `[C-NOTI-004]` API error renders error UI and hides filter buttons

## data-testid Registry

| Locator | Status |
| --- | --- |
| `notifications-filter-all` | Added |
| `notifications-filter-unread` | Added |
| `notifications-empty` | Added |
| `notifications-list` | Preserved |
| `notification-{id}` | Preserved |
| `notifications-loading` | Preserved |
| `notifications-error` | Preserved |

## Output Files

```
evals/frontend-dev-workspace/iteration-4/notification-filter/without_skill/outputs/
  NotificationList.tsx                      # Modified component
  dashboard-notification-filter.spec.ts     # E2E Playwright spec
  summary.md                                # This file
```

## Source Files Changed

```
features/next-app/components/NotificationList.tsx   # Modified
features/next-app/tests/dashboard-notification-filter.spec.ts  # Created
```

## Verification Commands

1. `pnpm --dir features/next-app lint`
2. `pnpm --dir features/next-app exec playwright test tests/dashboard-notification-filter.spec.ts`

## Exit Criteria Status

- [x] Default entry shows all notifications
- [x] Unread filter shows only unread notifications
- [x] Empty state appears when unread result count is 0
- [x] API error shows error UI with filter buttons hidden
