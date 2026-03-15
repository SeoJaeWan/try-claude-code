"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

type FilterType = "all" | "unread";

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

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

  if (loading) {
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
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          전체
        </button>
        <button
          data-testid="notifications-filter-unread"
          onClick={() => setFilter("unread")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          읽지 않음
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <p data-testid="notifications-empty" className="text-sm text-zinc-400">
          읽지 않은 알림이 없습니다.
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
              <time data-testid={`notification-time-${n.id}`} className="mt-1 block text-xs text-zinc-400">
                {new Date(n.time).toLocaleString("ko-KR")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
