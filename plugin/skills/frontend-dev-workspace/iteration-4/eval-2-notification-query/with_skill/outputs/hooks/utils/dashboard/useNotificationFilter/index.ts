import { useState, useMemo } from "react";

type FilterType = "all" | "unread";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

const useNotificationFilter = (notifications: Notification[]) => {
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterAll = () => setFilter("all");
  const handleFilterUnread = () => setFilter("unread");

  const filteredNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications,
    [notifications, filter],
  );

  return {
    filter,
    filteredNotifications,
    handleFilterAll,
    handleFilterUnread,
  };
};

export default useNotificationFilter;
