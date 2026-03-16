"use client";

import { useEffect, useState } from "react";
import {
  useNotificationFilter,
  type Notification,
  type NotificationFilterType,
} from "@/hooks/useNotificationFilter";

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { filter, setFilter, filteredNotifications, counts } =
    useNotificationFilter(notifications);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => {
        if (!res.ok) throw new Error("알림을 불러올 수 없습니다");
        return res.json();
      })
      .then((data) => {
        setNotifications(data.notifications);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetch("/api/notifications")
      .then((res) => {
        if (!res.ok) throw new Error("알림을 불러올 수 없습니다");
        return res.json();
      })
      .then((data) => {
        setNotifications(data.notifications);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div
        data-testid="notifications-loading"
        className="animate-pulse space-y-2"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded bg-zinc-200 dark:bg-zinc-700" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="notifications-error" className="rounded border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          data-testid="notifications-retry"
          onClick={handleRetry}
          className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const filterOptions: { key: NotificationFilterType; label: string }[] = [
    { key: "all", label: `전체 (${counts.all})` },
    { key: "unread", label: `안 읽음 (${counts.unread})` },
  ];

  return (
    <div>
      <div
        data-testid="notification-filter"
        className="mb-4 flex gap-2"
        role="tablist"
        aria-label="알림 필터"
      >
        {filterOptions.map((option) => (
          <button
            key={option.key}
            role="tab"
            aria-selected={filter === option.key}
            data-testid={`filter-${option.key}`}
            onClick={() => setFilter(option.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filter === option.key
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <div
          data-testid="notifications-empty"
          className="rounded border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filter === "unread"
              ? "읽지 않은 알림이 없습니다"
              : "알림이 없습니다"}
          </p>
        </div>
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
