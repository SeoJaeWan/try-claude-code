"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ul data-testid="notifications-list" className="space-y-2">
      {notifications.map((n) => (
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
  );
}
