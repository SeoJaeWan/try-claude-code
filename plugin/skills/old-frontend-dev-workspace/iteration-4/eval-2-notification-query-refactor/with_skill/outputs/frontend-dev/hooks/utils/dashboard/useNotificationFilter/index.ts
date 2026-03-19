"use client";

import { useState } from "react";

type FilterType = "all" | "unread";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface UseNotificationFilterResult {
  filter: FilterType;
  filtered: Notification[];
  handleFilterAll: () => void;
  handleFilterUnread: () => void;
}

/**
 * 알림 필터 상태와 필터링된 알림 목록을 관리하는 훅
 * @param notifications - 필터링할 알림 목록
 * @returns 필터 상태, 필터링된 목록, 필터 변경 핸들러
 */
const useNotificationFilter = (
  notifications: Notification[] | undefined
): UseNotificationFilterResult => {
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterAll = () => setFilter("all");
  const handleFilterUnread = () => setFilter("unread");

  const filtered =
    filter === "unread"
      ? (notifications ?? []).filter((n) => !n.read)
      : (notifications ?? []);

  return { filter, filtered, handleFilterAll, handleFilterUnread };
};

export default useNotificationFilter;
