"use client";

import { useState } from "react";
import useGetNotifications from "@/hooks/apis/queries/useGetNotifications";

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
