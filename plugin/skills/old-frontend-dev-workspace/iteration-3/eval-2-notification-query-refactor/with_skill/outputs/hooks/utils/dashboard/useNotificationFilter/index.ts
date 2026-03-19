"use client";

import { useState } from "react";
import useGetNotifications from "@/hooks/apis/notification/queries/useGetNotifications";

type FilterType = "all" | "unread";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface UseNotificationFilterResult {
  filteredNotifications: Notification[];
  filter: FilterType;
  isLoading: boolean;
  error: string | null;
  handleFilterAll: () => void;
  handleFilterUnread: () => void;
}

const useNotificationFilter = (): UseNotificationFilterResult => {
  const { notifications, isLoading, error } = useGetNotifications();
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterAll = () => setFilter("all");
  const handleFilterUnread = () => setFilter("unread");

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return {
    filteredNotifications,
    filter,
    isLoading,
    error,
    handleFilterAll,
    handleFilterUnread,
  };
};

export default useNotificationFilter;
