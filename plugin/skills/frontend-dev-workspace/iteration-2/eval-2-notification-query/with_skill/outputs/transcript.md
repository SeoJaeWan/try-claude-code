# Eval 2: Notification Query Hook Refactoring (with_skill)

## Task Description

알림 조회 로직을 프로젝트 컨벤션에 맞게 정리. NotificationList는 query 결과를 소비하는 쪽에 집중하고, 조회 로직은 훅 경계로 분리.

- 기존: `useGetNotifications`가 `useState` + `useEffect` + `fetch`로 직접 구현
- 목표: TanStack Query 기반 API 훅으로 전환 (프로젝트 컨벤션 `useGetOrderDetail` 패턴과 일치)

## Steps

### Step 1: Read SKILL.md

`skills/frontend-dev/SKILL.md` 확인. CLI-first 워크플로우에 따라 `tcf` 도구를 사용하여 보일러플레이트 생성 후 비즈니스 로직 구현.

### Step 2: Read fixture files

- `package.json` - Next.js 16 + React 19 프로젝트
- `hooks/apis/notification/queries/useGetNotifications/index.ts` - 기존 useState/useEffect 기반 조회 훅
- `components/NotificationList.tsx` - 알림 목록 컴포넌트 (훅 소비자)
- `app/dashboard/page.tsx` - 대시보드 페이지 (NotificationList 사용)
- `hooks/apis/order/queries/useGetOrderDetail/index.ts` - 컨벤션 참조 (TanStack Query 패턴)

### Step 3: Run tcf --help

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs --help
```

출력: 프로파일 `frontend/personal/v1`, `apiHook` 명령어 확인. 패턴: `hooks/apis/{domain}/{queries|mutations}/{hookName}/index.ts`

### Step 4: Run tcf apiHook scaffold

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs apiHook --json '{"name":"useGetNotifications","path":"hooks/apis/notification/queries","kind":"query","method":"GET"}' --apply
```

출력:
```json
{
  "ok": true,
  "command": "apiHook",
  "normalizedSpec": {
    "name": "useGetNotifications",
    "path": "hooks/apis/notification/queries",
    "kind": "query",
    "method": "GET"
  },
  "files": [
    {
      "path": "hooks/apis/notification/queries/useGetNotifications/index.ts",
      "bytes": 297,
      "status": "written"
    }
  ]
}
```

### Step 5: Implement business logic in hook

기존 `useState`/`useEffect`/`fetch` 패턴을 TanStack Query `useQuery` 패턴으로 전환.

### Step 6: Refactor NotificationList to consume query hook

- `error` (string) -> `isError` + `error?.message` (Error object) 패턴 적용
- 컴포넌트는 UI 렌더링에만 집중, 조회 로직은 훅 내부에 캡슐화

## Files Modified

### hooks/apis/notification/queries/useGetNotifications/index.ts

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

/** 알림 데이터 응답 타입 */
interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsResponse {
  notifications: Notification[];
}

/** useGetNotifications 파라미터 */
interface UseGetNotificationsParams {
  enabled?: boolean;
}

/**
 * 알림 목록을 조회하는 API 훅 (query)
 * @param params - 알림 조회 파라미터
 * @param params.enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns 알림 데이터, 로딩 상태, 에러 정보
 */
const useGetNotifications = (params: UseGetNotificationsParams = {}) => {
  const { enabled = true } = params;

  const query = useQuery<NotificationsResponse>({
    queryKey: ["notification"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");

      if (!response.ok) {
        throw new Error("알림을 불러올 수 없습니다");
      }

      return response.json();
    },
    enabled,
  });

  return {
    notifications: query.data?.notifications ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export default useGetNotifications;
```

### components/NotificationList.tsx

```tsx
"use client";

import { useState } from "react";
import useGetNotifications from "@/hooks/apis/notification/queries/useGetNotifications";

type FilterType = "all" | "unread";

export default function NotificationList() {
  const { notifications, isLoading, isError, error } = useGetNotifications();
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

  if (isError) {
    return (
      <p data-testid="notifications-error" className="text-sm text-red-500">
        {error?.message ?? "알림을 불러올 수 없습니다"}
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

## Summary

| 항목 | Before | After |
|------|--------|-------|
| 데이터 페칭 | `useState` + `useEffect` + `fetch` | `useQuery` (TanStack Query) |
| 에러 타입 | `string \| null` | `Error \| null` |
| 캐싱 | 없음 | TanStack Query 자동 캐싱 |
| refetch | 수동 구현 | TanStack Query 내장 |
| 훅 경로 | `hooks/apis/notification/queries/useGetNotifications/index.ts` | 동일 (컨벤션 준수) |
| 컴포넌트 역할 | UI + 에러 문자열 표시 | UI 전용 (isError/error.message 소비) |
