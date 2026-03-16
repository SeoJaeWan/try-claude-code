"use client";

import { useState, useMemo, useCallback } from "react";

export type NotificationFilterType = "all" | "unread";

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface UseNotificationFilterReturn {
  filter: NotificationFilterType;
  setFilter: (filter: NotificationFilterType) => void;
  filteredNotifications: Notification[];
  counts: {
    all: number;
    unread: number;
  };
}

export function useNotificationFilter(
  notifications: Notification[]
): UseNotificationFilterReturn {
  const [filter, setFilter] = useState<NotificationFilterType>("all");

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
    }),
    [notifications]
  );

  const handleSetFilter = useCallback((newFilter: NotificationFilterType) => {
    setFilter(newFilter);
  }, []);

  return {
    filter,
    setFilter: handleSetFilter,
    filteredNotifications,
    counts,
  };
}
