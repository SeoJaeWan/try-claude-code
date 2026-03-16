# Eval 2: Notification Query Hook Refactoring (old-frontend-dev skill)

## Task Description

알림 조회 로직을 프로젝트 컨벤션에 맞게 정리해줘. NotificationList는 query 결과를 소비하는 쪽에 집중하고, 조회 로직은 훅 경계로 정리해줘.

## Steps Taken

### Step 1: Read SKILL.md and coding-rules.md

- Read `plugin/skills/old-frontend-dev/SKILL.md` — skill instructions for frontend hook development
- Read `plugin/skills/old-frontend-dev/references/coding-rules.md` — hook naming, folder structure, placement rules

Key rules identified:
- API hooks use `use` + verb + resource naming (`useGetNotifications` is correct)
- Hook path: `{hooksRoot}/apis/queries/` or domain-grouped variant
- Each hook uses `{hookName}/index.ts` directory pattern
- API endpoint constants follow `VERB_RESOURCE` pattern
- Array variables use plural nouns (no `~List`/`~Array` suffix)

### Step 2: Read fixture files

- `features/frontend-dev-fixture/package.json` — Next.js 16 + React 19, no TanStack Query
- `hooks/apis/notification/queries/useGetNotifications/index.ts` — legacy `useEffect + fetch` pattern with inline fetch logic
- `components/NotificationList.tsx` — already consumes hook, handles filter UI + rendering
- `app/dashboard/page.tsx` — renders `<NotificationList />`

### Step 3: Analyze current state and plan

**Issues found in the hook:**
1. Fetch logic is inline inside `useEffect` — not extracted as a reusable async function
2. No `refetch` capability — query cannot be re-executed
3. No unmount safety — state updates can fire after unmount
4. No `API_ENDPOINTS` constant — endpoint string is hardcoded
5. Error handling uses raw `.catch(err)` without type guard

**NotificationList assessment:**
- Already well-structured: consumes `useGetNotifications()` and focuses on filter UI + render branches
- All test locators preserved (`notifications-loading`, `notifications-error`, `notifications-empty`, `notifications-list`)
- No query logic leaking into the component — no changes needed

### Step 4: Implement refactored hook

Refactored `useGetNotifications` with:
- Extracted `fetchNotifications()` async function for clear query boundary
- Added `API_ENDPOINTS` constant following `VERB_RESOURCE` convention
- Added `mountedRef` for unmount-safe state updates
- Wrapped execution in `useCallback` for stable reference
- Added `refetch` function to return value
- Proper error type guard (`err instanceof Error`)

### Step 5: Verify no changes needed in NotificationList

NotificationList already:
- Imports and consumes `useGetNotifications` hook
- Handles loading / error / empty states with correct test locators
- Manages filter UI state locally (appropriate for component-level concern)
- Does not contain any query/fetch logic

No modifications required.

## Files Modified

### `features/frontend-dev-fixture/hooks/apis/notification/queries/useGetNotifications/index.ts` (MODIFIED)

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface UseGetNotificationsResult {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_ENDPOINTS = {
  GET_NOTIFICATIONS: "/api/notifications",
} as const;

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch(API_ENDPOINTS.GET_NOTIFICATIONS);
  if (!res.ok) throw new Error("알림을 불러올 수 없습니다");
  const data = await res.json();
  return data.notifications;
}

/**
 * useGetNotifications API hook (query)
 * Fetches notifications from /api/notifications
 * @returns notifications data, loading state, error, and refetch function
 */
const useGetNotifications = (): UseGetNotificationsResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchNotifications();
      if (mountedRef.current) {
        setNotifications(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  return { notifications, isLoading, error, refetch: execute };
};

export default useGetNotifications;
```

### `features/frontend-dev-fixture/components/NotificationList.tsx` (UNCHANGED)

```typescript
"use client";

import { useState } from "react";
import useGetNotifications from "@/hooks/apis/notification/queries/useGetNotifications";

type FilterType = "all" | "unread";

export default function NotificationList() {
  const { notifications, isLoading, error } = useGetNotifications();
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterAll = () => setFilter("all");
  const handleFilterUnread = () => setFilter("unread");

  if (isLoading) {
    return (
      <div data-testid="notifications-loading" className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded bg-zinc-200 dark:bg-zinc-700" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p data-testid="notifications-error" className="text-sm text-red-500">
        {error}
      </p>
    );
  }

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          data-testid="notifications-filter-all"
          onClick={handleFilterAll}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
          }`}
        >
          전체
        </button>
        <button
          data-testid="notifications-filter-unread"
          onClick={handleFilterUnread}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
          }`}
        >
          읽지 않음
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <p
          data-testid="notifications-empty"
          className="py-8 text-center text-sm text-zinc-400"
        >
          알림이 없습니다
        </p>
      ) : (
        <ul data-testid="notifications-list" className="space-y-2">
          {filteredNotifications.map((n) => (
            <li
              key={n.id}
              data-testid={`notification-${n.id}`}
              className={`rounded border p-3 text-sm ${
                n.read
                  ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                  : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
              }`}
            >
              <p className="text-zinc-800 dark:text-zinc-200">{n.message}</p>
              <time
                data-testid={`notification-time-${n.id}`}
                className="mt-1 block text-xs text-zinc-400"
              >
                {new Date(n.time).toLocaleString("ko-KR")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### `features/frontend-dev-fixture/app/dashboard/page.tsx` (UNCHANGED)

No changes needed — already renders `<NotificationList />` correctly.
