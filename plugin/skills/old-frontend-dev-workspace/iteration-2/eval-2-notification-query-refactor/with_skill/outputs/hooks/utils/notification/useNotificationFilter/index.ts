"use client";

import { useState } from "react";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

type FilterType = "all" | "unread";

interface UseNotificationFilterResult {
  filter: FilterType;
  filtered: Notification[];
  handleFilterAll: () => void;
  handleFilterUnread: () => void;
}

const useNotificationFilter = (
  notifications: Notification[]
): UseNotificationFilterResult => {
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterAll = () => setFilter("all");
  const handleFilterUnread = () => setFilter("unread");

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return { filter, filtered, handleFilterAll, handleFilterUnread };
};

export default useNotificationFilter;
