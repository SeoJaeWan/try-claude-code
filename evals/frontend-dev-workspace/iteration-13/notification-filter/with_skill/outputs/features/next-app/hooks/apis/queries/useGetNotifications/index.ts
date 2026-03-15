"use client";

import { useEffect, useState } from "react";

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
}

/**
 * useGetNotifications API hook (query)
 * Fetches notifications from /api/notifications
 * @returns notifications data, loading state, and error
 */
const useGetNotifications = (): UseGetNotificationsResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => {
        if (!res.ok) throw new Error("알림을 불러올 수 없습니다");
        return res.json();
      })
      .then((data) => {
        setNotifications(data.notifications);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return { notifications, isLoading, error };
};

export default useGetNotifications;
