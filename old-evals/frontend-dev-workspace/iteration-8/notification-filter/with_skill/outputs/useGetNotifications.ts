"use client";

import { useEffect, useState } from "react";

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface UseGetNotificationsResult {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
}

export function useGetNotifications(): UseGetNotificationsResult {
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

  return { notifications, loading, error };
}
