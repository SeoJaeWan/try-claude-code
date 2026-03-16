"use client";

import { useState, useMemo } from "react";

type FilterType = "all" | "unread";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface UseNotificationFilterResult {
  filter: FilterType;
  filteredNotifications: Notification[];
  handleFilterAll: () => void;
  handleFilterUnread: () => void;
}

const useNotificationFilter = (notifications: Notification[]): UseNotificationFilterResult => {
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterAll = () => setFilter("all");
  const handleFilterUnread = () => setFilter("unread");

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [filter, notifications]);

  return {
    filter,
    filteredNotifications,
    handleFilterAll,
    handleFilterUnread,
  };
};

export default useNotificationFilter;
